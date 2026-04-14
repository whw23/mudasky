"""管理员领域路由层。

提供用户管理、密码重置、权限分配、强制下线等管理员 API 端点。
"""

from fastapi import APIRouter, Header

from app.admin.schemas import (
    MessageResponse,
    PasswordReset,
    RoleAssignment,
)
from app.admin.service import AdminService
from app.core.dependencies import CurrentUserId, DbSession
from app.core.pagination import PaginatedResponse, PaginationParams
from app.user.schemas import UserAdminUpdate, UserResponse

router = APIRouter(
    prefix="/users",
    tags=["admin"],
)


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
    "/detail/{user_id}",
    response_model=UserResponse,
    summary="查询用户详情",
)
async def get_user(
    user_id: str,
    session: DbSession,
) -> UserResponse:
    """查询用户详情。"""
    svc = AdminService(session)
    return await svc.get_user(user_id)


@router.post(
    "/edit/{user_id}",
    response_model=UserResponse,
    summary="更新用户信息",
)
async def update_user(
    user_id: str,
    data: UserAdminUpdate,
    session: DbSession,
) -> UserResponse:
    """管理员更新用户信息（激活状态、存储配额）。"""
    svc = AdminService(session)
    return await svc.update_user(user_id, data)


@router.post(
    "/reset-password/{user_id}",
    response_model=MessageResponse,
    summary="重置用户密码",
)
async def reset_password(
    user_id: str,
    data: PasswordReset,
    session: DbSession,
) -> MessageResponse:
    """重置用户密码。"""
    svc = AdminService(session)
    await svc.reset_password(
        user_id, data.encrypted_password, data.nonce
    )
    return MessageResponse(message="密码重置成功")


@router.post(
    "/assign-role/{user_id}",
    response_model=UserResponse,
    summary="分配用户角色",
)
async def assign_role(
    user_id: str,
    data: RoleAssignment,
    session: DbSession,
) -> UserResponse:
    """分配用户角色（单个）。"""
    svc = AdminService(session)
    return await svc.assign_role(user_id, data.role_id)


@router.post(
    "/force-logout/{user_id}",
    response_model=MessageResponse,
    summary="强制下线用户",
)
async def force_logout(
    user_id: str,
    session: DbSession,
) -> MessageResponse:
    """强制下线用户，撤销所有刷新令牌。"""
    svc = AdminService(session)
    await svc.force_logout(user_id)
    return MessageResponse(message="用户已强制下线")


@router.post(
    "/delete/{user_id}",
    response_model=MessageResponse,
    summary="删除用户",
)
async def delete_user(
    user_id: str,
    admin_user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """管理员删除用户，清理所有关联数据。"""
    from app.core.exceptions import ForbiddenException

    if user_id == admin_user_id:
        raise ForbiddenException(
            message="不能删除自己的账号",
            code="CANNOT_DELETE_SELF",
        )
    svc = AdminService(session)
    await svc.delete_user(user_id)
    return MessageResponse(message="用户已删除")
