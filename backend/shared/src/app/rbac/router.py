"""RBAC 权限领域路由层。

提供权限查询、角色管理等 API 端点。
"""

from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.core.dependencies import DbSession
from app.rbac.schemas import (
    PermissionResponse,
    RoleCreate,
    RoleReorder,
    RoleResponse,
    RoleUpdate,
)
from app.rbac.service import RbacService

router = APIRouter(prefix="/admin/roles", tags=["rbac"])


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


@router.get(
    "/permissions",
    response_model=list[PermissionResponse],
)
async def list_permissions(
    session: DbSession,
) -> list[PermissionResponse]:
    """查询所有权限列表。"""
    svc = RbacService(session)
    return await svc.list_permissions()


@router.get(
    "/list",
    response_model=list[RoleResponse],
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
)
async def reorder_roles(data: RoleReorder, session: DbSession) -> MessageResponse:
    """批量更新角色排序。"""
    svc = RbacService(session)
    await svc.reorder_roles(data)
    return MessageResponse(message="排序已更新")


@router.get(
    "/detail/{role_id}",
    response_model=RoleResponse,
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
)
async def delete_role(
    role_id: str,
    session: DbSession,
) -> MessageResponse:
    """删除角色。"""
    svc = RbacService(session)
    await svc.delete_role(role_id)
    return MessageResponse(message="角色已删除")


def get_openapi_spec(app: Any) -> dict:
    """从 FastAPI 应用获取 OpenAPI spec。"""
    if hasattr(app, "openapi"):
        return app.openapi()
    from fastapi.openapi.utils import get_openapi

    return get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )


@router.get("/list/openapi.json")
async def get_openapi_json(request: Request) -> dict:
    """返回 OpenAPI spec（权限码复用 admin/roles/list）。"""
    return get_openapi_spec(request.app)
