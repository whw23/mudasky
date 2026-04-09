"""认证领域路由层。

提供短信验证码发送、用户注册、登录、令牌续签等 API 端点。
"""

from pydantic import BaseModel

from fastapi import APIRouter, Header

from app.auth.schemas import (
    AuthResponse,
    LoginRequest,
    PublicKeyResponse,
    RegisterRequest,
    SmsCodeRequest,
)
from app.auth.service import AuthService
from app.core.crypto import generate_nonce, get_public_key_pem
from app.core.dependencies import DbSession

router = APIRouter(prefix="/auth", tags=["auth"])


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


class SmsCodeResponse(BaseModel):
    """短信验证码响应。"""

    message: str
    code: str | None = None


@router.get("/public-key", response_model=PublicKeyResponse)
async def get_public_key() -> PublicKeyResponse:
    """获取 RSA 公钥和一次性 nonce。"""
    return PublicKeyResponse(
        public_key=get_public_key_pem(),
        nonce=generate_nonce(),
    )


@router.post("/sms-code", response_model=SmsCodeResponse)
async def send_sms_code(
    data: SmsCodeRequest, session: DbSession
) -> SmsCodeResponse:
    """发送短信验证码。DEBUG 模式下返回验证码。"""
    svc = AuthService(session)
    code = await svc.send_code(data.phone)
    return SmsCodeResponse(message="验证码已发送", code=code)


@router.post("/register", response_model=AuthResponse)
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


@router.post("/login", response_model=AuthResponse)
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
    return AuthResponse(user=user_resp, step=step)


class RefreshTokenHashRequest(BaseModel):
    """保存 refresh token 哈希请求（网关内部调用）。"""

    user_id: str
    token_hash: str


@router.post("/refresh-token-hash", response_model=MessageResponse)
async def save_refresh_token_hash(
    data: RefreshTokenHashRequest,
    session: DbSession,
    x_internal_secret: str = Header(""),
) -> MessageResponse:
    """保存 refresh token 哈希（仅限网关内部调用）。"""
    from app.core.config import settings

    if not settings.INTERNAL_SECRET or x_internal_secret != settings.INTERNAL_SECRET:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException(message="内部接口禁止外部访问")
    svc = AuthService(session)
    await svc.save_refresh_token_hash(data.user_id, data.token_hash)
    return MessageResponse(message="ok")


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    session: DbSession,
    x_refresh_token_hash: str = Header(...),
) -> AuthResponse:
    """刷新令牌续签（token hash 由网关注入）。"""
    svc = AuthService(session)
    user = await svc.refresh(x_refresh_token_hash)
    user_resp = await svc.build_user_response(user)
    return AuthResponse(user=user_resp)
