"""认证领域路由层。

提供短信验证码发送、用户注册、登录、令牌续签等 API 端点。
"""

from pydantic import BaseModel

from fastapi import APIRouter, Header

from .schemas import (
    AuthResponse,
    LoginRequest,
    PublicKeyResponse,
    RegisterRequest,
    SmsCodeRequest,
    TwoFaMethods,
)
from .service import AuthService
from app.utils.crypto import generate_nonce, get_public_key_pem
from api.core.dependencies import DbSession

router = APIRouter(prefix="/auth", tags=["auth"])


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


class SmsCodeResponse(BaseModel):
    """短信验证码响应。"""

    message: str
    code: str | None = None


@router.get("/public-key", response_model=PublicKeyResponse, summary="获取 RSA 公钥")
async def get_public_key() -> PublicKeyResponse:
    """获取 RSA 公钥和一次性 nonce。"""
    return PublicKeyResponse(
        public_key=get_public_key_pem(),
        nonce=generate_nonce(),
    )


@router.post("/sms-code", response_model=SmsCodeResponse, summary="发送短信验证码")
async def send_sms_code(
    data: SmsCodeRequest,
    session: DbSession,
    x_internal_secret: str = Header(""),
) -> SmsCodeResponse:
    """发送短信验证码。DEBUG 模式或携带内部密钥时返回验证码。"""
    from app.core.config import settings

    svc = AuthService(session)
    code = await svc.send_code(data.phone)
    reveal = settings.DEBUG or (
        settings.INTERNAL_SECRET and x_internal_secret == settings.INTERNAL_SECRET
    )
    return SmsCodeResponse(message="验证码已发送", code=code if reveal else None)


@router.post("/register", response_model=AuthResponse, summary="用户注册")
async def register(
    data: RegisterRequest, session: DbSession
) -> AuthResponse:
    """用户注册。"""
    svc = AuthService(session)
    user = await svc.register(
        phone=data.phone,
        code=data.code,
        username=data.username,
        encrypted_password=data.encrypted_password,
        nonce=data.nonce,
    )
    user_resp = await svc.build_user_response(user)
    return AuthResponse(user=user_resp)


@router.post("/login", response_model=AuthResponse, summary="用户登录")
async def login(
    data: LoginRequest, session: DbSession
) -> AuthResponse:
    """用户登录。"""
    svc = AuthService(session)
    user, step = await svc.login(
        phone=data.phone,
        username=data.username,
        encrypted_password=data.encrypted_password,
        nonce=data.nonce,
        code=data.code,
        totp=data.totp,
        sms_code_2fa=data.sms_code_2fa,
    )
    user_resp = await svc.build_user_response(user)
    two_fa_methods = None
    if step == "2fa_required":
        two_fa_methods = TwoFaMethods(
            has_totp=bool(user.totp_secret),
            has_phone=bool(user.phone),
        )
    return AuthResponse(user=user_resp, step=step, two_fa_methods=two_fa_methods)


class RefreshTokenHashRequest(BaseModel):
    """保存 refresh token 哈希请求（网关内部调用）。"""

    user_id: str
    token_hash: str
    user_agent: str | None = None
    ip_address: str | None = None


@router.post("/refresh-token-hash", response_model=MessageResponse, summary="保存刷新令牌哈希")
async def save_refresh_token_hash(
    data: RefreshTokenHashRequest,
    session: DbSession,
    x_internal_secret: str = Header(""),
) -> MessageResponse:
    """保存 refresh token 哈希（仅限网关内部调用）。"""
    from app.core.config import settings

    if not settings.INTERNAL_SECRET or x_internal_secret != settings.INTERNAL_SECRET:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException(message="内部接口禁止外部访问", code="INTERNAL_API_FORBIDDEN")
    svc = AuthService(session)
    await svc.save_refresh_token_hash(
        data.user_id,
        data.token_hash,
        user_agent=data.user_agent,
        ip_address=data.ip_address,
    )
    return MessageResponse(message="ok")


@router.post("/logout", response_model=MessageResponse, summary="用户登出")
async def logout(
    session: DbSession,
    x_refresh_token_hash: str = Header(""),
) -> MessageResponse:
    """撤销当前设备的刷新令牌（由网关内部调用）。"""
    if x_refresh_token_hash:
        svc = AuthService(session)
        await svc.logout_current_device(x_refresh_token_hash)
    return MessageResponse(message="已退出登录")


@router.post("/refresh", response_model=AuthResponse, summary="刷新令牌续签")
async def refresh(
    session: DbSession,
    x_refresh_token_hash: str = Header(...),
) -> AuthResponse:
    """刷新令牌续签（token hash 由网关注入）。"""
    svc = AuthService(session)
    user = await svc.refresh(x_refresh_token_hash)
    user_resp = await svc.build_user_response(user)
    return AuthResponse(user=user_resp)
