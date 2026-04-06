"""认证领域 Pydantic 数据模型。

定义短信验证码、注册、登录、认证响应等数据传输对象。
"""

from pydantic import BaseModel, Field

from app.user.schemas import UserResponse


class SmsCodeRequest(BaseModel):
    """短信验证码请求。"""

    phone: str = Field(..., max_length=20, description="手机号")


class RegisterRequest(BaseModel):
    """用户注册请求。"""

    phone: str = Field(..., max_length=20, description="手机号")
    code: str = Field(..., max_length=6, description="短信验证码")
    username: str | None = Field(
        None, max_length=50, description="用户名"
    )
    password: str | None = Field(None, description="密码")


class LoginRequest(BaseModel):
    """用户登录请求。

    支持三种登录方式：
    1. 手机号 + 短信验证码
    2. 用户名 + 密码
    3. 手机号 + 密码
    """

    phone: str | None = Field(
        None, max_length=20, description="手机号"
    )
    username: str | None = Field(
        None, max_length=50, description="用户名"
    )
    password: str | None = Field(None, description="密码")
    code: str | None = Field(
        None, max_length=6, description="短信验证码"
    )
    totp: str | None = Field(
        None, max_length=6, description="TOTP 验证码"
    )
    sms_code_2fa: str | None = Field(
        None, max_length=6, description="二步验证短信验证码"
    )


class RefreshRequest(BaseModel):
    """刷新令牌请求。"""

    token_hash: str = Field(
        ..., max_length=64, description="刷新令牌哈希"
    )


class AuthResponse(BaseModel):
    """认证响应。

    step 字段用于二步验证流程，值为 "2fa_required" 时
    表示需要提供二步验证码。
    """

    user: UserResponse
    step: str | None = None
