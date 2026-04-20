"""学科分类管理接口。"""

from fastapi import APIRouter, status

from api.core.dependencies import DbSession

from .schemas import (
    CategoryCreate,
    CategoryDeleteRequest,
    CategoryResponse,
    CategoryUpdate,
    DisciplineCreate,
    DisciplineDeleteRequest,
    DisciplineResponse,
    DisciplineUpdate,
)
from .service import DisciplineService

router = APIRouter(prefix="/disciplines", tags=["disciplines"])


@router.get(
    "/categories/list",
    response_model=list[CategoryResponse],
    summary="查询学科大分类列表",
)
async def list_categories(session: DbSession) -> list[CategoryResponse]:
    """查询所有学科大分类。"""
    svc = DisciplineService(session)
    categories = await svc.list_categories()
    return [CategoryResponse.model_validate(c) for c in categories]


@router.post(
    "/categories/list/create",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建学科大分类",
)
async def create_category(
    data: CategoryCreate, session: DbSession
) -> CategoryResponse:
    """创建学科大分类。"""
    svc = DisciplineService(session)
    category = await svc.create_category(data)
    return CategoryResponse.model_validate(category)


@router.post(
    "/categories/list/detail/edit",
    response_model=CategoryResponse,
    summary="编辑学科大分类",
)
async def update_category(
    data: CategoryUpdate, session: DbSession
) -> CategoryResponse:
    """编辑学科大分类。"""
    svc = DisciplineService(session)
    category = await svc.update_category(data)
    return CategoryResponse.model_validate(category)


@router.post(
    "/categories/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除学科大分类",
)
async def delete_category(
    data: CategoryDeleteRequest, session: DbSession
) -> None:
    """删除学科大分类。"""
    svc = DisciplineService(session)
    await svc.delete_category(data.category_id)


@router.get(
    "/list",
    response_model=list[DisciplineResponse],
    summary="查询学科列表",
)
async def list_disciplines(
    category_id: str | None = None, session: DbSession = DbSession
) -> list[DisciplineResponse]:
    """查询学科列表。可选按分类过滤。"""
    svc = DisciplineService(session)
    disciplines = await svc.list_disciplines(category_id)
    return [DisciplineResponse.model_validate(d) for d in disciplines]


@router.post(
    "/list/create",
    response_model=DisciplineResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建学科",
)
async def create_discipline(
    data: DisciplineCreate, session: DbSession
) -> DisciplineResponse:
    """创建学科。"""
    svc = DisciplineService(session)
    discipline = await svc.create_discipline(data)
    return DisciplineResponse.model_validate(discipline)


@router.post(
    "/list/detail/edit",
    response_model=DisciplineResponse,
    summary="编辑学科",
)
async def update_discipline(
    data: DisciplineUpdate, session: DbSession
) -> DisciplineResponse:
    """编辑学科。"""
    svc = DisciplineService(session)
    discipline = await svc.update_discipline(data)
    return DisciplineResponse.model_validate(discipline)


@router.post(
    "/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除学科",
)
async def delete_discipline(
    data: DisciplineDeleteRequest, session: DbSession
) -> None:
    """删除学科。"""
    svc = DisciplineService(session)
    await svc.delete_discipline(data.discipline_id)
