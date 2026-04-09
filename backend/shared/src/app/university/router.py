"""合作院校领域路由层。

提供院校的公开查询和管理员管理 API 端点。
"""

from fastapi import APIRouter, Depends, status

from app.core.dependencies import (
    DbSession,
    require_permission,
)
from app.core.pagination import (
    PaginatedResponse,
    PaginationParams,
)
from app.university.schemas import (
    UniversityCreate,
    UniversityResponse,
    UniversityUpdate,
)
from app.university.service import UniversityService

# ---- 公开路由 ----

public_router = APIRouter(
    prefix="/universities", tags=["universities"]
)


def _build_paginated(
    items: list,
    total: int,
    params: PaginationParams,
) -> PaginatedResponse[UniversityResponse]:
    """构建分页响应。"""
    total_pages = (
        (total + params.page_size - 1) // params.page_size
    )
    return PaginatedResponse(
        items=[
            UniversityResponse.model_validate(i)
            for i in items
        ],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@public_router.get(
    "",
    response_model=PaginatedResponse[UniversityResponse],
)
async def list_universities(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
    country: str | None = None,
    is_featured: bool | None = None,
    search: str | None = None,
    program: str | None = None,
) -> PaginatedResponse[UniversityResponse]:
    """分页查询合作院校列表。

    支持按关键词搜索和专业过滤。
    """
    params = PaginationParams(
        page=page, page_size=page_size
    )
    svc = UniversityService(session)
    universities, total = await svc.list_universities(
        params.offset,
        params.page_size,
        country,
        is_featured,
        search,
        program,
    )
    return _build_paginated(universities, total, params)


@public_router.get(
    "/countries",
    response_model=list[str],
)
async def list_countries(
    session: DbSession,
) -> list[str]:
    """获取所有院校的去重国家列表。"""
    svc = UniversityService(session)
    return await svc.get_distinct_countries()


@public_router.get(
    "/{university_id}",
    response_model=UniversityResponse,
)
async def get_university(
    university_id: str, session: DbSession
) -> UniversityResponse:
    """获取院校详情。"""
    svc = UniversityService(session)
    university = await svc.get_university(university_id)
    return UniversityResponse.model_validate(university)


# ---- 管理员路由 ----

admin_router = APIRouter(
    prefix="/admin/universities",
    tags=["admin-universities"],
)


@admin_router.post(
    "",
    response_model=UniversityResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(require_permission("post:manage"))
    ],
)
async def admin_create_university(
    data: UniversityCreate, session: DbSession
) -> UniversityResponse:
    """管理员创建院校。"""
    svc = UniversityService(session)
    university = await svc.create_university(data)
    return UniversityResponse.model_validate(university)


@admin_router.patch(
    "/{university_id}",
    response_model=UniversityResponse,
    dependencies=[
        Depends(require_permission("post:manage"))
    ],
)
async def admin_update_university(
    university_id: str,
    data: UniversityUpdate,
    session: DbSession,
) -> UniversityResponse:
    """管理员更新院校。"""
    svc = UniversityService(session)
    university = await svc.update_university(
        university_id, data
    )
    return UniversityResponse.model_validate(university)


@admin_router.delete(
    "/{university_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[
        Depends(require_permission("post:manage"))
    ],
)
async def admin_delete_university(
    university_id: str, session: DbSession
) -> None:
    """管理员删除院校。"""
    svc = UniversityService(session)
    await svc.delete_university(university_id)
