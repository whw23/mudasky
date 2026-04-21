"""分类管理路由层。

提供分类的管理员 API 端点。
"""

from fastapi import APIRouter, status

from api.core.dependencies import DbSession

from .schemas import (
    CategoryCreate,
    CategoryDeleteRequest,
    CategoryResponse,
    CategoryUpdate,
)
from .service import CategoryService

router = APIRouter(
    prefix="/categories", tags=["admin-category"]
)
router.label = "分类管理"


async def _category_list_with_counts(
    svc: CategoryService,
) -> list[CategoryResponse]:
    """查询分类列表并附带文章计数。"""
    categories = await svc.list_categories()
    counts = await svc.get_article_counts_by_category()
    result: list[CategoryResponse] = []
    for c in categories:
        resp = CategoryResponse.model_validate(c)
        resp.article_count = counts.get(c.id, 0)
        result.append(resp)
    return result


@router.get(
    "/list",
    response_model=list[CategoryResponse],
    summary="查询分类列表",
)
async def admin_list_categories(
    session: DbSession,
) -> list[CategoryResponse]:
    """管理员查询分类列表。"""
    svc = CategoryService(session)
    return await _category_list_with_counts(svc)


@router.post(
    "/list/create",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建分类",
)
async def admin_create_category(
    data: CategoryCreate, session: DbSession
) -> CategoryResponse:
    """管理员创建分类。"""
    svc = CategoryService(session)
    category = await svc.create_category(data)
    return CategoryResponse.model_validate(category)


@router.post(
    "/list/detail/edit",
    response_model=CategoryResponse,
    summary="更新分类",
)
async def admin_update_category(
    data: CategoryUpdate,
    session: DbSession,
) -> CategoryResponse:
    """管理员更新分类。"""
    svc = CategoryService(session)
    category = await svc.update_category(
        data.category_id, data
    )
    return CategoryResponse.model_validate(category)


@router.post(
    "/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除分类",
)
async def admin_delete_category(
    data: CategoryDeleteRequest, session: DbSession
) -> None:
    """管理员删除分类。"""
    svc = CategoryService(session)
    await svc.delete_category(data.category_id)
