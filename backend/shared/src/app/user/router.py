"""用户领域路由层。

提供用户个人信息管理、密码修改、双因素认证等 API 端点。
"""

import io

import pyotp
import qrcode
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.dependencies import CurrentUserId, DbSession
from app.user.schemas import (
    PasswordChange,
    PhoneChange,
    UserResponse,
    UserUpdate,
)
from app.user.service import UserService

router = APIRouter(prefix="/users", tags=["users"])


class TotpCodeBody(BaseModel):
    """TOTP 验证码请求体。"""

    totp_code: str = Field(..., description="TOTP 验证码")


class PasswordBody(BaseModel):
    """密码请求体。"""

    password: str = Field(..., description="用户密码")


class Sms2faBody(BaseModel):
    """短信 2FA 启用请求体。"""

    phone: str = Field(..., description="手机号")
    code: str = Field(..., description="短信验证码")


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


@router.get("/me", response_model=UserResponse)
async def get_me(
    user_id: CurrentUserId, session: DbSession
) -> UserResponse:
    """获取当前用户信息。"""
    svc = UserService(session)
    return await svc.get_user_response(user_id)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    user_id: CurrentUserId,
    session: DbSession,
) -> UserResponse:
    """更新当前用户个人信息。"""
    svc = UserService(session)
    user = await svc.update_profile(user_id, data)
    return UserResponse.model_validate(user)


@router.put("/me/password", response_model=MessageResponse)
async def change_password(
    data: PasswordChange,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """修改当前用户密码。"""
    svc = UserService(session)
    await svc.change_password(user_id, data)
    return MessageResponse(message="密码修改成功")


@router.put("/me/phone", response_model=UserResponse)
async def change_phone(
    data: PhoneChange,
    user_id: CurrentUserId,
    session: DbSession,
) -> UserResponse:
    """修改当前用户手机号。"""
    svc = UserService(session)
    user = await svc.change_phone(user_id, data)
    return UserResponse.model_validate(user)


@router.post("/me/2fa/enable-totp")
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
    "/me/2fa/confirm-totp", response_model=MessageResponse
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
    "/me/2fa/enable-sms", response_model=MessageResponse
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
    "/me/2fa/disable", response_model=MessageResponse
)
async def disable_2fa(
    data: PasswordBody,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """关闭双因素认证。"""
    svc = UserService(session)
    await svc.disable_2fa(user_id, data.password)
    return MessageResponse(message="双因素认证已关闭")
