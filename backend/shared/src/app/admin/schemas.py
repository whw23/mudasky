"""管理员领域 Pydantic 数据模型。

定义管理员专用的请求/响应数据传输对象。
"""

from pydantic import BaseModel, Field

from app.user.schemas import UserAdminUpdate, UserResponse

__all__ = [
    "UserAdminUpdate",
    "UserResponse",
    "PasswordReset",
    "GroupAssignment",
    "UserTypeChange",
    "MessageResponse",
]


class PasswordReset(BaseModel):
    """重置密码请求。"""

    encrypted_password: str = Field(
        ..., description="RSA 加密后的新密码（Base64）"
    )
    nonce: str = Field(..., description="一次性 nonce")


class GroupAssignment(BaseModel):
    """分配权限组请求。"""

    group_id: str | None = Field(
        None, description="权限组 ID（null 表示取消分配）"
    )


class UserTypeChange(BaseModel):
    """修改用户类型请求。"""

    user_type: str = Field(
        ..., description="用户类型（guest、member 或 staff）"
    )


class MessageResponse(BaseModel):
    """简单消息响应。"""

    message: str
