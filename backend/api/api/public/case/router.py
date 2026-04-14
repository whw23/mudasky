"""成功案例公开路由层。"""

from fastapi import APIRouter, Header, Response

from .schemas import CaseResponse
from .service import CaseService
from api.core.cache import set_cache_headers
from api.core.dependencies import DbSession
from api.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    build_paginated,
)

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get(
    "/list",
    response_model=PaginatedResponse[CaseResponse],
    summary="分页查询成功案例",
)
async def list_cases(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
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
    result = build_paginated(
        cases, total, params, CaseResponse
    )
    seed = f"case:list:{page}:{page_size}:{year}:{featured}:{total}"
    if set_cache_headers(response, seed, 1800, if_none_match):
        return response  # type: ignore[return-value]
    return result


@router.get(
    "/detail/{case_id}",
    response_model=CaseResponse,
    summary="获取成功案例详情",
)
async def get_case(
    case_id: str,
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> CaseResponse:
    """获取成功案例详情。"""
    svc = CaseService(session)
    case = await svc.get_case(case_id)
    result = CaseResponse.model_validate(case)
    ts = case.updated_at.isoformat() if case.updated_at else ""
    seed = f"case:{case_id}:{ts}"
    if set_cache_headers(response, seed, 1800, if_none_match):
        return response  # type: ignore[return-value]
    return result
