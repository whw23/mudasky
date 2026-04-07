"""RBAC 权限领域数据访问层。

封装所有权限、权限组相关的数据库操作。
"""

from sqlalchemy import delete, func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.rbac.models import Permission, PermissionGroup
from app.rbac.tables import group_permission, user_group


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
    """查询所有权限组，包含权限列表和用户数量。

    返回 (权限组, 用户数量) 元组列表。
    """
    # 用户数量子查询
    user_count_subq = (
        select(
            user_group.c.group_id,
            func.count(user_group.c.user_id).label("user_count"),
        )
        .group_by(user_group.c.group_id)
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
    await session.flush()


async def update_group(
    session: AsyncSession, group: PermissionGroup
) -> None:
    """更新权限组。"""
    await session.flush()


async def delete_group(
    session: AsyncSession, group_id: str
) -> None:
    """删除权限组。"""
    stmt = (
        delete(PermissionGroup)
        .where(PermissionGroup.id == group_id)
    )
    await session.execute(stmt)
    await session.flush()


async def get_user_permissions(
    session: AsyncSession, user_id: str
) -> list[str]:
    """查询用户的所有权限码。

    遍历用户所属权限组，如果权限组 auto_include_all 为 True，
    则包含所有权限码；否则收集该组关联的权限码。结果去重。
    """
    # 查询用户所属的权限组
    group_stmt = (
        select(PermissionGroup)
        .join(
            user_group,
            PermissionGroup.id == user_group.c.group_id,
        )
        .where(user_group.c.user_id == user_id)
        .options(selectinload(PermissionGroup.permissions))
    )
    result = await session.execute(group_stmt)
    groups = list(result.scalars().all())

    # 检查是否有 auto_include_all 的组
    has_all = any(g.auto_include_all for g in groups)
    if has_all:
        all_perms = await list_permissions(session)
        return [p.code for p in all_perms]

    # 收集各组权限码并去重
    codes: set[str] = set()
    for group in groups:
        for perm in group.permissions:
            codes.add(perm.code)
    return list(codes)


async def get_user_group_ids(
    session: AsyncSession, user_id: str
) -> list[str]:
    """查询用户所属的权限组 ID 列表。"""
    stmt = select(user_group.c.group_id).where(
        user_group.c.user_id == user_id
    )
    result = await session.execute(stmt)
    return [row[0] for row in result.all()]


async def set_user_groups(
    session: AsyncSession, user_id: str, group_ids: list[str]
) -> None:
    """设置用户的权限组，先删除旧关联再插入新关联。"""
    # 删除旧关联
    del_stmt = delete(user_group).where(
        user_group.c.user_id == user_id
    )
    await session.execute(del_stmt)

    # 插入新关联
    if group_ids:
        values = [
            {"user_id": user_id, "group_id": gid}
            for gid in group_ids
        ]
        await session.execute(insert(user_group).values(values))

    await session.flush()
