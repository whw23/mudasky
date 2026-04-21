"""学科分类请求/响应模型。"""

from datetime import datetime

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    """创建学科大分类。"""

    name: str = Field(..., max_length=100, description="分类名称")
    sort_order: int = Field(0, description="排序")


class CategoryUpdate(BaseModel):
    """更新学科大分类。"""

    category_id: str = Field(..., description="分类 ID")
    name: str | None = Field(None, max_length=100, description="分类名称")
    sort_order: int | None = Field(None, description="排序")


class CategoryDeleteRequest(BaseModel):
    """删除学科大分类。"""

    category_id: str = Field(..., description="分类 ID")


class CategoryResponse(BaseModel):
    """学科大分类响应。"""

    id: str
    name: str
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime | None = None
    model_config = {"from_attributes": True}


class DisciplineCreate(BaseModel):
    """创建学科。"""

    category_id: str = Field(..., description="所属大分类 ID")
    name: str = Field(..., max_length=200, description="学科名称")
    sort_order: int = Field(0, description="排序")


class DisciplineUpdate(BaseModel):
    """更新学科。"""

    discipline_id: str = Field(..., description="学科 ID")
    name: str | None = Field(None, max_length=200, description="学科名称")
    sort_order: int | None = Field(None, description="排序")


class DisciplineDeleteRequest(BaseModel):
    """删除学科。"""

    discipline_id: str = Field(..., description="学科 ID")


class DisciplineResponse(BaseModel):
    """学科响应。"""

    id: str
    category_id: str
    name: str
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime | None = None
    model_config = {"from_attributes": True}


class DisciplineImportConfirmRequest(BaseModel):
    """学科导入确认请求。"""

    items: list[dict]
