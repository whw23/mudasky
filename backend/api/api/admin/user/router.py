"""管理员用户管理路由层。

提供用户管理、密码重置、权限分配、强制下线等管理员 API 端点。
"""

from fastapi import APIRouter, Query, Response

from api.core.dependencies import CurrentUserId, DbSession
from api.core.pagination import PaginatedResponse, PaginationParams

from .schemas import (
    DeleteUserRequest,
    ForceLogoutRequest,
    MessageResponse,
    PasswordReset,
    RoleAssignment,
    UserAdminUpdate,
    UserResponse,
)
from .service import AdminService

router = APIRouter(
    prefix="/users",
    tags=["admin"],
)
router.label = "用户管理"


@router.get(
    "/list",
    response_model=PaginatedResponse[UserResponse],
    summary="查询用户列表",
)
async def list_users(
    session: DbSession,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[UserResponse]:
    """分页查询用户列表，支持按关键词筛选。"""
    params = PaginationParams(page=page, page_size=page_size)

    svc = AdminService(session)
    users, total = await svc.list_users(
        search, params.offset, params.page_size
    )
    total_pages = (
        (total + params.page_size - 1) // params.page_size
    )
    return PaginatedResponse(
        items=users,
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@router.get(
    "/list/detail",
    response_model=UserResponse,
    summary="查询用户详情",
)
async def get_user(
    session: DbSession,
    user_id: str = Query(..., description="用户 ID"),
) -> UserResponse:
    """查询用户详情。"""
    svc = AdminService(session)
    return await svc.get_user(user_id)


@router.post(
    "/list/detail/edit",
    response_model=UserResponse,
    summary="更新用户信息",
)
async def update_user(
    data: UserAdminUpdate,
    response: Response,
    session: DbSession,
) -> UserResponse:
    """管理员更新用户信息（激活状态、存储配额）。"""
    svc = AdminService(session)
    result = await svc.update_user(data.user_id, data)
    # 禁用时通知网关拉黑该用户的 access_token
    if data.is_active is False:
        response.headers["X-Revoke-User"] = data.user_id
    return result


@router.post(
    "/list/detail/reset-password",
    response_model=MessageResponse,
    summary="重置用户密码",
)
async def reset_password(
    data: PasswordReset,
    session: DbSession,
) -> MessageResponse:
    """重置用户密码。"""
    svc = AdminService(session)
    await svc.reset_password(
        data.user_id, data.encrypted_password, data.nonce
    )
    return MessageResponse(message="密码重置成功")


@router.post(
    "/list/detail/assign-role",
    response_model=UserResponse,
    summary="分配用户角色",
)
async def assign_role(
    data: RoleAssignment,
    response: Response,
    session: DbSession,
) -> UserResponse:
    """分配用户角色（单个）。"""
    svc = AdminService(session)
    result = await svc.assign_role(data.user_id, data.role_id)
    # 角色变更，通知网关拉黑旧 token
    response.headers["X-Revoke-User"] = data.user_id
    return result


@router.post(
    "/list/detail/force-logout",
    response_model=MessageResponse,
    summary="强制下线用户",
)
async def force_logout(
    data: ForceLogoutRequest,
    session: DbSession,
) -> MessageResponse:
    """强制下线用户，撤销所有刷新令牌。"""
    svc = AdminService(session)
    await svc.force_logout(data.user_id)
    return MessageResponse(message="用户已强制下线")


@router.post(
    "/list/detail/delete",
    response_model=MessageResponse,
    summary="删除用户",
)
async def delete_user(
    data: DeleteUserRequest,
    admin_user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """管理员删除用户，清理所有关联数据。"""
    from app.core.exceptions import ForbiddenException

    if data.user_id == admin_user_id:
        raise ForbiddenException(
            message="不能删除自己的账号",
            code="CANNOT_DELETE_SELF",
        )
    svc = AdminService(session)
    await svc.delete_user(data.user_id)
    return MessageResponse(message="用户已删除")
