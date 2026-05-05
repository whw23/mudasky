"""初始化种子文章。

将 assets/articles/ 下的 PDF 文件写入 Image 表，创建对应的 Article 记录。
"""

import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select

from app.db.content.models import Article, Category
from app.db.image.repository import create_image
from app.db.rbac.models import Role
from app.db.user.models import User
from app.utils.slug import generate_unique_slug

logger = logging.getLogger(__name__)

ARTICLES_DIR = Path(__file__).parent / "assets" / "articles"

SEED_ARTICLES = [
    {
        "filename": "2026年中国学生德国留学行业白皮书.pdf",
        "cover": "2026年中国学生德国留学行业白皮书.png",
        "title": "2026年中国学生德国留学行业白皮书",
        "category_slug": "study-abroad",
        "excerpt": "全面解析2026年中国学生赴德留学的趋势、政策变化与申请策略。",
        "is_pinned": True,
    },
]


async def init_articles(session) -> None:
    """初始化种子文章。已存在的文章跳过。"""
    role_stmt = select(Role).where(Role.name == "superuser")
    role_result = await session.execute(role_stmt)
    superuser_role = role_result.scalar_one_or_none()
    if not superuser_role:
        logger.warning("superuser 角色不存在，跳过文章初始化")
        return

    user_stmt = select(User).where(User.role_id == superuser_role.id)
    user_result = await session.execute(user_stmt)
    superuser = user_result.scalars().first()
    if not superuser:
        logger.warning("superuser 用户不存在，跳过文章初始化")
        return

    for article_def in SEED_ARTICLES:
        category = await _get_category(session, article_def["category_slug"])
        if not category:
            logger.warning("分类不存在: %s", article_def["category_slug"])
            continue

        existing = await _find_existing(
            session, article_def["title"], category.id,
        )
        if existing:
            logger.debug("文章已存在，跳过: %s", article_def["title"])
            continue

        filepath = ARTICLES_DIR / article_def["filename"]
        if not filepath.exists():
            logger.warning("PDF 文件不存在: %s", filepath)
            continue

        file_data = filepath.read_bytes()
        pdf_image = await create_image(
            session, file_data, article_def["filename"], "application/pdf",
        )

        cover_url = None
        cover_name = article_def.get("cover")
        if cover_name:
            cover_path = ARTICLES_DIR / cover_name
            if cover_path.exists():
                cover_data = cover_path.read_bytes()
                cover_image = await create_image(
                    session, cover_data, cover_name, "image/png",
                )
                cover_url = f"/api/public/images/detail?id={cover_image.id}"
                logger.info("封面图已导入: %s", cover_name)

        slug = await generate_unique_slug(
            session, article_def["title"], Article,
        )
        now = datetime.now(timezone.utc)
        article = Article(
            title=article_def["title"],
            slug=slug,
            content_type="file",
            content="",
            file_id=str(pdf_image.id),
            excerpt=article_def.get("excerpt", ""),
            cover_image=cover_url,
            category_id=category.id,
            author_id=superuser.id,
            status="published",
            is_pinned=article_def.get("is_pinned", False),
            published_at=now,
        )
        session.add(article)
        logger.info("创建种子文章: %s", article_def["title"])

    await session.flush()
    print("  + 种子文章已初始化")


async def _get_category(session, slug: str) -> Category | None:
    """按 slug 查找分类。"""
    stmt = select(Category).where(Category.slug == slug)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def _find_existing(session, title: str, category_id: str) -> Article | None:
    """按标题+分类查找已有文章。"""
    stmt = select(Article).where(
        Article.title == title,
        Article.category_id == category_id,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()
