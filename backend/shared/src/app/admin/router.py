"""管理员领域路由层。

提供用户管理等管理员专用 API 端点。
"""

from fastapi import APIRouter, Depends

from app.admin.service import AdminService
from app.core.dependencies import DbSession, require_role
from app.core.pagination import PaginatedResponse, PaginationParams
from app.user.schemas import UserAdminUpdate, UserResponse

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role("admin"))],
)


@router.get(
    "/users",
    response_model=PaginatedResponse[UserResponse],
)
async def list_users(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[UserResponse]:
    """分页查询所有用户（仅管理员）。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = AdminService(session)
    users, total = await svc.list_users(
        params.offset, params.page_size
    )
    total_pages = (
        (total + params.page_size - 1) // params.page_size
    )
    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@router.patch(
    "/users/{user_id}", response_model=UserResponse
)
async def update_user(
    user_id: str,
    data: UserAdminUpdate,
    session: DbSession,
) -> UserResponse:
    """管理员更新用户信息。"""
    svc = AdminService(session)
    user = await svc.update_user(user_id, data)
    return UserResponse.model_validate(user)
