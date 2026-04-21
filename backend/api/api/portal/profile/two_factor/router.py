"""Portal 双因素认证路由层。

提供 TOTP 启用/确认、短信 2FA 启用、2FA 关闭等 API 端点。
"""

import io

import pyotp
import qrcode
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.core.dependencies import CurrentUserId, DbSession
from app.db.config import repository as config_repo

from .schemas import Sms2faBody, TotpCodeBody
from .service import TwoFactorService

router = APIRouter(prefix="/two-factor", tags=["two-factor"])
router.label = "双因素认证"


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


@router.post("/enable-totp", summary="启用 TOTP 双因素认证")
async def enable_totp(
    user_id: CurrentUserId, session: DbSession
) -> StreamingResponse:
    """启用 TOTP 双因素认证，返回二维码图片。"""
    svc = TwoFactorService(session)
    secret, user = await svc.enable_totp(user_id)

    # 直接调用 config repository 获取品牌名
    config = await config_repo.get_by_key(session, "site_info")
    brand = "mudasky"
    if config and isinstance(config.value, dict):
        brand_value = config.value.get("brand_name", {})
        if isinstance(brand_value, dict):
            brand = brand_value.get("zh", "mudasky")
        elif isinstance(brand_value, str):
            brand = brand_value

    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user.phone or user.username or user.id,
        issuer_name=brand,
    )

    img = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")


@router.post(
    "/confirm-totp",
    response_model=MessageResponse,
    summary="确认启用 TOTP",
)
async def confirm_totp(
    data: TotpCodeBody,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """确认启用 TOTP 双因素认证。"""
    svc = TwoFactorService(session)
    await svc.confirm_totp(user_id, data.totp_code)
    return MessageResponse(message="TOTP 双因素认证已启用")


@router.post(
    "/enable-sms",
    response_model=MessageResponse,
    summary="启用短信双因素认证",
)
async def enable_sms(
    data: Sms2faBody,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """启用短信双因素认证。"""
    svc = TwoFactorService(session)
    await svc.enable_sms(user_id, data.phone, data.code)
    return MessageResponse(message="短信双因素认证已启用")


@router.post(
    "/disable",
    response_model=MessageResponse,
    summary="关闭双因素认证",
)
async def disable_2fa(
    data: Sms2faBody,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """关闭双因素认证。"""
    svc = TwoFactorService(session)
    await svc.disable(user_id, data.phone, data.code)
    return MessageResponse(message="双因素认证已关闭")
