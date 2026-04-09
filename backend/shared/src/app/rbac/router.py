"""RBAC 权限领域路由层。

提供权限查询、权限组管理等 API 端点。
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies import DbSession, require_permission
from app.rbac.schemas import (
    PERMISSION_CATEGORIES,
    GroupCreate,
    GroupResponse,
    GroupUpdate,
    PermissionResponse,
)
from app.rbac.service import RbacService

router = APIRouter(tags=["rbac"])


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


@router.get(
    "/permissions",
    response_model=list[PermissionResponse],
    dependencies=[Depends(require_permission("group:manage"))],
)
async def list_permissions(
    session: DbSession,
) -> list[PermissionResponse]:
    """查询所有权限列表。"""
    svc = RbacService(session)
    return await svc.list_permissions()


@router.get(
    "/permissions/categories",
    response_model=list[dict],
    dependencies=[Depends(require_permission("group:manage"))],
)
async def list_permission_categories() -> list[dict]:
    """查询权限分类列表（用于前端树形展示）。"""
    return PERMISSION_CATEGORIES


@router.get(
    "/groups",
    response_model=list[GroupResponse],
    dependencies=[Depends(require_permission("group:manage"))],
)
async def list_groups(
    session: DbSession,
) -> list[GroupResponse]:
    """查询所有权限组列表。"""
    svc = RbacService(session)
    return await svc.list_groups()


@router.post(
    "/groups",
    response_model=GroupResponse,
    dependencies=[Depends(require_permission("group:manage"))],
)
async def create_group(
    data: GroupCreate,
    session: DbSession,
) -> GroupResponse:
    """创建权限组。"""
    svc = RbacService(session)
    return await svc.create_group(data)


@router.get(
    "/groups/{group_id}",
    response_model=GroupResponse,
    dependencies=[Depends(require_permission("group:manage"))],
)
async def get_group(
    group_id: str,
    session: DbSession,
) -> GroupResponse:
    """获取权限组详情。"""
    svc = RbacService(session)
    return await svc.get_group(group_id)


@router.patch(
    "/groups/{group_id}",
    response_model=GroupResponse,
    dependencies=[Depends(require_permission("group:manage"))],
)
async def update_group(
    group_id: str,
    data: GroupUpdate,
    session: DbSession,
) -> GroupResponse:
    """更新权限组。"""
    svc = RbacService(session)
    return await svc.update_group(group_id, data)


@router.delete(
    "/groups/{group_id}",
    response_model=MessageResponse,
    dependencies=[Depends(require_permission("group:manage"))],
)
async def delete_group(
    group_id: str,
    session: DbSession,
) -> MessageResponse:
    """删除权限组。"""
    svc = RbacService(session)
    await svc.delete_group(group_id)
    return MessageResponse(message="权限组已删除")
