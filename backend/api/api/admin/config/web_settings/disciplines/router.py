"""学科分类管理接口。"""

from fastapi import APIRouter, File, UploadFile, status
from fastapi.responses import Response

from api.core.dependencies import DbSession

from .export_service import DisciplineExportService
from .import_service import DisciplineImportService
from .schemas import (
    CategoryCreate,
    CategoryDeleteRequest,
    CategoryResponse,
    CategoryUpdate,
    DisciplineCreate,
    DisciplineDeleteRequest,
    DisciplineImportConfirmRequest,
    DisciplineResponse,
    DisciplineUpdate,
)
from .service import DisciplineService

router = APIRouter(prefix="/disciplines", tags=["disciplines"])


@router.get(
    "/categories/list",
    response_model=list[CategoryResponse],
    summary="查询学科大分类列表",
)
async def list_categories(session: DbSession) -> list[CategoryResponse]:
    """查询所有学科大分类。"""
    svc = DisciplineService(session)
    categories = await svc.list_categories()
    return [CategoryResponse.model_validate(c) for c in categories]


@router.post(
    "/categories/list/create",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建学科大分类",
)
async def create_category(
    data: CategoryCreate, session: DbSession
) -> CategoryResponse:
    """创建学科大分类。"""
    svc = DisciplineService(session)
    category = await svc.create_category(data)
    return CategoryResponse.model_validate(category)


@router.post(
    "/categories/list/detail/edit",
    response_model=CategoryResponse,
    summary="编辑学科大分类",
)
async def update_category(
    data: CategoryUpdate, session: DbSession
) -> CategoryResponse:
    """编辑学科大分类。"""
    svc = DisciplineService(session)
    category = await svc.update_category(data)
    return CategoryResponse.model_validate(category)


@router.post(
    "/categories/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除学科大分类",
)
async def delete_category(
    data: CategoryDeleteRequest, session: DbSession
) -> None:
    """删除学科大分类。"""
    svc = DisciplineService(session)
    await svc.delete_category(data.category_id)


@router.get(
    "/list",
    response_model=list[DisciplineResponse],
    summary="查询学科列表",
)
async def list_disciplines(
    category_id: str | None = None, session: DbSession = DbSession
) -> list[DisciplineResponse]:
    """查询学科列表。可选按分类过滤。"""
    svc = DisciplineService(session)
    disciplines = await svc.list_disciplines(category_id)
    return [DisciplineResponse.model_validate(d) for d in disciplines]


@router.post(
    "/list/create",
    response_model=DisciplineResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建学科",
)
async def create_discipline(
    data: DisciplineCreate, session: DbSession
) -> DisciplineResponse:
    """创建学科。"""
    svc = DisciplineService(session)
    discipline = await svc.create_discipline(data)
    return DisciplineResponse.model_validate(discipline)


@router.post(
    "/list/detail/edit",
    response_model=DisciplineResponse,
    summary="编辑学科",
)
async def update_discipline(
    data: DisciplineUpdate, session: DbSession
) -> DisciplineResponse:
    """编辑学科。"""
    svc = DisciplineService(session)
    discipline = await svc.update_discipline(data)
    return DisciplineResponse.model_validate(discipline)


@router.post(
    "/list/detail/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除学科",
)
async def delete_discipline(
    data: DisciplineDeleteRequest, session: DbSession
) -> None:
    """删除学科。"""
    svc = DisciplineService(session)
    await svc.delete_discipline(data.discipline_id)


@router.get(
    "/import/template",
    summary="下载导入模板",
)
async def download_import_template(session: DbSession) -> Response:
    """下载学科分类导入模板 Excel 文件。"""
    svc = DisciplineImportService(session)
    content = svc.generate_template()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=discipline_import_template.xlsx"
        },
    )


@router.post(
    "/import/preview",
    summary="预览导入",
)
async def preview_import(
    file: UploadFile = File(...), session: DbSession = DbSession
) -> dict:
    """上传 Excel 文件并预览导入结果。"""
    content = await file.read()
    svc = DisciplineImportService(session)
    return await svc.preview(content)


@router.post(
    "/import/confirm",
    summary="确认导入",
)
async def confirm_import(
    data: DisciplineImportConfirmRequest, session: DbSession
) -> dict:
    """确认导入学科分类数据。"""
    svc = DisciplineImportService(session)
    return await svc.confirm(data.items)


@router.get(
    "/export",
    summary="导出学科分类",
)
async def export_disciplines(session: DbSession) -> Response:
    """导出所有学科分类为 Excel 文件。"""
    svc = DisciplineExportService(session)
    content = await svc.export_excel()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=disciplines_export.xlsx"
        },
    )
