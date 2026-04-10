"""RBAC 权限领域 Pydantic 数据模型。

定义权限、角色的创建、更新、响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel, Field


class PermissionResponse(BaseModel):
    """权限信息响应。"""

    id: str
    code: str
    name_key: str
    description: str

    model_config = {"from_attributes": True}


class RoleCreate(BaseModel):
    """角色创建请求。"""

    name: str = Field(..., max_length=50, description="角色名称")
    description: str = Field("", max_length=200, description="描述")
    permission_ids: list[str] = Field(
        ..., description="权限 ID 列表"
    )


class RoleUpdate(BaseModel):
    """角色更新请求。"""

    name: str | None = Field(
        None, max_length=50, description="角色名称"
    )
    description: str | None = Field(
        None, max_length=200, description="描述"
    )
    permission_ids: list[str] | None = Field(
        None, description="权限 ID 列表"
    )


class RoleResponse(BaseModel):
    """角色信息响应。"""

    id: str
    name: str
    description: str
    is_builtin: bool = False
    sort_order: int = 0
    permissions: list[PermissionResponse]
    user_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ReorderItem(BaseModel):
    """单个排序项。"""
    id: str
    sort_order: int


class RoleReorder(BaseModel):
    """角色排序请求。"""
    items: list[ReorderItem] = Field(..., description="角色 ID 与新排序值列表")
