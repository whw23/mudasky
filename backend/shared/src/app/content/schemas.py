"""内容领域 Pydantic 数据模型。

定义分类和文章的创建、更新、响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel, Field


# ---- 分类 ----


class CategoryCreate(BaseModel):
    """分类创建请求。"""

    name: str = Field(..., max_length=50, description="分类名称")
    slug: str = Field(..., max_length=50, description="分类标识")
    description: str = Field("", max_length=200, description="分类描述")
    sort_order: int = Field(0, description="排序序号")


class CategoryUpdate(BaseModel):
    """分类更新请求。"""

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


# ---- 文章 ----


class ArticleCreate(BaseModel):
    """文章创建请求。"""

    title: str = Field(..., max_length=200, description="标题")
    slug: str = Field(..., max_length=200, description="URL 标识")
    content: str = Field(..., description="正文内容")
    excerpt: str = Field("", max_length=500, description="摘要")
    cover_image: str | None = Field(
        None, max_length=500, description="封面图片路径"
    )
    category_id: str = Field(..., description="分类 ID")
    status: str = Field("draft", description="状态: draft/published")


class ArticleUpdate(BaseModel):
    """文章更新请求。"""

    title: str | None = Field(
        None, max_length=200, description="标题"
    )
    slug: str | None = Field(
        None, max_length=200, description="URL 标识"
    )
    content: str | None = Field(None, description="正文内容")
    excerpt: str | None = Field(
        None, max_length=500, description="摘要"
    )
    cover_image: str | None = Field(
        None, max_length=500, description="封面图片路径"
    )
    category_id: str | None = Field(
        None, description="分类 ID"
    )
    status: str | None = Field(None, description="状态")
    is_pinned: bool | None = Field(None, description="是否置顶")


class ArticleResponse(BaseModel):
    """文章信息响应。"""

    id: str
    title: str
    slug: str
    content: str
    excerpt: str
    cover_image: str | None = None
    category_id: str
    author_id: str
    status: str
    is_pinned: bool = False
    view_count: int = 0
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
