"""成功案例公开响应 schema。"""

from datetime import datetime

from pydantic import BaseModel


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
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
