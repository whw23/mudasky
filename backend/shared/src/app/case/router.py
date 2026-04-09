"""成功案例领域公开路由层。

提供成功案例的公开 API 端点。
"""

from fastapi import APIRouter

from app.case.schemas import CaseResponse
from app.case.service import CaseService
from app.core.dependencies import DbSession
from app.core.pagination import PaginatedResponse, PaginationParams

router = APIRouter(prefix="/cases", tags=["cases"])


def _build_paginated(
    items: list,
    total: int,
    params: PaginationParams,
    response_cls: type,
) -> PaginatedResponse:
    """构建分页响应。"""
    total_pages = (
        (total + params.page_size - 1) // params.page_size
    )
    return PaginatedResponse(
        items=[response_cls.model_validate(i) for i in items],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@router.get(
    "",
    response_model=PaginatedResponse[CaseResponse],
)
async def list_cases(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
    year: int | None = None,
    featured: bool | None = None,
) -> PaginatedResponse[CaseResponse]:
    """分页查询成功案例，可按年份和推荐状态过滤。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = CaseService(session)
    cases, total = await svc.list_cases(
        params.offset, params.page_size, year, featured
    )
    return _build_paginated(
        cases, total, params, CaseResponse
    )


@router.get(
    "/{case_id}",
    response_model=CaseResponse,
)
async def get_case(
    case_id: str, session: DbSession
) -> CaseResponse:
    """获取成功案例详情。"""
    svc = CaseService(session)
    case = await svc.get_case(case_id)
    return CaseResponse.model_validate(case)
