"""成功案例管理路由层。

提供成功案例的管理员 API 端点。
"""

import io

from fastapi import APIRouter, File, UploadFile, status
from fastapi.responses import StreamingResponse

from api.core.dependencies import DbSession
from api.core.pagination import PaginatedResponse, PaginationParams

from .export_service import ExportService
from .import_service import ImportService
from .schemas import (
    CaseCreate,
    CaseDeleteRequest,
    CaseResponse,
    CaseUpdate,
)
from .service import CaseService

router = APIRouter(
    prefix="/cases", tags=["admin-cases"]
)


@router.get(
    "/list",
    response_model=PaginatedResponse[CaseResponse],
    summary="查询成功案例列表",
)
async def admin_list_cases(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[CaseResponse]:
    """管理员分页查询成功案例。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = CaseService(session)
    cases, total = await svc.list_cases(params.offset, params.page_size)
    total_pages = (total + params.page_size - 1) // params.page_size
    return PaginatedResponse(
        items=[CaseResponse.model_validate(c) for c in cases],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )


@router.post(
    "/list/create",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建成功案例",
)
async def admin_create_case(
    data: CaseCreate, session: DbSession
) -> CaseResponse:
    """管理员创建成功案例。"""
    svc = CaseService(session)
    case = await svc.create_case(data)
    return CaseResponse.model_validate(case)


@router.post(
    "/list/detail/edit",
    response_model=CaseResponse,
    summary="更新成功案例",
)
async def admin_update_case(
    data: CaseUpdate,
    session: DbSession,
) -> CaseResponse:
    """管理员更新成功案例。"""
    svc = CaseService(session)
    case = await svc.update_case(data.case_id, data)
    return CaseResponse.model_validate(case)


@router.post(
    "/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除成功案例",
)
async def admin_delete_case(
    data: CaseDeleteRequest, session: DbSession
) -> None:
    """管理员删除成功案例。"""
    svc = CaseService(session)
    await svc.delete_case(data.case_id)


@router.post(
    "/list/detail/upload-avatar",
    summary="上传学生照片",
)
async def upload_avatar(
    case_id: str,
    session: DbSession,
    file: UploadFile = File(...),
) -> dict:
    """上传或替换学生照片。"""
    svc = CaseService(session)
    image_id = await svc.upload_avatar(case_id, file)
    return {"image_id": image_id}


@router.post(
    "/list/detail/upload-offer",
    summary="上传录取通知书",
)
async def upload_offer(
    case_id: str,
    session: DbSession,
    file: UploadFile = File(...),
) -> dict:
    """上传或替换录取通知书图片。"""
    svc = CaseService(session)
    image_id = await svc.upload_offer(case_id, file)
    return {"image_id": image_id}


@router.post(
    "/list/import/preview",
    summary="批量导入预览",
)
async def import_preview(
    session: DbSession,
    file: UploadFile = File(...),
) -> dict:
    """上传 Excel/ZIP，解析校验并返回预览。"""
    svc = ImportService(session)
    return await svc.preview(file)


@router.post(
    "/list/import/confirm",
    summary="确认批量导入",
)
async def import_confirm(
    session: DbSession,
    file: UploadFile = File(...),
    items: str = "",
) -> dict:
    """确认并执行批量导入。

    前端需要重新上传原始文件 + 传递 items JSON 字符串。
    """
    import json

    items_list = json.loads(items) if items else []

    svc = ImportService(session)
    return await svc.confirm(file, items_list)


@router.get(
    "/list/import/template",
    summary="下载导入模板",
)
async def download_template(
    session: DbSession,
) -> StreamingResponse:
    """下载导入模板（ZIP 格式）。"""
    svc = ImportService(session)
    content = svc.generate_template()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="case_template.zip"'
        },
    )


@router.get(
    "/list/export",
    summary="导出所有成功案例",
)
async def export_cases(
    session: DbSession,
) -> StreamingResponse:
    """导出所有成功案例为 ZIP（包含 Excel + 图片）。"""
    svc = ExportService(session)
    content = await svc.export()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="cases_export.zip"'
        },
    )
