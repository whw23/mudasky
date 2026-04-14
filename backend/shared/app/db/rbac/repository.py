"""RBAC 权限领域数据访问层。

封装所有角色相关的数据库操作。
"""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.rbac.models import Role


async def list_roles(
    session: AsyncSession,
) -> list[Role]:
    """查询所有角色，按排序值排序。"""
    stmt = select(Role).order_by(Role.sort_order)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_max_sort_order(session: AsyncSession) -> int:
    """查询当前最大排序值。"""
    stmt = select(func.coalesce(func.max(Role.sort_order), -1))
    result = await session.execute(stmt)
    return result.scalar_one()


async def bulk_update_sort_order(session: AsyncSession, items: list[tuple[str, int]]) -> None:
    """批量更新角色排序。"""
    for role_id, sort_order in items:
        stmt = select(Role).where(Role.id == role_id)
        result = await session.execute(stmt)
        role = result.scalar_one_or_none()
        if role:
            role.sort_order = sort_order
    await session.commit()


async def get_role_by_id(
    session: AsyncSession, role_id: str
) -> Role | None:
    """根据 ID 查询角色。"""
    stmt = select(Role).where(Role.id == role_id)
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


async def get_permissions_by_role(
    session: AsyncSession, role_id: str
) -> list[str]:
    """根据角色 ID 查询该角色的权限列表。"""
    role = await get_role_by_id(session, role_id)
    if not role:
        return []
    return role.permissions or []
