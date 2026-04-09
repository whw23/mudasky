"""成功案例领域 Pydantic 数据模型。

定义成功案例的创建、更新、响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel, Field


class CaseCreate(BaseModel):
    """成功案例创建请求。"""

    student_name: str = Field(
        ..., max_length=100, description="学生姓名"
    )
    university: str = Field(
        ..., max_length=200, description="录取大学"
    )
    program: str = Field(
        ..., max_length=200, description="录取专业"
    )
    year: int = Field(..., description="入学年份")
    testimonial: str | None = Field(
        None, description="学生感言"
    )
    avatar_url: str | None = Field(
        None, max_length=500, description="头像 URL"
    )
    is_featured: bool = Field(
        False, description="是否推荐"
    )
    sort_order: int = Field(0, description="排序序号")


class CaseUpdate(BaseModel):
    """成功案例更新请求。"""

    student_name: str | None = Field(
        None, max_length=100, description="学生姓名"
    )
    university: str | None = Field(
        None, max_length=200, description="录取大学"
    )
    program: str | None = Field(
        None, max_length=200, description="录取专业"
    )
    year: int | None = Field(None, description="入学年份")
    testimonial: str | None = Field(
        None, description="学生感言"
    )
    avatar_url: str | None = Field(
        None, max_length=500, description="头像 URL"
    )
    is_featured: bool | None = Field(
        None, description="是否推荐"
    )
    sort_order: int | None = Field(
        None, description="排序序号"
    )


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
