"""合作院校管理路由层。

提供院校的管理员 API 端点。
"""

from fastapi import APIRouter, status

from api.core.dependencies import DbSession
from api.core.pagination import (
    PaginatedResponse,
    PaginationParams,
)

from .schemas import (
    UniversityCreate,
    UniversityDeleteRequest,
    UniversityResponse,
    UniversityUpdate,
)
from .service import UniversityService

router = APIRouter(
    prefix="/universities",
    tags=["admin-universities"],
)


@router.get(
    "/list",
    response_model=PaginatedResponse[UniversityResponse],
    summary="管理员查询院校列表",
)
async def admin_list_universities(
    session: DbSession,
    page_size: int = 100,
) -> PaginatedResponse[UniversityResponse]:
    """管理员获取院校列表。"""
    svc = UniversityService(session)
    universities, total = await svc.list_universities(0, page_size)
    return PaginatedResponse(
        items=[UniversityResponse.model_validate(u) for u in universities],
        total=total,
        page=1,
        page_size=page_size,
        total_pages=1,
    )


@router.post(
    "/list/create",
    response_model=UniversityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建院校",
)
async def admin_create_university(
    data: UniversityCreate, session: DbSession
) -> UniversityResponse:
    """管理员创建院校。"""
    svc = UniversityService(session)
    university = await svc.create_university(data)
    return UniversityResponse.model_validate(university)


@router.post(
    "/list/detail/edit",
    response_model=UniversityResponse,
    summary="更新院校",
)
async def admin_update_university(
    data: UniversityUpdate,
    session: DbSession,
) -> UniversityResponse:
    """管理员更新院校。"""
    svc = UniversityService(session)
    university = await svc.update_university(
        data.university_id, data
    )
    return UniversityResponse.model_validate(university)


@router.post(
    "/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除院校",
)
async def admin_delete_university(
    data: UniversityDeleteRequest, session: DbSession
) -> None:
    """管理员删除院校。"""
    svc = UniversityService(session)
    await svc.delete_university(data.university_id)
