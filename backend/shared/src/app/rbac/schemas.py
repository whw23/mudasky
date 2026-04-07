"""RBAC 权限领域 Pydantic 数据模型。

定义权限、权限组的创建、更新、响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel, Field


class PermissionResponse(BaseModel):
    """权限信息响应。"""

    id: str
    code: str
    description: str

    model_config = {"from_attributes": True}


class GroupCreate(BaseModel):
    """权限组创建请求。"""

    name: str = Field(..., max_length=50, description="权限组名称")
    description: str = Field("", max_length=200, description="描述")
    permission_ids: list[str] = Field(
        ..., description="权限 ID 列表"
    )


class GroupUpdate(BaseModel):
    """权限组更新请求。"""

    name: str | None = Field(
        None, max_length=50, description="权限组名称"
    )
    description: str | None = Field(
        None, max_length=200, description="描述"
    )
    permission_ids: list[str] | None = Field(
        None, description="权限 ID 列表"
    )


class GroupResponse(BaseModel):
    """权限组信息响应。"""

    id: str
    name: str
    description: str
    is_system: bool
    auto_include_all: bool
    permissions: list[PermissionResponse]
    user_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
