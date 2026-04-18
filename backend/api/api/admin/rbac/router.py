"""RBAC 权限管理路由层。

提供权限查询、角色管理等 API 端点。
"""

from fastapi import APIRouter, Query, Request, Response
from pydantic import BaseModel

from api.core.dependencies import DbSession

from .schemas import (
    RoleCreate,
    RoleDeleteRequest,
    RoleReorder,
    RoleResponse,
    RoleUpdate,
)
from .service import RbacService

router = APIRouter(prefix="/roles", tags=["rbac"])


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


@router.get(
    "/meta/list",
    response_model=list[RoleResponse],
    summary="查询角色列表",
)
async def list_roles(
    session: DbSession,
) -> list[RoleResponse]:
    """查询所有角色列表。"""
    svc = RbacService(session)
    return await svc.list_roles()


@router.post(
    "/meta/list/create",
    response_model=RoleResponse,
    summary="创建角色",
)
async def create_role(
    data: RoleCreate,
    session: DbSession,
) -> RoleResponse:
    """创建角色。"""
    svc = RbacService(session)
    return await svc.create_role(data)


@router.post(
    "/meta/list/reorder",
    response_model=MessageResponse,
    summary="更新角色排序",
)
async def reorder_roles(data: RoleReorder, session: DbSession) -> MessageResponse:
    """批量更新角色排序。"""
    svc = RbacService(session)
    await svc.reorder_roles(data)
    return MessageResponse(message="排序已更新")


@router.get(
    "/meta/list/detail",
    response_model=RoleResponse,
    summary="获取角色详情",
)
async def get_role(
    session: DbSession,
    role_id: str = Query(..., description="角色 ID"),
) -> RoleResponse:
    """获取角色详情。"""
    svc = RbacService(session)
    return await svc.get_role(role_id)


@router.post(
    "/meta/list/detail/edit",
    response_model=RoleResponse,
    summary="更新角色",
)
async def update_role(
    data: RoleUpdate,
    response: Response,
    session: DbSession,
) -> RoleResponse:
    """更新角色。"""
    svc = RbacService(session)
    result, affected_ids = await svc.update_role(data.role_id, data)
    if affected_ids:
        response.headers["X-Revoke-User"] = ",".join(affected_ids)
    return result


@router.post(
    "/meta/list/detail/delete",
    response_model=MessageResponse,
    summary="删除角色",
)
async def delete_role(
    data: RoleDeleteRequest,
    response: Response,
    session: DbSession,
) -> MessageResponse:
    """删除角色。"""
    svc = RbacService(session)
    affected_ids = await svc.delete_role(data.role_id)
    if affected_ids:
        response.headers["X-Revoke-User"] = ",".join(affected_ids)
    return MessageResponse(message="角色已删除")


@router.get("/meta", summary="获取前置数据")
async def get_roles_meta(request: Request) -> dict:
    """返回权限树（启动时缓存）。"""
    return {
        "permission_tree": request.app.state.permission_tree
    }
