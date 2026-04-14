"""联系记录数据访问层。"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.contact.models import ContactRecord


async def create_record(
    session: AsyncSession, record: ContactRecord
) -> ContactRecord:
    """创建联系记录。"""
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def list_by_user(
    session: AsyncSession, user_id: str
) -> list[ContactRecord]:
    """查询用户的联系历史。"""
    stmt = (
        select(ContactRecord)
        .where(ContactRecord.user_id == user_id)
        .order_by(ContactRecord.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
