"""合作院校管理路由层。

提供院校的管理员 API 端点。
"""

import io

from fastapi import APIRouter, File, UploadFile, status
from fastapi.responses import StreamingResponse

from api.core.dependencies import DbSession
from api.core.pagination import (
    PaginatedResponse,
    PaginationParams,
)
from app.db.image import repository as image_repo

from .export_service import ExportService
from .import_service import ImportService
from .schemas import (
    ImageResponse,
    SetProgramsRequest,
    UniversityCreate,
    UniversityDeleteRequest,
    UniversityImageDeleteRequest,
    UniversityResponse,
    UniversityUpdate,
)
from .service import UniversityService

router = APIRouter(
    prefix="/universities",
    tags=["admin-universities"],
)
router.label = "院校管理"


@router.get(
    "/list",
    response_model=PaginatedResponse[UniversityResponse],
    summary="管理员查询院校列表",
)
async def admin_list_universities(
    session: DbSession,
    page_size: int = 100,
) -> PaginatedResponse[UniversityResponse]:
    """管理员获取院校列表。"""
    svc = UniversityService(session)
    universities, total = await svc.list_universities(0, page_size)
    return PaginatedResponse(
        items=[UniversityResponse(**u) for u in universities],
        total=total,
        page=1,
        page_size=page_size,
        total_pages=1,
    )


@router.post(
    "/list/create",
    response_model=UniversityResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建院校",
)
async def admin_create_university(
    data: UniversityCreate, session: DbSession
) -> UniversityResponse:
    """管理员创建院校。"""
    svc = UniversityService(session)
    university = await svc.create_university(data)
    return UniversityResponse.model_validate(university)


@router.post(
    "/list/detail/edit",
    response_model=UniversityResponse,
    summary="更新院校",
)
async def admin_update_university(
    data: UniversityUpdate,
    session: DbSession,
) -> UniversityResponse:
    """管理员更新院校。"""
    svc = UniversityService(session)
    university = await svc.update_university(
        data.university_id, data
    )
    return UniversityResponse.model_validate(university)


@router.post(
    "/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除院校",
)
async def admin_delete_university(
    data: UniversityDeleteRequest, session: DbSession
) -> None:
    """管理员删除院校。"""
    svc = UniversityService(session)
    await svc.delete_university(data.university_id)


@router.post(
    "/list/detail/upload-logo",
    response_model=ImageResponse,
    summary="上传院校校徽",
)
async def upload_logo(
    university_id: str,
    session: DbSession,
    file: UploadFile = File(...),
) -> ImageResponse:
    """上传或替换院校校徽。"""
    svc = UniversityService(session)
    image_id = await svc.upload_logo(university_id, file)
    image = await image_repo.get_by_id(session, image_id)
    return ImageResponse.model_validate(image)


@router.post(
    "/list/detail/upload-image",
    status_code=status.HTTP_201_CREATED,
    summary="上传院校图片",
)
async def upload_image(
    university_id: str,
    session: DbSession,
    file: UploadFile = File(...),
) -> dict:
    """上传院校图片（最多 5 张）。"""
    svc = UniversityService(session)
    uni_image = await svc.upload_image(university_id, file)
    return {
        "id": uni_image.id,
        "image_id": uni_image.image_id,
        "sort_order": uni_image.sort_order,
    }


@router.post(
    "/list/detail/delete-image",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除院校图片",
)
async def delete_image(
    data: UniversityImageDeleteRequest,
    session: DbSession,
) -> None:
    """删除院校图片。"""
    svc = UniversityService(session)
    await svc.delete_image(data.university_id, data.image_record_id)


@router.post(
    "/list/detail/programs",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="设置院校专业",
)
async def set_programs(
    data: SetProgramsRequest,
    session: DbSession,
) -> None:
    """设置院校专业（全量覆盖）。"""
    svc = UniversityService(session)
    await svc.set_programs(data.university_id, data.programs)


@router.post(
    "/list/import/preview",
    summary="批量导入预览",
)
async def import_preview(
    session: DbSession,
    file: UploadFile = File(...),
) -> dict:
    """上传 Excel/zip，解析校验并返回预览。"""
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
    discipline_actions: str = "",
) -> dict:
    """确认并执行批量导入。

    前端需要重新上传原始文件 + 传递 items 和 discipline_actions JSON 字符串。
    """
    import json

    items_list = json.loads(items) if items else []
    actions_list = json.loads(discipline_actions) if discipline_actions else []

    svc = ImportService(session)
    return await svc.confirm(file, items_list, actions_list)


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
            "Content-Disposition": 'attachment; filename="university_template.zip"'
        },
    )


@router.get(
    "/list/export",
    summary="导出所有院校",
)
async def export_universities(
    session: DbSession,
) -> StreamingResponse:
    """导出所有院校为 ZIP（包含 Excel + 图片）。"""
    svc = ExportService(session)
    content = await svc.export()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="universities_export.zip"'
        },
    )
