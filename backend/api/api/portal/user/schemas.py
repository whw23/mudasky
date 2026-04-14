"""Portal 用户领域 Pydantic 数据模型。

定义用户更新、密码修改、手机号修改、响应等数据传输对象。
"""

import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

PHONE_PATTERN = r"^\+\d{6,15}$"


class UserUpdate(BaseModel):
    """用户更新个人信息请求。"""

    username: str | None = Field(
        None, max_length=50, description="用户名"
    )


class PasswordChange(BaseModel):
    """修改密码请求。需要手机号短信验证。"""

    phone: str = Field(..., description="手机号（含国家码）")
    code: str = Field(..., description="短信验证码")
    encrypted_password: str = Field(
        ..., description="RSA 加密后的新密码（Base64，bcrypt 限制最大 72 字节）"
    )
    nonce: str = Field(..., description="一次性 nonce")

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        """校验手机号格式。"""
        if not re.match(PHONE_PATTERN, v):
            raise ValueError("手机号格式不正确")
        return v


class PhoneChange(BaseModel):
    """修改手机号请求。"""

    new_phone: str = Field(..., max_length=20, description="新手机号（含国家码）")

    @field_validator("new_phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        """校验手机号格式。"""
        if not re.match(PHONE_PATTERN, v):
            raise ValueError("手机号格式不正确")
        return v
    code: str = Field(..., description="短信验证码")


class UserResponse(BaseModel):
    """用户信息响应。"""

    id: str
    phone: str | None = None
    username: str | None = None
    is_active: bool
    permissions: list[str] = []
    role_id: str | None = None
    role_name: str | None = None
    two_factor_enabled: bool
    two_factor_method: str | None = None
    storage_quota: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    """活跃会话响应。"""

    id: str
    user_agent: str | None = None
    ip_address: str | None = None
    created_at: datetime
    is_current: bool = False
