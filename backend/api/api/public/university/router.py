"""合作院校公开路由层。"""

from fastapi import APIRouter, Header, Response

from .schemas import UniversityResponse
from .service import UniversityService
from api.core.cache import set_cache_headers
from api.core.dependencies import DbSession
from api.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    build_paginated,
)

router = APIRouter(prefix="/universities", tags=["universities"])


@router.get(
    "/list",
    response_model=PaginatedResponse[UniversityResponse],
    summary="查询院校列表",
)
async def list_universities(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
    page: int = 1,
    page_size: int = 20,
    country: str | None = None,
    city: str | None = None,
    is_featured: bool | None = None,
    search: str | None = None,
    program: str | None = None,
) -> PaginatedResponse[UniversityResponse]:
    """分页查询合作院校列表。

    支持按国家、城市、关键词和专业过滤。
    """
    params = PaginationParams(
        page=page, page_size=page_size
    )
    svc = UniversityService(session)
    universities, total = await svc.list_universities(
        params.offset,
        params.page_size,
        country,
        city,
        is_featured,
        search,
        program,
    )
    result = build_paginated(universities, total, params, UniversityResponse)
    seed = f"uni:list:{page}:{page_size}:{country}:{city}:{is_featured}:{search}:{program}:{total}"
    if set_cache_headers(response, seed, 3600, if_none_match):
        return response  # type: ignore[return-value]
    return result


@router.get(
    "/countries",
    response_model=list[str],
    summary="获取国家列表",
)
async def list_countries(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> list[str]:
    """获取所有院校的去重国家列表。"""
    svc = UniversityService(session)
    countries = await svc.get_distinct_countries()
    seed = f"uni:countries:{','.join(countries)}"
    if set_cache_headers(response, seed, 3600, if_none_match):
        return response  # type: ignore[return-value]
    return countries


@router.get(
    "/provinces",
    response_model=list[str],
    summary="获取省份列表",
)
async def list_provinces(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
    country: str | None = None,
) -> list[str]:
    """获取院校的去重省份列表，可按国家筛选。"""
    svc = UniversityService(session)
    provinces = await svc.get_distinct_provinces(country)
    seed = f"uni:provinces:{country}:{','.join(provinces)}"
    if set_cache_headers(response, seed, 3600, if_none_match):
        return response  # type: ignore[return-value]
    return provinces


@router.get(
    "/cities",
    response_model=list[str],
    summary="获取城市列表",
)
async def list_cities(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
    country: str | None = None,
) -> list[str]:
    """获取院校的去重城市列表，可按国家筛选。"""
    svc = UniversityService(session)
    cities = await svc.get_distinct_cities(country)
    seed = f"uni:cities:{country}:{','.join(cities)}"
    if set_cache_headers(response, seed, 3600, if_none_match):
        return response  # type: ignore[return-value]
    return cities


@router.get(
    "/detail/{university_id}",
    response_model=UniversityResponse,
    summary="获取院校详情",
)
async def get_university(
    university_id: str,
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> UniversityResponse:
    """获取院校详情。"""
    svc = UniversityService(session)
    university = await svc.get_university(university_id)
    result = UniversityResponse.model_validate(university)
    ts = university.updated_at.isoformat() if university.updated_at else ""
    seed = f"uni:{university_id}:{ts}"
    if set_cache_headers(response, seed, 3600, if_none_match):
        return response  # type: ignore[return-value]
    return result
