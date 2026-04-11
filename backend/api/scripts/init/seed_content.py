"""初始化内容分类。"""

import logging

from sqlalchemy import select

from app.content.models import Category

logger = logging.getLogger(__name__)

CATEGORIES = [
    ("新闻政策", "news", "新闻和政策动态"),
    ("留学项目", "study-abroad", "留学项目介绍"),
    ("申请条件", "requirements", "申请条件和材料"),
    ("签证办理", "visa", "签证申请指南"),
    ("留学生活", "life", "海外生活指南"),
]


async def init_categories(session) -> None:
    """初始化内容分类。已存在的分类跳过。"""
    for idx, (name, slug, description) in enumerate(CATEGORIES):
        stmt = select(Category).where(Category.slug == slug)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug("分类已存在，跳过: %s", slug)
            continue

        category = Category(
            name=name,
            slug=slug,
            description=description,
            sort_order=idx,
        )
        session.add(category)
        logger.info("创建分类: %s (%s)", name, slug)

    await session.flush()
    print("  + 内容分类已初始化")
