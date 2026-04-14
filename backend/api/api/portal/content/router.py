"""Portal 内容领域路由层。

提供用户自己的文章管理 API 端点。
"""

from fastapi import APIRouter, status

from api.core.dependencies import CurrentUserId, DbSession
from api.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    build_paginated,
)

from .schemas import (
    ArticleCreate,
    ArticleResponse,
    ArticleUpdate,
)
from .service import ContentService

router = APIRouter(prefix="/articles", tags=["portal-article"])


@router.get(
    "/list",
    response_model=PaginatedResponse[ArticleResponse],
    summary="分页查询当前用户文章",
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


@router.post(
    "/create",
    response_model=ArticleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建文章",
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


@router.post(
    "/edit/{article_id}",
    response_model=ArticleResponse,
    summary="更新文章",
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


@router.post(
    "/delete/{article_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除文章",
)
async def delete_own_article(
    article_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> None:
    """删除自己的文章。"""
    svc = ContentService(session)
    await svc.delete_own_article(article_id, user_id)
