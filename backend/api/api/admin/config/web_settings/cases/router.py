"""成功案例管理路由层。

提供成功案例的管理员 API 端点。
"""

from fastapi import APIRouter, File, UploadFile, status

from api.core.dependencies import DbSession
from api.core.pagination import PaginatedResponse, PaginationParams

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
