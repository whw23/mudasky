"""用户领域数据访问层。

封装所有用户相关的数据库操作。
"""

from sqlalchemy import func, select, update
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
    session: AsyncSession,
    offset: int,
    limit: int,
    search: str | None = None,
) -> tuple[list[User], int]:
    """分页查询用户列表，支持按手机号或用户名模糊搜索。

    返回用户列表和总数。
    """
    from sqlalchemy import or_

    base_query = select(User)
    count_query = select(func.count()).select_from(User)

    if search:
        like_pattern = f"%{search}%"
        search_filter = or_(
            User.phone.like(like_pattern),
            User.username.like(like_pattern),
        )
        base_query = base_query.where(search_filter)
        count_query = count_query.where(search_filter)

    total_result = await session.execute(count_query)
    total = total_result.scalar_one()

    stmt = (
        base_query.order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    users = list(result.scalars().all())

    return users, total


async def get_role_id(
    session: AsyncSession, user_id: str
) -> str | None:
    """查询用户的角色 ID。"""
    stmt = select(User.role_id).where(User.id == user_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def set_role_id(
    session: AsyncSession,
    user_id: str,
    role_id: str | None,
) -> None:
    """设置用户的角色 ID。"""
    stmt = (
        update(User)
        .where(User.id == user_id)
        .values(role_id=role_id)
    )
    await session.execute(stmt)
    await session.commit()


async def count_by_role(
    session: AsyncSession,
) -> dict[str, int]:
    """统计各角色的用户数量。"""
    stmt = (
        select(User.role_id, func.count(User.id))
        .where(User.role_id.isnot(None))
        .group_by(User.role_id)
    )
    result = await session.execute(stmt)
    return dict(result.all())
