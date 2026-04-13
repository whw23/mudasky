"""用户领域路由层。

提供用户个人信息管理、密码修改、双因素认证等 API 端点。
"""

import io

import pyotp
import qrcode
from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.auth import repository as auth_repo
from app.auth.schemas import SessionResponse
from app.core.dependencies import CurrentUserId, DbSession
from app.user.schemas import (
    PasswordChange,
    PhoneChange,
    UserResponse,
    UserUpdate,
)
from app.user.service import UserService

router = APIRouter(prefix="/portal/profile", tags=["users"])


class TotpCodeBody(BaseModel):
    """TOTP 验证码请求体。"""

    totp_code: str = Field(..., description="TOTP 验证码")


class Sms2faBody(BaseModel):
    """短信 2FA 启用请求体。"""

    phone: str = Field(..., description="手机号")
    code: str = Field(..., description="短信验证码")


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


@router.get("/view", response_model=UserResponse, summary="获取当前用户信息")
async def get_me(
    user_id: CurrentUserId, session: DbSession
) -> UserResponse:
    """获取当前用户信息。"""
    svc = UserService(session)
    return await svc.get_user_response(user_id)


@router.post("/edit", response_model=UserResponse, summary="更新当前用户个人信息")
async def update_me(
    data: UserUpdate,
    user_id: CurrentUserId,
    session: DbSession,
) -> UserResponse:
    """更新当前用户个人信息。"""
    svc = UserService(session)
    user = await svc.update_profile(user_id, data)
    return UserResponse.model_validate(user)


@router.post("/password", response_model=MessageResponse, summary="修改密码")
async def change_password(
    data: PasswordChange,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """修改当前用户密码。"""
    svc = UserService(session)
    await svc.change_password(user_id, data)
    return MessageResponse(message="密码修改成功")


@router.post("/phone", response_model=UserResponse, summary="修改手机号")
async def change_phone(
    data: PhoneChange,
    user_id: CurrentUserId,
    session: DbSession,
) -> UserResponse:
    """修改当前用户手机号。"""
    svc = UserService(session)
    user = await svc.change_phone(user_id, data)
    return UserResponse.model_validate(user)


@router.post("/2fa-enable-totp", summary="启用 TOTP 双因素认证")
async def enable_2fa_totp(
    user_id: CurrentUserId, session: DbSession
) -> StreamingResponse:
    """启用 TOTP 双因素认证，返回二维码图片。"""
    svc = UserService(session)
    user = await svc.get_user(user_id)
    secret = await svc.enable_2fa_totp(user_id)

    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user.phone or user.username or user.id,
        issuer_name="mudasky",
    )

    img = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")


@router.post(
    "/2fa-confirm-totp",
    response_model=MessageResponse,
    summary="确认启用 TOTP",
)
async def confirm_2fa_totp(
    data: TotpCodeBody,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """确认启用 TOTP 双因素认证。"""
    svc = UserService(session)
    await svc.confirm_2fa_totp(user_id, data.totp_code)
    return MessageResponse(message="TOTP 双因素认证已启用")


@router.post(
    "/2fa-enable-sms",
    response_model=MessageResponse,
    summary="启用短信双因素认证",
)
async def enable_2fa_sms(
    data: Sms2faBody,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """启用短信双因素认证。"""
    svc = UserService(session)
    await svc.enable_2fa_sms(user_id, data.phone, data.code)
    return MessageResponse(message="短信双因素认证已启用")


@router.post(
    "/2fa-disable",
    response_model=MessageResponse,
    summary="关闭双因素认证",
)
async def disable_2fa(
    data: Sms2faBody,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """关闭双因素认证。"""
    svc = UserService(session)
    await svc.disable_2fa(user_id, data.phone, data.code)
    return MessageResponse(message="双因素认证已关闭")


@router.get("/sessions", response_model=list[SessionResponse], summary="查看所有活跃会话")
async def list_sessions(
    user_id: CurrentUserId,
    session: DbSession,
    x_refresh_token_hash: str = Header(""),
) -> list[SessionResponse]:
    """列出当前用户所有活跃会话。"""
    tokens = await auth_repo.list_user_refresh_tokens(session, user_id)
    return [
        SessionResponse(
            id=token.id,
            user_agent=token.user_agent,
            ip_address=token.ip_address,
            created_at=token.created_at,
            is_current=(token.token_hash == x_refresh_token_hash),
        )
        for token in tokens
    ]


@router.post("/sessions/revoke/{token_id}", response_model=MessageResponse, summary="撤销指定会话")
async def revoke_session(
    token_id: str,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """撤销指定会话。"""
    success = await auth_repo.revoke_refresh_token_by_id(
        session, token_id, user_id
    )
    if not success:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(message="会话不存在或已被撤销", code="SESSION_NOT_FOUND")
    return MessageResponse(message="会话已撤销")


@router.post("/sessions/revoke-all", response_model=MessageResponse, summary="撤销所有其他会话")
async def revoke_all_sessions(
    user_id: CurrentUserId,
    session: DbSession,
    x_refresh_token_hash: str = Header(""),
) -> MessageResponse:
    """撤销除当前设备外的所有会话。"""
    await auth_repo.revoke_other_refresh_tokens(
        session, user_id, x_refresh_token_hash
    )
    return MessageResponse(message="已撤销所有其他会话")
