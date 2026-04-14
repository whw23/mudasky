"""Portal 文档领域路由层。

提供文件上传、查询、下载、删除等 API 端点。
"""

from fastapi import APIRouter, Query, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

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


class DeleteDocumentBody(BaseModel):
    """删除文档请求体。"""

    doc_id: str = Field(..., description="文档 ID")


@router.get(
    "/list",
    response_model=DocumentListResponse,
    summary="查询文档列表",
)
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


@router.post(
    "/list/upload",
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


@router.get(
    "/list/detail",
    response_model=DocumentResponse,
    summary="获取文档详情",
)
async def get_document_endpoint(
    user_id: CurrentUserId,
    session: DbSession,
    doc_id: str = Query(..., description="文档 ID"),
) -> DocumentResponse:
    """获取文档详情。"""
    doc = await get_document(session, doc_id, user_id)
    return DocumentResponse.model_validate(doc)


@router.get("/list/detail/download", summary="下载文档")
async def download_document(
    user_id: CurrentUserId,
    session: DbSession,
    doc_id: str = Query(..., description="文档 ID"),
) -> Response:
    """从数据库读取文件二进制数据并返回。"""
    doc = await get_document(session, doc_id, user_id)
    return Response(
        content=doc.file_data,
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{doc.original_name}"'
            ),
        },
    )


@router.post(
    "/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除文档",
)
async def delete_document_endpoint(
    data: DeleteDocumentBody,
    user_id: CurrentUserId,
    session: DbSession,
) -> None:
    """删除文档。"""
    await delete_document(session, data.doc_id, user_id)
