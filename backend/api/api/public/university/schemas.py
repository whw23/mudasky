"""合作院校公开响应 schema。"""

from datetime import datetime

from pydantic import BaseModel


class DisciplineItem(BaseModel):
    """学科项（嵌套用）。"""
    id: str
    name: str
    category_name: str


class CaseBrief(BaseModel):
    """成功案例摘要（嵌套用）。"""
    id: str
    student_name: str
    program: str
    year: int
    avatar_image_id: str | None = None

    model_config = {"from_attributes": True}


class UniversityResponse(BaseModel):
    """院校信息响应。"""

    id: str
    name: str
    name_en: str | None = None
    country: str
    province: str | None = None
    city: str
    logo_url: str | None = None
    description: str | None = None
    programs: list[str] = []
    website: str | None = None
    is_featured: bool = False
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime | None = None
    logo_image_id: str | None = None
    image_ids: list[str] = []
    disciplines: list[DisciplineItem] = []
    admission_requirements: str | None = None
    scholarship_info: str | None = None
    qs_rankings: list[dict] | None = None
    latitude: float | None = None
    longitude: float | None = None
    related_cases: list[CaseBrief] = []

    model_config = {"from_attributes": True}
