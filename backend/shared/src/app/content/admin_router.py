"""内容领域管理员路由层。

提供文章和分类的管理员 API 端点。
"""

from fastapi import APIRouter, Depends, status

from app.content.router import _build_paginated, _category_list_with_counts
from app.content.schemas import (
    ArticleResponse,
    ArticleUpdate,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)
from app.content.service import ContentService
from app.core.dependencies import (
    DbSession,
    require_any_permission,
    require_permission,
)
from app.core.pagination import PaginatedResponse, PaginationParams

admin_router = APIRouter(
    prefix="/admin/content", tags=["admin-content"]
)


@admin_router.get(
    "/categories",
    response_model=list[CategoryResponse],
    dependencies=[
        Depends(require_permission("category:manage"))
    ],
)
async def admin_list_categories(
    session: DbSession,
) -> list[CategoryResponse]:
    """管理员查询分类列表。"""
    svc = ContentService(session)
    return await _category_list_with_counts(svc)


@admin_router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(require_permission("category:manage"))
    ],
)
async def admin_create_category(
    data: CategoryCreate, session: DbSession
) -> CategoryResponse:
    """管理员创建分类。"""
    svc = ContentService(session)
    category = await svc.create_category(data)
    return CategoryResponse.model_validate(category)


@admin_router.patch(
    "/categories/{category_id}",
    response_model=CategoryResponse,
    dependencies=[
        Depends(require_permission("category:manage"))
    ],
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


@admin_router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[
        Depends(require_permission("category:manage"))
    ],
)
async def admin_delete_category(
    category_id: str, session: DbSession
) -> None:
    """管理员删除分类。"""
    svc = ContentService(session)
    await svc.delete_category(category_id)


@admin_router.get(
    "/articles",
    response_model=PaginatedResponse[ArticleResponse],
    dependencies=[
        Depends(
            require_any_permission(
                "post:manage", "blog:manage"
            )
        )
    ],
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
    return _build_paginated(
        articles, total, params, ArticleResponse
    )


@admin_router.patch(
    "/articles/{article_id}",
    response_model=ArticleResponse,
    dependencies=[
        Depends(
            require_any_permission(
                "post:manage", "blog:manage"
            )
        )
    ],
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


@admin_router.delete(
    "/articles/{article_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[
        Depends(
            require_any_permission(
                "post:manage", "blog:manage"
            )
        )
    ],
)
async def admin_delete_article(
    article_id: str, session: DbSession
) -> None:
    """管理员删除文章。"""
    svc = ContentService(session)
    await svc.delete_article_admin(article_id)
