"""Portal 文档领域路由层。

提供文件上传、查询、下载、删除等 API 端点。
"""

from fastapi import APIRouter, UploadFile, status
from fastapi.responses import JSONResponse

from api.core.dependencies import CurrentUserId, DbSession
from api.core.pagination import PaginationParams
from app.db.document import repository
from app.db.document.models import DocumentCategory
from app.db.user import repository as user_repo

from .schemas import DocumentListResponse, DocumentResponse
from .service import (
    delete_document,
    get_document,
    list_documents,
    upload_document,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="上传文件",
)
async def upload_document_endpoint(
    file: UploadFile,
    user_id: CurrentUserId,
    session: DbSession,
    category: DocumentCategory = DocumentCategory.OTHER,
) -> DocumentResponse:
    """上传文件。"""
    doc = await upload_document(
        session, user_id, file, category
    )
    return DocumentResponse.model_validate(doc)


@router.get("/list", response_model=DocumentListResponse, summary="查询文档列表")
async def list_documents_endpoint(
    user_id: CurrentUserId,
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> DocumentListResponse:
    """分页查询当前用户的文档列表。"""
    params = PaginationParams(page=page, page_size=page_size)
    docs, total = await list_documents(
        session, user_id, params.offset, params.page_size
    )
    total_pages = (total + params.page_size - 1) // params.page_size

    # 查询存储用量和配额
    storage_used = await repository.get_user_storage_used(
        session, user_id
    )
    user = await user_repo.get_by_id(session, user_id)
    storage_quota = user.storage_quota if user else 0

    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
        storage_used=storage_used,
        storage_quota=storage_quota,
    )


@router.get("/detail/{doc_id}", response_model=DocumentResponse, summary="获取文档详情")
async def get_document_endpoint(
    doc_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> DocumentResponse:
    """获取文档详情。"""
    doc = await get_document(session, doc_id, user_id)
    return DocumentResponse.model_validate(doc)


@router.get("/download/{doc_id}", summary="下载文档")
async def download_document(
    doc_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> JSONResponse:
    """下载文档文件流。"""
    # TODO: Task 12 - BYTEA migration
    return JSONResponse(
        status_code=501,
        content={"detail": "文件下载功能待 BYTEA 迁移后实现"},
    )


@router.post(
    "/delete/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除文档",
)
async def delete_document_endpoint(
    doc_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> None:
    """删除文档。"""
    await delete_document(session, doc_id, user_id)
