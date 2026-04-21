"""成功案例公开路由层。"""

from fastapi import APIRouter, Header, Response

from .schemas import CaseResponse, UniversityBrief
from .service import CaseService
from api.core.cache import set_cache_headers
from api.core.dependencies import DbSession
from api.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    build_paginated,
)
from app.db.university import repository as university_repo

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

    # 获取所有关联的院校信息
    university_ids = {c.university_id for c in cases if c.university_id}
    universities = {}
    for uid in university_ids:
        uni = await university_repo.get_university_by_id(session, uid)
        if uni:
            universities[uid] = uni

    # 构建响应，附加院校信息
    case_responses = []
    for case in cases:
        case_resp = CaseResponse.model_validate(case)
        if case.university_id and case.university_id in universities:
            case_resp.related_university = UniversityBrief.model_validate(
                universities[case.university_id]
            )
        case_responses.append(case_resp)

    result = PaginatedResponse(
        items=case_responses,
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=(total + params.page_size - 1) // params.page_size,
    )

    seed = f"case:list:{page}:{page_size}:{year}:{featured}:{total}"
    if set_cache_headers(response, seed, 0, if_none_match):
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

    # 获取关联院校信息
    if case.university_id:
        university = await university_repo.get_university_by_id(
            session, case.university_id
        )
        if university:
            result.related_university = UniversityBrief.model_validate(university)

    ts = case.updated_at.isoformat() if case.updated_at else ""
    seed = f"case:{case_id}:{ts}"
    if set_cache_headers(response, seed, 1800, if_none_match):
        return response  # type: ignore[return-value]
    return result
