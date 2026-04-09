"""RBAC 权限领域数据访问层。

封装所有权限、权限组相关的数据库操作。
用户与权限组为一对多关系（user.group_id）。
"""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.rbac.models import Permission, PermissionGroup
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


async def list_groups(
    session: AsyncSession,
) -> list[tuple[PermissionGroup, int]]:
    """查询所有权限组，包含权限列表和用户数量。"""
    user_count_subq = (
        select(
            User.group_id,
            func.count(User.id).label("user_count"),
        )
        .where(User.group_id.isnot(None))
        .group_by(User.group_id)
        .subquery()
    )

    stmt = (
        select(
            PermissionGroup,
            func.coalesce(user_count_subq.c.user_count, 0).label(
                "user_count"
            ),
        )
        .outerjoin(
            user_count_subq,
            PermissionGroup.id == user_count_subq.c.group_id,
        )
        .options(selectinload(PermissionGroup.permissions))
        .order_by(PermissionGroup.name)
    )
    result = await session.execute(stmt)
    return [(row[0], row[1]) for row in result.all()]


async def get_group_by_id(
    session: AsyncSession, group_id: str
) -> PermissionGroup | None:
    """根据 ID 查询权限组，加载权限关系。"""
    stmt = (
        select(PermissionGroup)
        .where(PermissionGroup.id == group_id)
        .options(selectinload(PermissionGroup.permissions))
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_group_by_name(
    session: AsyncSession, name: str
) -> PermissionGroup | None:
    """根据名称查询权限组。"""
    stmt = select(PermissionGroup).where(
        PermissionGroup.name == name
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_group(
    session: AsyncSession, group: PermissionGroup
) -> None:
    """创建权限组。"""
    session.add(group)
    await session.commit()
    await session.refresh(group)


async def update_group(
    session: AsyncSession, group: PermissionGroup
) -> None:
    """更新权限组。"""
    await session.commit()
    await session.refresh(group)


async def delete_group(
    session: AsyncSession, group_id: str
) -> None:
    """删除权限组。"""
    stmt = (
        delete(PermissionGroup)
        .where(PermissionGroup.id == group_id)
    )
    await session.execute(stmt)
    await session.commit()


async def get_user_permissions(
    session: AsyncSession, user_id: str
) -> list[str]:
    """查询用户的所有权限码。

    通过 user.group_id 查找权限组，如果 auto_include_all 为 True，
    则包含所有权限码；否则返回该组关联的权限码。
    """
    stmt = (
        select(User.group_id)
        .where(User.id == user_id)
    )
    result = await session.execute(stmt)
    group_id = result.scalar_one_or_none()

    if not group_id:
        return []

    group = await get_group_by_id(session, group_id)
    if not group:
        return []

    if group.auto_include_all:
        all_perms = await list_permissions(session)
        return [p.code for p in all_perms]

    return [p.code for p in group.permissions]


async def get_user_group_id(
    session: AsyncSession, user_id: str
) -> str | None:
    """查询用户所属的权限组 ID。"""
    stmt = select(User.group_id).where(User.id == user_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_group_name(
    session: AsyncSession, user_id: str
) -> str | None:
    """查询用户所属的权限组名称。"""
    stmt = (
        select(PermissionGroup.name)
        .join(User, User.group_id == PermissionGroup.id)
        .where(User.id == user_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def set_user_group(
    session: AsyncSession, user_id: str, group_id: str | None
) -> None:
    """设置用户的权限组。"""
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user:
        user.group_id = group_id
        await session.commit()
