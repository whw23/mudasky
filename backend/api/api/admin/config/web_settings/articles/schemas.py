"""文章管理 Pydantic 数据模型。

定义文章的创建、更新、响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel, Field


class ArticleCreate(BaseModel):
    """文章创建请求。"""

    title: str = Field(..., max_length=200, description="标题")
    content_type: str = Field("html", description="内容类型: html/file")
    content: str = Field("", description="正文内容（html 时使用）")
    file_id: str | None = Field(None, description="PDF 文件 ID")
    excerpt: str = Field("", max_length=500, description="摘要")
    cover_image: str | None = Field(
        None, max_length=500, description="封面图片路径"
    )
    category_id: str = Field(..., description="分类 ID")
    status: str = Field("draft", description="状态: draft/published")


class ArticleDeleteRequest(BaseModel):
    """文章删除请求。"""

    article_id: str = Field(..., description="文章 ID")


class ArticleUpdate(BaseModel):
    """文章更新请求。"""

    article_id: str = Field(..., description="文章 ID")
    title: str | None = Field(
        None, max_length=200, description="标题"
    )
    content_type: str | None = Field(None, description="内容类型")
    content: str | None = Field(None, description="正文内容")
    file_id: str | None = Field(None, description="PDF 文件 ID")
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
    content_type: str = "html"
    content: str
    file_id: str | None = None
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
