"""成功案例领域管理员路由层。

提供成功案例的管理员 API 端点。
"""

from fastapi import APIRouter, Depends, status

from app.case.schemas import CaseCreate, CaseResponse, CaseUpdate
from app.case.service import CaseService
from app.core.dependencies import DbSession, require_permission
from app.core.pagination import PaginatedResponse, PaginationParams

admin_router = APIRouter(
    prefix="/admin/cases", tags=["admin-cases"]
)


@admin_router.get(
    "",
    response_model=PaginatedResponse[CaseResponse],
    dependencies=[
        Depends(require_permission("admin.case.*"))
    ],
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


@admin_router.post(
    "",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(require_permission("admin.case.create"))
    ],
)
async def admin_create_case(
    data: CaseCreate, session: DbSession
) -> CaseResponse:
    """管理员创建成功案例。"""
    svc = CaseService(session)
    case = await svc.create_case(data)
    return CaseResponse.model_validate(case)


@admin_router.patch(
    "/{case_id}",
    response_model=CaseResponse,
    dependencies=[
        Depends(require_permission("admin.case.edit"))
    ],
)
async def admin_update_case(
    case_id: str,
    data: CaseUpdate,
    session: DbSession,
) -> CaseResponse:
    """管理员更新成功案例。"""
    svc = CaseService(session)
    case = await svc.update_case(case_id, data)
    return CaseResponse.model_validate(case)


@admin_router.delete(
    "/{case_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[
        Depends(require_permission("admin.case.delete"))
    ],
)
async def admin_delete_case(
    case_id: str, session: DbSession
) -> None:
    """管理员删除成功案例。"""
    svc = CaseService(session)
    await svc.delete_case(case_id)
