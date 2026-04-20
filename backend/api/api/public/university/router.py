"""合作院校公开路由层。"""

from fastapi import APIRouter, Header, Response

from .schemas import CaseBrief, DisciplineItem, UniversityResponse
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
    discipline_category_id: str | None = None,
    discipline_id: str | None = None,
) -> PaginatedResponse[UniversityResponse]:
    """分页查询合作院校列表。

    支持按国家、城市、关键词、专业和学科过滤。
    """
    params = PaginationParams(
        page=page, page_size=page_size
    )
    svc = UniversityService(session)
    universities, total = await svc.filter_universities_by_discipline(
        params.offset,
        params.page_size,
        discipline_category_id,
        discipline_id,
        country,
        city,
        is_featured,
        search,
        program,
    )
    result = build_paginated(universities, total, params, UniversityResponse)
    seed = f"uni:list:{page}:{page_size}:{country}:{city}:{is_featured}:{search}:{program}:{discipline_category_id}:{discipline_id}:{total}"
    if set_cache_headers(response, seed, 0, if_none_match):
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
    """获取院校详情，包含学科、图片集、关联案例。"""
    svc = UniversityService(session)
    detail = await svc.get_university_detail(university_id)
    uni = detail["university"]
    result = UniversityResponse(
        id=uni.id,
        name=uni.name,
        name_en=uni.name_en,
        country=uni.country,
        province=uni.province,
        city=uni.city,
        logo_url=uni.logo_url,
        description=uni.description,
        programs=uni.programs or [],
        website=uni.website,
        is_featured=uni.is_featured,
        sort_order=uni.sort_order,
        created_at=uni.created_at,
        updated_at=uni.updated_at,
        logo_image_id=uni.logo_image_id,
        admission_requirements=uni.admission_requirements,
        scholarship_info=uni.scholarship_info,
        qs_rankings=uni.qs_rankings,
        latitude=uni.latitude,
        longitude=uni.longitude,
        image_ids=detail["image_ids"],
        disciplines=[
            DisciplineItem(**d) for d in detail["disciplines"]
        ],
        related_cases=[
            CaseBrief(
                id=c.id,
                student_name=c.student_name,
                program=c.program,
                year=c.year,
                avatar_image_id=getattr(c, "avatar_image_id", None),
            )
            for c in detail["related_cases"]
        ],
    )
    ts = uni.updated_at.isoformat() if uni.updated_at else ""
    seed = f"uni:{university_id}:{ts}"
    if set_cache_headers(response, seed, 3600, if_none_match):
        return response  # type: ignore[return-value]
    return result
