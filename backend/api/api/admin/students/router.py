"""学生管理路由层。"""

from fastapi import APIRouter, Query, Response

from api.core.dependencies import CurrentUserId, DbSession
from api.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    build_paginated,
)

from .schemas import (
    AdvisorOption,
    AssignAdvisor,
    MessageResponse,
    StudentDowngrade,
    StudentEdit,
    StudentResponse,
)
from .service import StudentService

router = APIRouter(prefix="/students", tags=["admin-students"])


@router.get(
    "/meta/advisors",
    response_model=list[AdvisorOption],
    summary="可选顾问列表",
)
async def list_advisors(
    session: DbSession,
) -> list[AdvisorOption]:
    """查询所有顾问角色用户，用于分配顾问下拉选择。"""
    svc = StudentService(session)
    advisors = await svc.list_advisors()
    return [AdvisorOption.model_validate(a) for a in advisors]


@router.get(
    "/list",
    response_model=PaginatedResponse[StudentResponse],
    summary="学生列表",
)
async def list_students(
    user_id: CurrentUserId,
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
    advisor_id: str | None = None,
    my_students: bool = True,
) -> PaginatedResponse[StudentResponse]:
    """学生列表，默认筛选当前顾问的学生。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = StudentService(session)
    filter_advisor = (
        user_id if my_students and advisor_id is None else advisor_id
    )
    students, total = await svc.list_students(
        params.offset, params.page_size, filter_advisor
    )
    return build_paginated(students, total, params, StudentResponse)


@router.get(
    "/list/detail",
    response_model=StudentResponse,
    summary="学生详情",
)
async def get_student_detail(
    session: DbSession,
    user_id: str = Query(..., description="学生 ID"),
) -> StudentResponse:
    """获取学生详情。"""
    svc = StudentService(session)
    student = await svc.get_student(user_id)
    return StudentResponse.model_validate(student)


@router.post(
    "/list/detail/edit",
    response_model=StudentResponse,
    summary="编辑学生",
)
async def edit_student(
    data: StudentEdit,
    session: DbSession,
) -> StudentResponse:
    """编辑学生信息。"""
    svc = StudentService(session)
    student = await svc.edit_student(
        data.user_id, data.is_active, data.contact_note
    )
    return StudentResponse.model_validate(student)


@router.post(
    "/list/detail/assign-advisor",
    response_model=MessageResponse,
    summary="指定顾问",
)
async def assign_advisor(
    data: AssignAdvisor, session: DbSession
) -> MessageResponse:
    """给学生指定负责顾问。"""
    svc = StudentService(session)
    await svc.assign_advisor(data.user_id, data.advisor_id)
    return MessageResponse(message="顾问已分配")


@router.post(
    "/list/detail/downgrade",
    response_model=MessageResponse,
    summary="降为访客",
)
async def downgrade_student(
    data: StudentDowngrade, session: DbSession
) -> MessageResponse:
    """将学生降为访客。"""
    svc = StudentService(session)
    await svc.downgrade_to_visitor(data.user_id)
    return MessageResponse(message="已降为访客")


# --- 学生文件子路由 ---


@router.get(
    "/list/detail/documents/list",
    summary="学生文件列表",
)
async def list_student_documents(
    session: DbSession,
    user_id: str = Query(..., description="学生 ID"),
    page: int = 1,
    page_size: int = 20,
):
    """查询学生的文件列表。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = StudentService(session)
    docs, total = await svc.list_student_documents(
        user_id, params.offset, params.page_size
    )
    return build_paginated(docs, total, params, dict)


@router.get(
    "/list/detail/documents/list/detail",
    summary="文件详情",
)
async def get_student_document(
    session: DbSession,
    doc_id: str = Query(..., description="文件 ID"),
):
    """获取学生文件详情。"""
    svc = StudentService(session)
    return await svc.get_student_document(doc_id)


@router.get(
    "/list/detail/documents/list/detail/download",
    summary="下载文件",
)
async def download_student_document(
    session: DbSession,
    doc_id: str = Query(..., description="文件 ID"),
) -> Response:
    """下载学生文件。"""
    svc = StudentService(session)
    doc = await svc.get_student_document(doc_id)
    return Response(
        content=doc.file_data,
        media_type=doc.mime_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{doc.original_name}"'
            )
        },
    )
