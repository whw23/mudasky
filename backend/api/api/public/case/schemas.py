"""成功案例公开响应 schema。"""

from datetime import datetime

from pydantic import BaseModel


class UniversityBrief(BaseModel):
    """关联院校摘要。"""
    id: str
    name: str
    logo_image_id: str | None = None
    model_config = {"from_attributes": True}


class CaseResponse(BaseModel):
    """成功案例信息响应。"""

    id: str
    student_name: str
    university: str
    program: str
    year: int
    testimonial: str | None = None
    avatar_url: str | None = None
    is_featured: bool = False
    sort_order: int = 0
    avatar_image_id: str | None = None
    offer_image_id: str | None = None
    related_university: UniversityBrief | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
