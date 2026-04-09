"""管理员领域路由层。

提供用户管理、密码重置、权限分配、强制下线等管理员 API 端点。
"""

from fastapi import APIRouter, Depends

from app.admin.schemas import (
    GroupAssignment,
    MessageResponse,
    PasswordReset,
    UserTypeChange,
)
from app.admin.service import AdminService
from app.core.dependencies import (
    CurrentPermissions,
    DbSession,
    IsSuperuser,
    require_any_permission,
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
        Depends(
            require_any_permission(
                "member:manage", "staff:manage"
            )
        )
    ],
)
async def list_users(
    session: DbSession,
    permissions: CurrentPermissions,
    is_superuser: IsSuperuser,
    user_type: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[UserResponse]:
    """分页查询用户列表，支持按类型和关键词筛选。"""
    params = PaginationParams(page=page, page_size=page_size)

    # 非超管且只有单一管理权限时，自动限定用户类型
    if not is_superuser:
        has_member = "member:manage" in permissions
        has_staff = "staff:manage" in permissions
        if has_member and not has_staff and not user_type:
            # member:manage 可管理 member 和 guest，不限定具体类型
            pass
        elif has_staff and not has_member:
            user_type = "staff"

    svc = AdminService(session)
    users, total = await svc.list_users(
        user_type, search, params.offset, params.page_size
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
        Depends(
            require_any_permission(
                "member:manage", "staff:manage"
            )
        )
    ],
)
async def get_user(
    user_id: str,
    session: DbSession,
    permissions: CurrentPermissions,
    is_superuser: IsSuperuser,
) -> UserResponse:
    """查询用户详情。"""
    svc = AdminService(session)
    target = await svc.get_user_model(user_id)
    await svc.check_target_permission(
        target, permissions, is_superuser
    )
    return await svc.get_user(user_id)


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    dependencies=[
        Depends(
            require_any_permission(
                "member:manage", "staff:manage"
            )
        )
    ],
)
async def update_user(
    user_id: str,
    data: UserAdminUpdate,
    session: DbSession,
    permissions: CurrentPermissions,
    is_superuser: IsSuperuser,
) -> UserResponse:
    """管理员更新用户信息（激活状态、存储配额）。"""
    svc = AdminService(session)
    target = await svc.get_user_model(user_id)
    await svc.check_target_permission(
        target, permissions, is_superuser
    )
    return await svc.update_user(user_id, data)


@router.patch(
    "/users/{user_id}/type",
    response_model=UserResponse,
    dependencies=[
        Depends(
            require_permission(
                "member:manage", "staff:manage"
            )
        )
    ],
)
async def change_user_type(
    user_id: str,
    data: UserTypeChange,
    session: DbSession,
    permissions: CurrentPermissions,
    is_superuser: IsSuperuser,
) -> UserResponse:
    """修改用户类型（需同时拥有 member:manage 和 staff:manage）。"""
    svc = AdminService(session)
    target = await svc.get_user_model(user_id)
    await svc.check_target_permission(
        target, permissions, is_superuser
    )
    return await svc.change_user_type(user_id, data.user_type)


@router.put(
    "/users/{user_id}/password",
    response_model=MessageResponse,
    dependencies=[
        Depends(
            require_any_permission(
                "member:manage", "staff:manage"
            )
        )
    ],
)
async def reset_password(
    user_id: str,
    data: PasswordReset,
    session: DbSession,
    permissions: CurrentPermissions,
    is_superuser: IsSuperuser,
) -> MessageResponse:
    """重置用户密码。"""
    svc = AdminService(session)
    target = await svc.get_user_model(user_id)
    await svc.check_target_permission(
        target, permissions, is_superuser
    )
    await svc.reset_password(user_id, data.password)
    return MessageResponse(message="密码重置成功")


@router.put(
    "/users/{user_id}/groups",
    response_model=UserResponse,
    dependencies=[
        Depends(
            require_any_permission(
                "member:manage", "staff:manage"
            )
        )
    ],
)
async def assign_group(
    user_id: str,
    data: GroupAssignment,
    session: DbSession,
    permissions: CurrentPermissions,
    is_superuser: IsSuperuser,
) -> UserResponse:
    """分配用户权限组（单个）。"""
    svc = AdminService(session)
    target = await svc.get_user_model(user_id)
    await svc.check_target_permission(
        target, permissions, is_superuser
    )
    return await svc.assign_group(
        user_id, data.group_id, permissions, is_superuser
    )


@router.delete(
    "/users/{user_id}/tokens",
    response_model=MessageResponse,
    dependencies=[
        Depends(
            require_any_permission(
                "member:manage", "staff:manage"
            )
        )
    ],
)
async def force_logout(
    user_id: str,
    session: DbSession,
    permissions: CurrentPermissions,
    is_superuser: IsSuperuser,
) -> MessageResponse:
    """强制下线用户，撤销所有刷新令牌。"""
    svc = AdminService(session)
    target = await svc.get_user_model(user_id)
    await svc.check_target_permission(
        target, permissions, is_superuser
    )
    await svc.force_logout(user_id)
    return MessageResponse(message="用户已强制下线")
