"""认证领域 Pydantic 数据模型。

定义短信验证码、注册、登录、认证响应等数据传输对象。
"""

from pydantic import BaseModel, Field, field_validator

from app.user.schemas import UserResponse

PHONE_PATTERN = r"^\+\d{6,15}$"
"""国际手机号格式：+ 开头，6-15 位数字。"""


def _validate_phone(v: str) -> str:
    """校验手机号格式。"""
    import re

    if not re.match(PHONE_PATTERN, v):
        raise ValueError("手机号格式不正确，需包含国家码（如 +8613800138000）")
    return v


class SmsCodeRequest(BaseModel):
    """短信验证码请求。"""

    phone: str = Field(..., max_length=20, description="手机号（含国家码）")

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        """校验手机号格式。"""
        return _validate_phone(v)


class RegisterRequest(BaseModel):
    """用户注册请求。"""

    phone: str = Field(..., max_length=20, description="手机号（含国家码）")

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        """校验手机号格式。"""
        return _validate_phone(v)
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
        None, max_length=20, description="手机号（含国家码）"
    )

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str | None) -> str | None:
        """校验手机号格式。"""
        if v is not None:
            return _validate_phone(v)
        return v
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


class AuthResponse(BaseModel):
    """认证响应。

    step 字段用于二步验证流程，值为 "2fa_required" 时
    表示需要提供二步验证码。
    """

    user: UserResponse
    step: str | None = None


class PublicKeyResponse(BaseModel):
    """公钥响应。"""

    public_key: str
    nonce: str
