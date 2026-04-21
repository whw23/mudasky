"""分类管理 Pydantic 数据模型。

定义分类的创建、更新、响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    """分类创建请求。"""

    name: str = Field(..., max_length=50, description="分类名称")
    slug: str = Field(..., max_length=50, description="分类标识")
    description: str = Field("", max_length=200, description="分类描述")
    sort_order: int = Field(0, description="排序序号")


class CategoryDeleteRequest(BaseModel):
    """分类删除请求。"""

    category_id: str = Field(..., description="分类 ID")


class CategoryUpdate(BaseModel):
    """分类更新请求。"""

    category_id: str = Field(..., description="分类 ID")
    name: str | None = Field(None, max_length=50, description="分类名称")
    slug: str | None = Field(None, max_length=50, description="分类标识")
    description: str | None = Field(
        None, max_length=200, description="分类描述"
    )
    sort_order: int | None = Field(None, description="排序序号")


class CategoryResponse(BaseModel):
    """分类信息响应。"""

    id: str
    name: str
    slug: str
    description: str
    sort_order: int
    article_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
