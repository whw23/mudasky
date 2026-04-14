"""文档领域数据访问层。

封装所有文档相关的数据库操作。
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.document.models import Document


async def create(session: AsyncSession, doc: Document) -> Document:
    """创建文档记录。"""
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


async def get_by_id(
    session: AsyncSession, doc_id: str
) -> Document | None:
    """根据 ID 查询文档。"""
    return await session.get(Document, doc_id)


async def get_by_hash(
    session: AsyncSession, file_hash: str, user_id: str
) -> Document | None:
    """根据文件哈希和用户 ID 查询文档，用于去重。"""
    stmt = select(Document).where(
        Document.file_hash == file_hash,
        Document.user_id == user_id,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_storage_used(
    session: AsyncSession, user_id: str
) -> int:
    """计算用户已使用的存储空间（字节）。"""
    stmt = select(
        func.coalesce(func.sum(Document.file_size), 0)
    ).where(Document.user_id == user_id)
    result = await session.execute(stmt)
    return result.scalar_one()


async def list_by_user(
    session: AsyncSession, user_id: str, offset: int, limit: int
) -> tuple[list[Document], int]:
    """分页查询用户的文档列表。

    返回文档列表和总数。
    """
    count_stmt = (
        select(func.count())
        .select_from(Document)
        .where(Document.user_id == user_id)
    )
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = (
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    docs = list(result.scalars().all())

    return docs, total


async def list_file_paths_by_user(
    session: AsyncSession, user_id: str
) -> list[str]:
    """获取用户所有文档的文件路径。"""
    stmt = select(Document.file_path).where(
        Document.user_id == user_id
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def delete_by_user(
    session: AsyncSession, user_id: str
) -> None:
    """删除用户所有文档记录（不 commit）。"""
    from sqlalchemy import delete as sa_delete

    stmt = sa_delete(Document).where(
        Document.user_id == user_id
    )
    await session.execute(stmt)


async def delete(session: AsyncSession, doc: Document) -> None:
    """删除文档记录。"""
    await session.delete(doc)
    await session.commit()
