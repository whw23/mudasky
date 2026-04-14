"""RBAC 权限管理路由层。

提供权限查询、角色管理等 API 端点。
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel

from api.core.dependencies import DbSession

from .schemas import (
    RoleCreate,
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
    "/list",
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
    "/create",
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
    "/reorder",
    response_model=MessageResponse,
    summary="更新角色排序",
)
async def reorder_roles(data: RoleReorder, session: DbSession) -> MessageResponse:
    """批量更新角色排序。"""
    svc = RbacService(session)
    await svc.reorder_roles(data)
    return MessageResponse(message="排序已更新")


@router.get(
    "/detail/{role_id}",
    response_model=RoleResponse,
    summary="获取角色详情",
)
async def get_role(
    role_id: str,
    session: DbSession,
) -> RoleResponse:
    """获取角色详情。"""
    svc = RbacService(session)
    return await svc.get_role(role_id)


@router.post(
    "/edit/{role_id}",
    response_model=RoleResponse,
    summary="更新角色",
)
async def update_role(
    role_id: str,
    data: RoleUpdate,
    session: DbSession,
) -> RoleResponse:
    """更新角色。"""
    svc = RbacService(session)
    return await svc.update_role(role_id, data)


@router.post(
    "/delete/{role_id}",
    response_model=MessageResponse,
    summary="删除角色",
)
async def delete_role(
    role_id: str,
    session: DbSession,
) -> MessageResponse:
    """删除角色。"""
    svc = RbacService(session)
    await svc.delete_role(role_id)
    return MessageResponse(message="角色已删除")


@router.get("/meta", summary="获取前置数据")
async def get_roles_meta(request: Request) -> dict:
    """返回权限树（启动时缓存）。"""
    return {
        "permission_tree": request.app.state.permission_tree
    }
