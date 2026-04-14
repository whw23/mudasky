"""管理员用户管理 Pydantic 数据模型。

定义管理员专用的请求/响应数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel, Field


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


class UserAdminUpdate(BaseModel):
    """管理员更新用户信息请求。"""

    is_active: bool | None = Field(None, description="是否激活")
    storage_quota: int | None = Field(
        None, ge=0, description="存储配额（字节）"
    )


class PasswordReset(BaseModel):
    """重置密码请求。"""

    encrypted_password: str = Field(
        ..., description="RSA 加密后的新密码（Base64）"
    )
    nonce: str = Field(..., description="一次性 nonce")


class RoleAssignment(BaseModel):
    """分配角色请求。"""

    role_id: str | None = Field(
        None, description="角色 ID（null 表示取消分配）"
    )


class MessageResponse(BaseModel):
    """简单消息响应。"""

    message: str
