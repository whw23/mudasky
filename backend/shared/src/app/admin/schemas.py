"""管理员领域 Pydantic 数据模型。

定义管理员专用的请求/响应数据传输对象。
"""

from pydantic import BaseModel, Field

from app.user.schemas import UserAdminUpdate, UserResponse

__all__ = [
    "UserAdminUpdate",
    "UserResponse",
    "PasswordReset",
    "RoleAssignment",
    "MessageResponse",
]


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
