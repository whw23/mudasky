"""内容领域数据访问层。

封装所有分类和文章相关的数据库操作。
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.content.models import Article, Category


# ---- 分类 ----


async def create_category(
    session: AsyncSession, category: Category
) -> Category:
    """创建分类。"""
    session.add(category)
    await session.flush()
    await session.refresh(category)
    return category


async def get_category_by_id(
    session: AsyncSession, category_id: str
) -> Category | None:
    """根据 ID 查询分类。"""
    return await session.get(Category, category_id)


async def list_categories(
    session: AsyncSession,
) -> list[Category]:
    """查询所有分类，按排序序号升序。"""
    stmt = select(Category).order_by(Category.sort_order.asc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_category(
    session: AsyncSession, category: Category
) -> Category:
    """更新分类。"""
    await session.commit()
    await session.refresh(category)
    return category


async def delete_category(
    session: AsyncSession, category: Category
) -> None:
    """删除分类。"""
    await session.delete(category)
    await session.commit()


async def count_articles_by_category(
    session: AsyncSession,
) -> dict[str, int]:
    """统计每个分类的文章数量。"""
    stmt = (
        select(
            Article.category_id,
            func.count().label("cnt"),
        )
        .group_by(Article.category_id)
    )
    result = await session.execute(stmt)
    return {row.category_id: row.cnt for row in result}


# ---- 文章 ----


async def create_article(
    session: AsyncSession, article: Article
) -> Article:
    """创建文章。"""
    session.add(article)
    await session.commit()
    await session.refresh(article)
    return article


async def get_article_by_id(
    session: AsyncSession, article_id: str
) -> Article | None:
    """根据 ID 查询文章。"""
    return await session.get(Article, article_id)


async def update_article(
    session: AsyncSession, article: Article
) -> Article:
    """更新文章。"""
    await session.commit()
    await session.refresh(article)
    return article


async def list_published(
    session: AsyncSession,
    offset: int,
    limit: int,
    category_id: str | None = None,
) -> tuple[list[Article], int]:
    """分页查询已发布文章。

    置顶文章排在前面，可选按分类过滤。返回文章列表和总数。
    """
    base_filter = Article.status == "published"
    if category_id:
        base_filter = (base_filter) & (
            Article.category_id == category_id
        )

    count_stmt = (
        select(func.count())
        .select_from(Article)
        .where(base_filter)
    )
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = (
        select(Article)
        .where(base_filter)
        .order_by(
            Article.is_pinned.desc(),
            Article.published_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    articles = list(result.scalars().all())

    return articles, total


async def list_by_author(
    session: AsyncSession,
    author_id: str,
    offset: int,
    limit: int,
) -> tuple[list[Article], int]:
    """分页查询指定作者的文章。"""
    count_stmt = (
        select(func.count())
        .select_from(Article)
        .where(Article.author_id == author_id)
    )
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = (
        select(Article)
        .where(Article.author_id == author_id)
        .order_by(Article.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    articles = list(result.scalars().all())

    return articles, total


async def list_all_articles(
    session: AsyncSession,
    offset: int,
    limit: int,
    status: str | None = None,
) -> tuple[list[Article], int]:
    """分页查询所有文章（管理员用）。

    可按状态过滤。
    """
    base_filter = True  # noqa: E712
    if status:
        base_filter = Article.status == status

    count_stmt = (
        select(func.count())
        .select_from(Article)
        .where(base_filter)
    )
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = (
        select(Article)
        .where(base_filter)
        .order_by(
            Article.is_pinned.desc(),
            Article.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    articles = list(result.scalars().all())

    return articles, total


async def delete_articles_by_category(
    session: AsyncSession, category_id: str
) -> None:
    """删除指定分类下的所有文章。"""
    stmt = select(Article).where(
        Article.category_id == category_id
    )
    result = await session.execute(stmt)
    articles = result.scalars().all()
    for article in articles:
        await session.delete(article)
    await session.commit()


async def delete_article(
    session: AsyncSession, article: Article
) -> None:
    """删除文章。"""
    await session.delete(article)
    await session.commit()


async def get_article_by_slug(
    session: AsyncSession, slug: str
) -> Article | None:
    """根据 slug 查询文章。"""
    stmt = select(Article).where(Article.slug == slug)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_article_by_title(
    session: AsyncSession, title: str, category_id: str,
) -> Article | None:
    """根据标题和分类查询文章（导入时按标题匹配）。"""
    stmt = select(Article).where(
        Article.title == title,
        Article.category_id == category_id,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_articles_by_category(
    session: AsyncSession, category_id: str
) -> list[Article]:
    """查询指定分类下的所有文章。"""
    stmt = (
        select(Article)
        .where(Article.category_id == category_id)
        .order_by(
            Article.is_pinned.desc(),
            Article.created_at.desc(),
        )
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
