"""Slug 生成工具。

从标题自动生成 URL 友好的 slug，支持中日韩德法等多语言。
"""

from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def generate_slug(title: str) -> str:
    """从标题生成 slug。"""
    return slugify(title, max_length=200)


async def generate_unique_slug(
    session: AsyncSession,
    title: str,
    model_class: type,
    exclude_id: str | None = None,
) -> str:
    """生成唯一 slug，重复时自动追加数字后缀。

    Args:
        session: 数据库会话
        title: 原始标题
        model_class: 带 slug 字段的 SQLAlchemy 模型
        exclude_id: 排除的记录 ID（更新时排除自身）
    """
    base_slug = generate_slug(title)
    if not base_slug:
        base_slug = "untitled"

    slug = base_slug
    counter = 1
    while True:
        stmt = select(model_class.id).where(model_class.slug == slug)
        if exclude_id:
            stmt = stmt.where(model_class.id != exclude_id)
        result = await session.execute(stmt)
        if not result.scalar_one_or_none():
            return slug
        counter += 1
        slug = f"{base_slug}-{counter}"
