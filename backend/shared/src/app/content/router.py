"""内容领域路由层。

提供文章和分类的公开、用户 API 端点。
"""

from fastapi import APIRouter, Header, Response, status

from app.content.schemas import (
    ArticleCreate,
    ArticleResponse,
    ArticleUpdate,
    CategoryResponse,
)
from app.content.service import ContentService
from app.core.cache import set_cache_headers
from app.core.dependencies import (
    CurrentUserId,
    DbSession,
)
from app.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    build_paginated,
)

public_content_router = APIRouter(
    prefix="/public/content", tags=["content"]
)

portal_article_router = APIRouter(
    prefix="/portal/article", tags=["portal-article"]
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


# ---- 公开端点 ----


@public_content_router.get(
    "/articles",
    response_model=PaginatedResponse[ArticleResponse],
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


@public_content_router.get(
    "/article/{article_id}",
    response_model=ArticleResponse,
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

        raise NotFoundException(message="文章不存在")
    result = ArticleResponse.model_validate(article)
    ts = article.updated_at.isoformat() if article.updated_at else ""
    seed = f"article:{article_id}:{ts}"
    if set_cache_headers(response, seed, 600, if_none_match):
        return response  # type: ignore[return-value]
    return result


@public_content_router.get(
    "/categories",
    response_model=list[CategoryResponse],
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


# ---- 用户端点（Portal） ----


@portal_article_router.get(
    "/list",
    response_model=PaginatedResponse[ArticleResponse],
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
    return build_paginated(
        articles, total, params, ArticleResponse
    )


@portal_article_router.post(
    "/create",
    response_model=ArticleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_article(
    data: ArticleCreate,
    user_id: CurrentUserId,
    session: DbSession,
) -> ArticleResponse:
    """创建文章。"""
    svc = ContentService(session)
    article = await svc.create_article(data, user_id)
    return ArticleResponse.model_validate(article)


@portal_article_router.post(
    "/edit/{article_id}",
    response_model=ArticleResponse,
)
async def update_own_article(
    article_id: str,
    data: ArticleUpdate,
    user_id: CurrentUserId,
    session: DbSession,
) -> ArticleResponse:
    """更新自己的文章。"""
    svc = ContentService(session)
    article = await svc.update_own_article(
        article_id, data, user_id
    )
    return ArticleResponse.model_validate(article)


@portal_article_router.post(
    "/delete/{article_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_own_article(
    article_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> None:
    """删除自己的文章。"""
    svc = ContentService(session)
    await svc.delete_own_article(article_id, user_id)
