"""管理员领域路由层。

提供用户管理、密码重置、权限分配、强制下线等管理员 API 端点。
"""

from fastapi import APIRouter, Depends

from app.admin.schemas import (
    MessageResponse,
    PasswordReset,
    RoleAssignment,
)
from app.admin.service import AdminService
from app.core.dependencies import (
    DbSession,
    require_permission,
)
from app.core.pagination import PaginatedResponse, PaginationParams
from app.user.schemas import UserAdminUpdate, UserResponse

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)


@router.get(
    "/users",
    response_model=PaginatedResponse[UserResponse],
    dependencies=[
        Depends(require_permission("admin.user.list"))
    ],
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
    "/users/{user_id}",
    response_model=UserResponse,
    dependencies=[
        Depends(require_permission("admin.user.list"))
    ],
)
async def get_user(
    user_id: str,
    session: DbSession,
) -> UserResponse:
    """查询用户详情。"""
    svc = AdminService(session)
    return await svc.get_user(user_id)


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    dependencies=[
        Depends(require_permission("admin.user.edit"))
    ],
)
async def update_user(
    user_id: str,
    data: UserAdminUpdate,
    session: DbSession,
) -> UserResponse:
    """管理员更新用户信息（激活状态、存储配额）。"""
    svc = AdminService(session)
    return await svc.update_user(user_id, data)


@router.put(
    "/users/{user_id}/password",
    response_model=MessageResponse,
    dependencies=[
        Depends(
            require_permission("admin.user.reset_password")
        )
    ],
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


@router.put(
    "/users/{user_id}/role",
    response_model=UserResponse,
    dependencies=[
        Depends(
            require_permission("admin.user.assign_role")
        )
    ],
)
async def assign_role(
    user_id: str,
    data: RoleAssignment,
    session: DbSession,
) -> UserResponse:
    """分配用户角色（单个）。"""
    svc = AdminService(session)
    return await svc.assign_role(user_id, data.role_id)


@router.delete(
    "/users/{user_id}/tokens",
    response_model=MessageResponse,
    dependencies=[
        Depends(require_permission("admin.user.edit"))
    ],
)
async def force_logout(
    user_id: str,
    session: DbSession,
) -> MessageResponse:
    """强制下线用户，撤销所有刷新令牌。"""
    svc = AdminService(session)
    await svc.force_logout(user_id)
    return MessageResponse(message="用户已强制下线")
