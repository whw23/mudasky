"""用户领域数据访问层。

封装所有用户相关的数据库操作。
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.user.models import User


async def get_by_id(session: AsyncSession, user_id: str) -> User | None:
    """根据 ID 查询用户。"""
    return await session.get(User, user_id)


async def get_by_phone(session: AsyncSession, phone: str) -> User | None:
    """根据手机号查询用户。"""
    stmt = select(User).where(User.phone == phone)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_username(
    session: AsyncSession, username: str
) -> User | None:
    """根据用户名查询用户。"""
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create(session: AsyncSession, user: User) -> User:
    """创建用户。"""
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def update(session: AsyncSession, user: User) -> User:
    """更新用户。"""
    await session.commit()
    await session.refresh(user)
    return user


async def list_users(
    session: AsyncSession, offset: int, limit: int
) -> tuple[list[User], int]:
    """分页查询用户列表。

    返回用户列表和总数。
    """
    # 查询总数
    count_stmt = select(func.count()).select_from(User)
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    # 查询分页数据
    stmt = (
        select(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    users = list(result.scalars().all())

    return users, total
