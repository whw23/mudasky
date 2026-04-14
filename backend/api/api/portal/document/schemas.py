"""Portal 文档领域 Pydantic 数据模型。

定义文档响应、列表响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel

from app.db.document.models import DocumentCategory


class DocumentResponse(BaseModel):
    """文档信息响应。"""

    id: str
    user_id: str
    filename: str
    original_name: str
    file_size: int
    mime_type: str
    category: DocumentCategory
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    """文档列表响应（含存储用量摘要）。"""

    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    storage_used: int
    storage_quota: int
