"""合作院校管理 Pydantic 数据模型。

定义院校的创建、更新、响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel, Field


class UniversityCreate(BaseModel):
    """院校创建请求。"""

    name: str = Field(..., max_length=200, description="校名")
    name_en: str | None = Field(
        None, max_length=200, description="英文名"
    )
    country: str = Field(
        ..., max_length=100, description="国家"
    )
    province: str | None = Field(
        None, max_length=100, description="省份/州"
    )
    city: str = Field(
        ..., max_length=100, description="城市"
    )
    logo_url: str | None = Field(
        None, max_length=500, description="Logo URL"
    )
    description: str | None = Field(
        None, description="简介"
    )
    website: str | None = Field(
        None, max_length=500, description="官网"
    )
    is_featured: bool = Field(
        False, description="是否推荐"
    )
    sort_order: int = Field(0, description="排序")
    admission_requirements: str | None = Field(None, description="录取要求")
    scholarship_info: str | None = Field(None, description="奖学金信息")
    qs_rankings: list[dict] | None = Field(None, description="QS 排名")
    latitude: float | None = Field(None, description="纬度")
    longitude: float | None = Field(None, description="经度")


class UniversityDeleteRequest(BaseModel):
    """院校删除请求。"""

    university_id: str = Field(..., description="院校 ID")


class UniversityUpdate(BaseModel):
    """院校更新请求。"""

    university_id: str = Field(..., description="院校 ID")
    name: str | None = Field(
        None, max_length=200, description="校名"
    )
    name_en: str | None = Field(
        None, max_length=200, description="英文名"
    )
    country: str | None = Field(
        None, max_length=100, description="国家"
    )
    province: str | None = Field(
        None, max_length=100, description="省份/州"
    )
    city: str | None = Field(
        None, max_length=100, description="城市"
    )
    logo_url: str | None = Field(
        None, max_length=500, description="Logo URL"
    )
    description: str | None = Field(
        None, description="简介"
    )
    website: str | None = Field(
        None, max_length=500, description="官网"
    )
    is_featured: bool | None = Field(
        None, description="是否推荐"
    )
    sort_order: int | None = Field(
        None, description="排序"
    )
    admission_requirements: str | None = Field(None, description="录取要求")
    scholarship_info: str | None = Field(None, description="奖学金信息")
    qs_rankings: list[dict] | None = Field(None, description="QS 排名")
    latitude: float | None = Field(None, description="纬度")
    longitude: float | None = Field(None, description="经度")


class ProgramResponse(BaseModel):
    """专业响应。"""

    id: str
    name: str
    discipline_id: str
    sort_order: int

    model_config = {"from_attributes": True}


class ProgramItem(BaseModel):
    """专业条目。"""

    name: str
    discipline_id: str


class SetProgramsRequest(BaseModel):
    """设置专业请求。"""

    university_id: str = Field(..., description="院校 ID")
    programs: list[ProgramItem] = Field(..., description="专业列表")


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
    programs: list[ProgramResponse] = []
    website: str | None = None
    is_featured: bool = False
    sort_order: int = 0
    logo_image_id: str | None = None
    admission_requirements: str | None = None
    scholarship_info: str | None = None
    qs_rankings: list[dict] | None = None
    latitude: float | None = None
    longitude: float | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class UniversityImageDeleteRequest(BaseModel):
    """删除院校图片请求。"""

    university_id: str = Field(..., description="院校 ID")
    image_record_id: str = Field(..., description="图片记录 ID")


class ImageResponse(BaseModel):
    """图片上传响应。"""

    id: str
    filename: str
    mime_type: str
    file_size: int

    model_config = {"from_attributes": True}
