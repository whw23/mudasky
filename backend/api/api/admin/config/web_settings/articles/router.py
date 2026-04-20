"""文章管理路由层。

提供文章的管理员 API 端点。
"""

from fastapi import APIRouter, File, UploadFile, status

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
)
from .service import ArticleService

router = APIRouter(
    prefix="/articles", tags=["admin-articles"]
)


@router.get(
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
    svc = ArticleService(session)
    articles, total = await svc.list_all_articles(
        params.offset, params.page_size, status_filter
    )
    return build_paginated(
        articles, total, params, ArticleResponse
    )


@router.post(
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
    svc = ArticleService(session)
    article = await svc.create_article(data, user_id)
    return ArticleResponse.model_validate(article)


@router.post(
    "/list/detail/edit",
    response_model=ArticleResponse,
    summary="更新文章",
)
async def admin_update_article(
    data: ArticleUpdate,
    session: DbSession,
) -> ArticleResponse:
    """管理员更新文章（发布/取消发布/置顶等）。"""
    svc = ArticleService(session)
    article = await svc.update_article(
        data.article_id, data
    )
    return ArticleResponse.model_validate(article)


@router.post(
    "/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除文章",
)
async def admin_delete_article(
    data: ArticleDeleteRequest, session: DbSession
) -> None:
    """管理员删除文章。"""
    svc = ArticleService(session)
    await svc.delete_article_admin(data.article_id)


@router.post(
    "/list/detail/upload-pdf",
    summary="上传文章 PDF",
)
async def upload_pdf(
    article_id: str,
    session: DbSession,
    file: UploadFile = File(...),
) -> dict:
    """上传 PDF 文件并关联到文章。"""
    svc = ArticleService(session)
    file_id = await svc.upload_pdf(article_id, file)
    return {"file_id": file_id}
