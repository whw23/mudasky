"""认证领域路由层。

提供短信验证码发送、用户注册、登录、令牌续签等 API 端点。
"""

from pydantic import BaseModel

from fastapi import APIRouter

from app.auth.schemas import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    SmsCodeRequest,
)
from app.auth.service import AuthService
from app.core.dependencies import DbSession
from app.user.schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


@router.post("/sms-code", response_model=MessageResponse)
async def send_sms_code(
    data: SmsCodeRequest, session: DbSession
) -> MessageResponse:
    """发送短信验证码。"""
    svc = AuthService(session)
    await svc.send_code(data.phone)
    return MessageResponse(message="验证码已发送")


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
        password=data.password,
    )
    return AuthResponse(
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest, session: DbSession
) -> AuthResponse:
    """用户登录。"""
    svc = AuthService(session)
    user, step = await svc.login(
        phone=data.phone,
        username=data.username,
        password=data.password,
        code=data.code,
        totp=data.totp,
        sms_code_2fa=data.sms_code_2fa,
    )
    return AuthResponse(
        user=UserResponse.model_validate(user),
        step=step,
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    data: RefreshRequest, session: DbSession
) -> AuthResponse:
    """刷新令牌续签。"""
    svc = AuthService(session)
    user = await svc.refresh(data.token_hash)
    return AuthResponse(
        user=UserResponse.model_validate(user)
    )
