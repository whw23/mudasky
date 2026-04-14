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

router = APIRouter(prefix="/roles", tags=["rbac"])


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


@router.get(
    "/permissions",
    response_model=list[PermissionResponse],
    summary="查询权限列表",
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


_PERMISSION_PREFIXES = ("/admin/", "/portal/")
_EXCLUDED_PREFIXES = ("/auth/", "/public/", "/health")


def _filter_openapi_spec(app: Any) -> dict:
    """从 OpenAPI spec 中提取权限相关路由。

    只保留 /admin/* 和 /portal/* 路径，
    排除 /auth/*、/public/*、/health，
    移除 components 等无关字段，减少响应体积。
    """
    if hasattr(app, "openapi"):
        full = app.openapi()
    else:
        from fastapi.openapi.utils import get_openapi

        full = get_openapi(
            title=app.title,
            version=app.version,
            routes=app.routes,
        )

    filtered_paths = {}
    for path, methods in (full.get("paths") or {}).items():
        if any(path.startswith(p) for p in _EXCLUDED_PREFIXES):
            continue
        if any(path.startswith(p) for p in _PERMISSION_PREFIXES):
            filtered_paths[path] = methods

    return {"paths": filtered_paths}


@router.get("/list/openapi.json", summary="获取权限相关 API 路由")
async def get_openapi_json(request: Request) -> dict:
    """返回权限相关的 API 路由（权限码复用 admin/roles/list）。"""
    return _filter_openapi_spec(request.app)
