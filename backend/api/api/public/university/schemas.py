"""合作院校公开响应 schema。"""

from datetime import datetime

from pydantic import BaseModel


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

    model_config = {"from_attributes": True}
