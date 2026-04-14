"""内容管理路由层。

提供文章和分类的管理员 API 端点。
"""

from fastapi import APIRouter, status

from api.core.dependencies import (
    CurrentUserId,
    DbSession,
)
from api.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    build_paginated,
)

from .schemas import (
    ArticleCreate,
    ArticleDeleteRequest,
    ArticleResponse,
    ArticleUpdate,
    CategoryCreate,
    CategoryDeleteRequest,
    CategoryResponse,
    CategoryUpdate,
)
from .service import ContentService

router = APIRouter(tags=["admin-content"])

category_router = APIRouter(
    prefix="/categories", tags=["admin-category"]
)

article_router = APIRouter(
    prefix="/articles", tags=["admin-articles"]
)


async def _category_list_with_counts(
    svc: ContentService,
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


@category_router.get(
    "/list",
    response_model=list[CategoryResponse],
    summary="查询分类列表",
)
async def admin_list_categories(
    session: DbSession,
) -> list[CategoryResponse]:
    """管理员查询分类列表。"""
    svc = ContentService(session)
    return await _category_list_with_counts(svc)


@category_router.post(
    "/list/create",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建分类",
)
async def admin_create_category(
    data: CategoryCreate, session: DbSession
) -> CategoryResponse:
    """管理员创建分类。"""
    svc = ContentService(session)
    category = await svc.create_category(data)
    return CategoryResponse.model_validate(category)


@category_router.post(
    "/list/detail/edit",
    response_model=CategoryResponse,
    summary="更新分类",
)
async def admin_update_category(
    data: CategoryUpdate,
    session: DbSession,
) -> CategoryResponse:
    """管理员更新分类。"""
    svc = ContentService(session)
    category = await svc.update_category(
        data.category_id, data
    )
    return CategoryResponse.model_validate(category)


@category_router.post(
    "/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除分类",
)
async def admin_delete_category(
    data: CategoryDeleteRequest, session: DbSession
) -> None:
    """管理员删除分类。"""
    svc = ContentService(session)
    await svc.delete_category(data.category_id)


@article_router.get(
    "/list",
    response_model=PaginatedResponse[ArticleResponse],
    summary="查询所有文章",
)
async def admin_list_articles(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
) -> PaginatedResponse[ArticleResponse]:
    """管理员分页查询所有文章。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = ContentService(session)
    articles, total = await svc.list_all_articles(
        params.offset, params.page_size, status_filter
    )
    return build_paginated(
        articles, total, params, ArticleResponse
    )


@article_router.post(
    "/list/create",
    response_model=ArticleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建文章",
)
async def admin_create_article(
    data: ArticleCreate,
    user_id: CurrentUserId,
    session: DbSession,
) -> ArticleResponse:
    """管理员创建文章。"""
    svc = ContentService(session)
    article = await svc.create_article(data, user_id)
    return ArticleResponse.model_validate(article)


@article_router.post(
    "/list/detail/edit",
    response_model=ArticleResponse,
    summary="更新文章",
)
async def admin_update_article(
    data: ArticleUpdate,
    session: DbSession,
) -> ArticleResponse:
    """管理员更新文章（发布/取消发布/置顶等）。"""
    svc = ContentService(session)
    article = await svc.update_article(
        data.article_id, data
    )
    return ArticleResponse.model_validate(article)


@article_router.post(
    "/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除文章",
)
async def admin_delete_article(
    data: ArticleDeleteRequest, session: DbSession
) -> None:
    """管理员删除文章。"""
    svc = ContentService(session)
    await svc.delete_article_admin(data.article_id)


# 挂载子路由到主路由
router.include_router(category_router)
router.include_router(article_router)
