"""文档领域 Pydantic 数据模型。

定义文档响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    """文档信息响应。"""

    id: str
    file_name: str
    file_hash: str
    mime_type: str
    file_size: int
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
