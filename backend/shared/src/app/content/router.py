"""内容领域路由层。

提供文章发布、分类管理、审核流程等 API 端点。
"""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.content.schemas import (
    ArticleCreate,
    ArticleResponse,
    ArticleUpdate,
    CategoryCreate,
    CategoryResponse,
)
from app.content.service import ContentService
from app.core.dependencies import (
    CurrentUserId,
    CurrentUserRole,
    DbSession,
    require_role,
)
from app.core.pagination import PaginatedResponse, PaginationParams

router = APIRouter(prefix="/content", tags=["content"])


class ReviewBody(BaseModel):
    """审核请求体。"""

    approved: bool = Field(..., description="是否通过审核")


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


# ---- 公开端点（无需认证） ----


@router.get(
    "/articles",
    response_model=PaginatedResponse[ArticleResponse],
)
async def list_published_articles(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
    category_id: str | None = None,
) -> PaginatedResponse[ArticleResponse]:
    """分页查询已发布文章。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = ContentService(session)
    articles, total = await svc.list_published(
        params.offset, params.page_size, category_id
    )
    return _build_paginated(
        articles, total, params, ArticleResponse
    )


@router.get(
    "/articles/{article_id}",
    response_model=ArticleResponse,
)
async def get_published_article(
    article_id: str, session: DbSession
) -> ArticleResponse:
    """获取已发布文章详情。"""
    svc = ContentService(session)
    article = await svc.get_article(article_id)
    if article.status != "published":
        from app.core.exceptions import NotFoundException

        raise NotFoundException(message="文章不存在")
    return ArticleResponse.model_validate(article)


@router.get(
    "/categories",
    response_model=list[CategoryResponse],
)
async def list_categories(
    session: DbSession,
) -> list[CategoryResponse]:
    """查询所有分类。"""
    svc = ContentService(session)
    categories = await svc.list_categories()
    return [
        CategoryResponse.model_validate(c) for c in categories
    ]


# ---- 需要认证的端点 ----


@router.post(
    "",
    response_model=ArticleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_article(
    data: ArticleCreate,
    user_id: CurrentUserId,
    role: CurrentUserRole,
    session: DbSession,
) -> ArticleResponse:
    """创建文章。"""
    svc = ContentService(session)
    article = await svc.create_article(data, user_id, role)
    return ArticleResponse.model_validate(article)


@router.patch(
    "/{article_id}", response_model=ArticleResponse
)
async def update_article(
    article_id: str,
    data: ArticleUpdate,
    user_id: CurrentUserId,
    role: CurrentUserRole,
    session: DbSession,
) -> ArticleResponse:
    """更新文章。"""
    svc = ContentService(session)
    article = await svc.update_article(
        article_id, data, user_id, role
    )
    return ArticleResponse.model_validate(article)


@router.delete(
    "/{article_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_article(
    article_id: str,
    user_id: CurrentUserId,
    role: CurrentUserRole,
    session: DbSession,
) -> None:
    """删除文章。"""
    svc = ContentService(session)
    await svc.delete_article(article_id, user_id, role)


@router.get(
    "/my", response_model=PaginatedResponse[ArticleResponse]
)
async def list_my_articles(
    user_id: CurrentUserId,
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[ArticleResponse]:
    """分页查询当前用户的文章。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = ContentService(session)
    articles, total = await svc.list_my_articles(
        user_id, params.offset, params.page_size
    )
    return _build_paginated(
        articles, total, params, ArticleResponse
    )


@router.post(
    "/{article_id}/submit",
    response_model=ArticleResponse,
)
async def submit_for_review(
    article_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> ArticleResponse:
    """提交文章审核。"""
    svc = ContentService(session)
    article = await svc.submit_for_review(article_id, user_id)
    return ArticleResponse.model_validate(article)


# ---- 管理员端点 ----


@router.get(
    "/pending",
    response_model=PaginatedResponse[ArticleResponse],
    dependencies=[Depends(require_role("admin"))],
)
async def list_pending_articles(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[ArticleResponse]:
    """分页查询待审核文章（仅管理员）。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = ContentService(session)
    articles, total = await svc.list_pending(
        params.offset, params.page_size
    )
    return _build_paginated(
        articles, total, params, ArticleResponse
    )


@router.post(
    "/{article_id}/review",
    response_model=ArticleResponse,
    dependencies=[Depends(require_role("admin"))],
)
async def review_article(
    article_id: str,
    body: ReviewBody,
    session: DbSession,
) -> ArticleResponse:
    """审核文章（仅管理员）。"""
    svc = ContentService(session)
    article = await svc.review_article(
        article_id, body.approved
    )
    return ArticleResponse.model_validate(article)


@router.post(
    "/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
)
async def create_category(
    data: CategoryCreate, session: DbSession
) -> CategoryResponse:
    """创建分类（仅管理员）。"""
    svc = ContentService(session)
    category = await svc.create_category(data)
    return CategoryResponse.model_validate(category)
