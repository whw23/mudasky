"""文档领域路由层。

提供文件上传、查询、下载、删除等 API 端点。
"""

from fastapi import APIRouter, UploadFile, status
from fastapi.responses import FileResponse

from app.core.dependencies import CurrentUserId, DbSession
from app.core.pagination import PaginationParams
from app.core.storage import get_file_path
from app.document import repository, service
from app.document.models import DocumentCategory
from app.document.schemas import DocumentListResponse, DocumentResponse
from app.user import repository as user_repo

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: UploadFile,
    user_id: CurrentUserId,
    session: DbSession,
    category: DocumentCategory = DocumentCategory.OTHER,
) -> DocumentResponse:
    """上传文件。"""
    doc = await service.upload_document(
        session, user_id, file, category
    )
    return DocumentResponse.model_validate(doc)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    user_id: CurrentUserId,
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> DocumentListResponse:
    """分页查询当前用户的文档列表。"""
    params = PaginationParams(page=page, page_size=page_size)
    docs, total = await service.list_documents(
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


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> DocumentResponse:
    """获取文档详情。"""
    doc = await service.get_document(session, doc_id, user_id)
    return DocumentResponse.model_validate(doc)


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> FileResponse:
    """下载文档文件流。"""
    doc = await service.get_document(session, doc_id, user_id)
    absolute_path = get_file_path(doc.file_path)
    return FileResponse(
        path=str(absolute_path),
        filename=doc.original_name,
        media_type=doc.mime_type,
    )


@router.delete(
    "/{doc_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_document(
    doc_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> None:
    """删除文档。"""
    await service.delete_document(session, doc_id, user_id)
