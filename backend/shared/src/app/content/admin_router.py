"""内容领域管理员路由层。

提供文章和分类的管理员 API 端点。
"""

from fastapi import APIRouter, status

from app.content.router import _category_list_with_counts
from app.content.schemas import (
    ArticleCreate,
    ArticleResponse,
    ArticleUpdate,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)
from app.content.service import ContentService
from app.core.dependencies import (
    CurrentUserId,
    DbSession,
)
from app.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    build_paginated,
)

admin_category_router = APIRouter(
    prefix="/admin/categories", tags=["admin-category"]
)

admin_content_router = APIRouter(
    prefix="/admin/content", tags=["admin-content"]
)


@admin_category_router.get(
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


@admin_category_router.post(
    "/create",
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


@admin_category_router.post(
    "/edit/{category_id}",
    response_model=CategoryResponse,
    summary="更新分类",
)
async def admin_update_category(
    category_id: str,
    data: CategoryUpdate,
    session: DbSession,
) -> CategoryResponse:
    """管理员更新分类。"""
    svc = ContentService(session)
    category = await svc.update_category(category_id, data)
    return CategoryResponse.model_validate(category)


@admin_category_router.post(
    "/delete/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除分类",
)
async def admin_delete_category(
    category_id: str, session: DbSession
) -> None:
    """管理员删除分类。"""
    svc = ContentService(session)
    await svc.delete_category(category_id)


@admin_content_router.get(
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


@admin_content_router.post(
    "/create",
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


@admin_content_router.post(
    "/edit/{article_id}",
    response_model=ArticleResponse,
    summary="更新文章",
)
async def admin_update_article(
    article_id: str,
    data: ArticleUpdate,
    session: DbSession,
) -> ArticleResponse:
    """管理员更新文章（发布/取消发布/置顶等）。"""
    svc = ContentService(session)
    article = await svc.update_article(article_id, data)
    return ArticleResponse.model_validate(article)


@admin_content_router.post(
    "/delete/{article_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除文章",
)
async def admin_delete_article(
    article_id: str, session: DbSession
) -> None:
    """管理员删除文章。"""
    svc = ContentService(session)
    await svc.delete_article_admin(article_id)
