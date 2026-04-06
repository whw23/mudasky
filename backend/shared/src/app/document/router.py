"""文档领域路由层。

提供文件上传、查询、删除等 API 端点。
"""

from fastapi import APIRouter, UploadFile, status

from app.core.dependencies import CurrentUserId, DbSession
from app.core.pagination import PaginatedResponse, PaginationParams
from app.document.schemas import DocumentResponse
from app.document.service import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: UploadFile,
    user_id: CurrentUserId,
    session: DbSession,
) -> DocumentResponse:
    """上传文件。"""
    data = await file.read()
    svc = DocumentService(session)
    doc = await svc.upload(
        user_id=user_id,
        file_name=file.filename or "untitled",
        mime_type=file.content_type or "application/octet-stream",
        data=data,
    )
    return DocumentResponse.model_validate(doc)


@router.get("", response_model=PaginatedResponse[DocumentResponse])
async def list_documents(
    user_id: CurrentUserId,
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[DocumentResponse]:
    """分页查询当前用户的文档列表。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = DocumentService(session)
    docs, total = await svc.list_user_documents(
        user_id, params.offset, params.page_size
    )
    total_pages = (total + params.page_size - 1) // params.page_size
    return PaginatedResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> DocumentResponse:
    """获取文档详情。"""
    svc = DocumentService(session)
    doc = await svc.get_document(doc_id)
    return DocumentResponse.model_validate(doc)


@router.delete(
    "/{doc_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_document(
    doc_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> None:
    """删除文档。"""
    svc = DocumentService(session)
    await svc.delete_document(doc_id, user_id)
