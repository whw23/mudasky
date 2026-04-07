"""用户领域 Pydantic 数据模型。

定义用户创建、更新、响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    """用户创建请求。"""

    phone: str = Field(..., max_length=20, description="手机号")
    username: str | None = Field(
        None, max_length=50, description="用户名"
    )
    password: str | None = Field(None, description="密码")


class UserUpdate(BaseModel):
    """用户更新个人信息请求。"""

    username: str | None = Field(
        None, max_length=50, description="用户名"
    )


class UserAdminUpdate(BaseModel):
    """管理员更新用户信息请求。"""

    is_active: bool | None = Field(None, description="是否激活")
    user_type: str | None = Field(
        None, max_length=10, description="用户类型"
    )
    storage_quota: int | None = Field(
        None, ge=0, description="存储配额（字节）"
    )


class PasswordChange(BaseModel):
    """修改密码请求。"""

    old_password: str | None = Field(None, description="旧密码")
    new_password: str = Field(..., min_length=6, description="新密码")


class PhoneChange(BaseModel):
    """修改手机号请求。"""

    new_phone: str = Field(..., max_length=20, description="新手机号")
    code: str = Field(..., description="短信验证码")


class UserResponse(BaseModel):
    """用户信息响应。"""

    id: str
    phone: str | None = None
    username: str | None = None
    user_type: str
    is_superuser: bool
    is_active: bool
    permissions: list[str] = []
    group_ids: list[str] = []
    two_factor_enabled: bool
    storage_quota: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
