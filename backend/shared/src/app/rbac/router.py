"""RBAC 权限领域路由层。

提供权限查询、角色管理等 API 端点。
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies import DbSession, require_permission
from app.rbac.schemas import (
    PermissionResponse,
    RoleCreate,
    RoleReorder,
    RoleResponse,
    RoleUpdate,
)
from app.rbac.service import RbacService

router = APIRouter(tags=["rbac"])


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


@router.get(
    "/permissions",
    response_model=list[PermissionResponse],
    dependencies=[
        Depends(require_permission("admin.role.list"))
    ],
)
async def list_permissions(
    session: DbSession,
) -> list[PermissionResponse]:
    """查询所有权限列表。"""
    svc = RbacService(session)
    return await svc.list_permissions()


@router.get(
    "/roles",
    response_model=list[RoleResponse],
    dependencies=[
        Depends(require_permission("admin.role.list"))
    ],
)
async def list_roles(
    session: DbSession,
) -> list[RoleResponse]:
    """查询所有角色列表。"""
    svc = RbacService(session)
    return await svc.list_roles()


@router.post(
    "/roles",
    response_model=RoleResponse,
    dependencies=[
        Depends(require_permission("admin.role.create"))
    ],
)
async def create_role(
    data: RoleCreate,
    session: DbSession,
) -> RoleResponse:
    """创建角色。"""
    svc = RbacService(session)
    return await svc.create_role(data)


@router.patch(
    "/roles/reorder",
    response_model=MessageResponse,
    dependencies=[Depends(require_permission("admin.role.edit"))],
)
async def reorder_roles(data: RoleReorder, session: DbSession) -> MessageResponse:
    """批量更新角色排序。"""
    svc = RbacService(session)
    await svc.reorder_roles(data)
    return MessageResponse(message="排序已更新")


@router.get(
    "/roles/{role_id}",
    response_model=RoleResponse,
    dependencies=[
        Depends(require_permission("admin.role.list"))
    ],
)
async def get_role(
    role_id: str,
    session: DbSession,
) -> RoleResponse:
    """获取角色详情。"""
    svc = RbacService(session)
    return await svc.get_role(role_id)


@router.patch(
    "/roles/{role_id}",
    response_model=RoleResponse,
    dependencies=[
        Depends(require_permission("admin.role.edit"))
    ],
)
async def update_role(
    role_id: str,
    data: RoleUpdate,
    session: DbSession,
) -> RoleResponse:
    """更新角色。"""
    svc = RbacService(session)
    return await svc.update_role(role_id, data)


@router.delete(
    "/roles/{role_id}",
    response_model=MessageResponse,
    dependencies=[
        Depends(require_permission("admin.role.delete"))
    ],
)
async def delete_role(
    role_id: str,
    session: DbSession,
) -> MessageResponse:
    """删除角色。"""
    svc = RbacService(session)
    await svc.delete_role(role_id)
    return MessageResponse(message="角色已删除")
