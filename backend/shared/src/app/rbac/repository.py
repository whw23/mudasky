"""RBAC 权限领域数据访问层。

封装所有权限、角色相关的数据库操作。
用户与角色为一对多关系（user.role_id）。
"""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.rbac.models import Permission, Role
from app.user.models import User


async def list_permissions(
    session: AsyncSession,
) -> list[Permission]:
    """查询所有权限，按 code 排序。"""
    stmt = select(Permission).order_by(Permission.code)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_permissions_by_ids(
    session: AsyncSession, perm_ids: list[str]
) -> list[Permission]:
    """根据 ID 列表查询权限。"""
    if not perm_ids:
        return []
    stmt = select(Permission).where(Permission.id.in_(perm_ids))
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def list_roles(
    session: AsyncSession,
) -> list[tuple[Role, int]]:
    """查询所有角色，包含权限列表和用户数量。"""
    user_count_subq = (
        select(
            User.role_id,
            func.count(User.id).label("user_count"),
        )
        .where(User.role_id.isnot(None))
        .group_by(User.role_id)
        .subquery()
    )

    stmt = (
        select(
            Role,
            func.coalesce(user_count_subq.c.user_count, 0).label(
                "user_count"
            ),
        )
        .outerjoin(
            user_count_subq,
            Role.id == user_count_subq.c.role_id,
        )
        .options(selectinload(Role.permissions))
        .order_by(Role.name)
    )
    result = await session.execute(stmt)
    return [(row[0], row[1]) for row in result.all()]


async def get_role_by_id(
    session: AsyncSession, role_id: str
) -> Role | None:
    """根据 ID 查询角色，加载权限关系。"""
    stmt = (
        select(Role)
        .where(Role.id == role_id)
        .options(selectinload(Role.permissions))
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_role_by_name(
    session: AsyncSession, name: str
) -> Role | None:
    """根据名称查询角色。"""
    stmt = select(Role).where(Role.name == name)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_role(
    session: AsyncSession, role: Role
) -> None:
    """创建角色。"""
    session.add(role)
    await session.commit()
    await session.refresh(role)


async def update_role(
    session: AsyncSession, role: Role
) -> None:
    """更新角色。"""
    await session.commit()
    await session.refresh(role)


async def delete_role(
    session: AsyncSession, role_id: str
) -> None:
    """删除角色。"""
    stmt = delete(Role).where(Role.id == role_id)
    await session.execute(stmt)
    await session.commit()


async def get_user_permissions(
    session: AsyncSession, user_id: str
) -> list[str]:
    """查询用户的所有权限码。

    通过 user.role_id 查找角色，返回该角色关联的权限码。
    """
    stmt = (
        select(User.role_id)
        .where(User.id == user_id)
    )
    result = await session.execute(stmt)
    role_id = result.scalar_one_or_none()

    if not role_id:
        return []

    role = await get_role_by_id(session, role_id)
    if not role:
        return []

    return [p.code for p in role.permissions]


async def get_user_role_id(
    session: AsyncSession, user_id: str
) -> str | None:
    """查询用户所属的角色 ID。"""
    stmt = select(User.role_id).where(User.id == user_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_role_name(
    session: AsyncSession, user_id: str
) -> str | None:
    """查询用户所属的角色名称。"""
    stmt = (
        select(Role.name)
        .join(User, User.role_id == Role.id)
        .where(User.id == user_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def set_user_role(
    session: AsyncSession, user_id: str, role_id: str | None
) -> None:
    """设置用户的角色。"""
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user:
        user.role_id = role_id
        await session.commit()
