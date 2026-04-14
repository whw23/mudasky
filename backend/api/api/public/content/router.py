"""内容领域公开路由层。"""

from fastapi import APIRouter, Header, Response

from .schemas import ArticleResponse, CategoryResponse
from .service import ContentService
from api.core.cache import set_cache_headers
from api.core.dependencies import DbSession
from api.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    build_paginated,
)

router = APIRouter(prefix="/content", tags=["content"])


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


@router.get(
    "/articles",
    response_model=PaginatedResponse[ArticleResponse],
    summary="分页查询已发布文章",
)
async def list_published_articles(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
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
    result = build_paginated(
        articles, total, params, ArticleResponse
    )
    seed = f"article:list:{page}:{page_size}:{category_id}:{total}"
    if set_cache_headers(response, seed, 600, if_none_match):
        return response  # type: ignore[return-value]
    return result


@router.get(
    "/article/{article_id}",
    response_model=ArticleResponse,
    summary="获取已发布文章详情",
)
async def get_published_article(
    article_id: str,
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> ArticleResponse:
    """获取已发布文章详情。"""
    svc = ContentService(session)
    article = await svc.get_article(article_id)
    if article.status != "published":
        from app.core.exceptions import NotFoundException

        raise NotFoundException(message="文章不存在", code="ARTICLE_NOT_FOUND")
    result = ArticleResponse.model_validate(article)
    ts = article.updated_at.isoformat() if article.updated_at else ""
    seed = f"article:{article_id}:{ts}"
    if set_cache_headers(response, seed, 600, if_none_match):
        return response  # type: ignore[return-value]
    return result


@router.get(
    "/categories",
    response_model=list[CategoryResponse],
    summary="查询所有分类",
)
async def list_categories(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> list[CategoryResponse]:
    """查询所有分类。"""
    svc = ContentService(session)
    categories = await _category_list_with_counts(svc)
    seed = f"categories:{len(categories)}:{','.join(c.id for c in categories)}"
    if set_cache_headers(response, seed, 3600, if_none_match):
        return response  # type: ignore[return-value]
    return categories
