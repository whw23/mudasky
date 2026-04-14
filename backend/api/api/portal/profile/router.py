"""Portal 用户资料路由层。

提供个人资料查看、编辑、密码修改、手机号修改、注销账号等 API 端点。
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from api.core.dependencies import CurrentUserId, DbSession
from app.db.auth import repository as auth_repo

from .schemas import (
    PasswordChange,
    PhoneChange,
    UserResponse,
    UserUpdate,
)
from .service import ProfileService

router = APIRouter(tags=["profile"])


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


class DeleteAccountBody(BaseModel):
    """注销账号请求体。"""

    code: str = Field(..., description="短信验证码")


@router.get("/meta", response_model=UserResponse, summary="前置数据")
async def get_meta(
    user_id: CurrentUserId, session: DbSession
) -> UserResponse:
    """获取个人概览前置数据。"""
    svc = ProfileService(session)
    return await svc.get_user_response(user_id)


@router.get(
    "/meta/list",
    response_model=UserResponse,
    summary="查看个人资料",
)
async def get_profile(
    user_id: CurrentUserId, session: DbSession
) -> UserResponse:
    """查看个人资料。"""
    svc = ProfileService(session)
    return await svc.get_user_response(user_id)


@router.post(
    "/meta/list/edit",
    response_model=UserResponse,
    summary="编辑个人资料",
)
async def update_profile(
    data: UserUpdate,
    user_id: CurrentUserId,
    session: DbSession,
) -> UserResponse:
    """编辑个人资料。"""
    svc = ProfileService(session)
    user = await svc.update_profile(user_id, data)
    return UserResponse.model_validate(user)


@router.post(
    "/password",
    response_model=MessageResponse,
    summary="修改密码",
)
async def change_password(
    data: PasswordChange,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """修改当前用户密码。"""
    svc = ProfileService(session)
    await svc.change_password(user_id, data)
    return MessageResponse(message="密码修改成功")


@router.post(
    "/phone",
    response_model=UserResponse,
    summary="修改手机号",
)
async def change_phone(
    data: PhoneChange,
    user_id: CurrentUserId,
    session: DbSession,
) -> UserResponse:
    """修改当前用户手机号。"""
    svc = ProfileService(session)
    user = await svc.change_phone(user_id, data)
    return UserResponse.model_validate(user)


@router.post(
    "/delete-account",
    response_model=MessageResponse,
    summary="注销账号",
)
async def delete_account(
    data: DeleteAccountBody,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """用户注销自己的账号，需短信验证码确认。"""
    from app.core.exceptions import ForbiddenException

    svc = ProfileService(session)
    user = await svc.get_user(user_id)
    if not user.phone:
        raise ForbiddenException(
            message="未绑定手机号，无法注销账号",
            code="PHONE_NOT_BOUND",
        )
    await auth_repo.verify_sms_code(session, user.phone, data.code)
    await svc.delete_user(user_id)
    return MessageResponse(message="账号已注销")
