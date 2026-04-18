"""学生管理 Pydantic 数据模型。"""

from datetime import datetime

from pydantic import BaseModel, Field


class StudentResponse(BaseModel):
    """学生信息响应。"""

    id: str
    phone: str | None = None
    username: str | None = None
    is_active: bool
    contact_status: str | None = None
    contact_note: str | None = None
    advisor_id: str | None = None
    storage_quota: int
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class AdvisorOption(BaseModel):
    """顾问选项（下拉用）。"""

    id: str
    username: str | None = None
    phone: str | None = None

    model_config = {"from_attributes": True}


class StudentEdit(BaseModel):
    """编辑学生信息请求。"""

    user_id: str = Field(..., description="学生 ID")
    is_active: bool | None = Field(None, description="是否激活")
    contact_note: str | None = Field(None, description="备注")


class AssignAdvisor(BaseModel):
    """指定负责顾问请求。"""

    user_id: str = Field(..., description="学生 ID")
    advisor_id: str | None = Field(
        None, description="顾问 ID（null 取消分配）"
    )


class StudentDowngrade(BaseModel):
    """降为访客请求。"""

    user_id: str = Field(..., description="学生 ID")


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str
