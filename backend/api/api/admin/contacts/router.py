"""访客联系路由层。"""

from fastapi import APIRouter, Query

from api.core.dependencies import CurrentUserId, DbSession
from api.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    build_paginated,
)
from .schemas import (
    ContactMark,
    ContactNote,
    ContactRecordResponse,
    ContactResponse,
    ContactUpgrade,
    MessageResponse,
)
from .service import ContactService

router = APIRouter(prefix="/contacts", tags=["admin-contacts"])


@router.get(
    "/list",
    response_model=PaginatedResponse[ContactResponse],
    summary="访客列表",
)
async def list_contacts(
    session: DbSession,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedResponse[ContactResponse]:
    """查询访客联系列表（只含 visitor 角色）。"""
    params = PaginationParams(page=page, page_size=page_size)
    svc = ContactService(session)
    contacts, total = await svc.list_contacts(
        params.offset, params.page_size
    )
    return build_paginated(contacts, total, params, ContactResponse)


@router.get(
    "/list/detail",
    response_model=ContactResponse,
    summary="联系详情",
)
async def get_contact_detail(
    session: DbSession,
    user_id: str = Query(..., description="访客 ID"),
) -> ContactResponse:
    """获取访客联系详情。"""
    svc = ContactService(session)
    contact = await svc.get_contact(user_id)
    return ContactResponse.model_validate(contact)


@router.post(
    "/list/detail/mark",
    response_model=MessageResponse,
    summary="标记状态",
)
async def mark_contact(
    data: ContactMark,
    staff_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """标记联系状态。"""
    svc = ContactService(session)
    await svc.mark_status(data.user_id, data.status, staff_id)
    return MessageResponse(message="状态已更新")


@router.post(
    "/list/detail/note",
    response_model=MessageResponse,
    summary="添加备注",
)
async def add_note(
    data: ContactNote,
    staff_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """添加联系备注。"""
    svc = ContactService(session)
    await svc.add_note(data.user_id, data.note, staff_id)
    return MessageResponse(message="备注已添加")


@router.get(
    "/list/detail/history",
    response_model=list[ContactRecordResponse],
    summary="联系历史",
)
async def get_contact_history(
    session: DbSession,
    user_id: str = Query(..., description="访客 ID"),
) -> list[ContactRecordResponse]:
    """获取联系历史记录。"""
    svc = ContactService(session)
    records = await svc.get_history(user_id)
    return [ContactRecordResponse.model_validate(r) for r in records]


@router.post(
    "/list/detail/upgrade",
    response_model=MessageResponse,
    summary="升为学员",
)
async def upgrade_contact(
    data: ContactUpgrade,
    staff_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """将访客升为学员。"""
    svc = ContactService(session)
    await svc.upgrade_to_student(data.user_id, staff_id)
    return MessageResponse(message="已升为学员")
