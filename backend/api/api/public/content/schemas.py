"""内容领域公开响应 schema。"""

from datetime import datetime

from pydantic import BaseModel


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
