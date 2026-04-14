"""访客联系 Pydantic 数据模型。"""

from datetime import datetime

from pydantic import BaseModel, Field


class ContactResponse(BaseModel):
    """访客联系信息响应。"""

    id: str
    phone: str | None = None
    username: str | None = None
    contact_status: str | None = None
    contact_note: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactMark(BaseModel):
    """标记联系状态请求。"""

    user_id: str = Field(..., description="访客 ID")
    status: str = Field(
        ..., description="状态：pending / contacted / following"
    )


class ContactNote(BaseModel):
    """添加备注请求。"""

    user_id: str = Field(..., description="访客 ID")
    note: str = Field(..., description="备注内容")


class ContactUpgrade(BaseModel):
    """升为学员请求。"""

    user_id: str = Field(..., description="访客 ID")


class ContactRecordResponse(BaseModel):
    """联系历史记录响应。"""

    id: str
    staff_id: str
    action: str
    note: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str
