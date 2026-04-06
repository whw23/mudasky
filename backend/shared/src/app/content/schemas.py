"""内容领域 Pydantic 数据模型。

定义分类和文章的创建、更新、响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    """分类创建请求。"""

    name: str = Field(..., max_length=50, description="分类名称")
    slug: str = Field(..., max_length=50, description="分类标识")
    sort_order: int = Field(0, description="排序序号")


class CategoryResponse(BaseModel):
    """分类信息响应。"""

    id: str
    name: str
    slug: str
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ArticleCreate(BaseModel):
    """文章创建请求。"""

    title: str = Field(..., max_length=200, description="标题")
    content: str = Field(..., description="正文内容")
    summary: str | None = Field(
        None, max_length=500, description="摘要"
    )
    cover_image: str | None = Field(
        None, max_length=500, description="封面图片路径"
    )
    category_id: str = Field(..., description="分类 ID")


class ArticleUpdate(BaseModel):
    """文章更新请求。"""

    title: str | None = Field(
        None, max_length=200, description="标题"
    )
    content: str | None = Field(None, description="正文内容")
    summary: str | None = Field(
        None, max_length=500, description="摘要"
    )
    cover_image: str | None = Field(
        None, max_length=500, description="封面图片路径"
    )
    category_id: str | None = Field(
        None, description="分类 ID"
    )


class ArticleResponse(BaseModel):
    """文章信息响应。"""

    id: str
    title: str
    content: str
    summary: str | None = None
    cover_image: str | None = None
    category_id: str
    author_id: str
    status: str
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
