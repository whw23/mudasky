"""通用分页模型。"""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """分页请求参数。"""

    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")

    @property
    def offset(self) -> int:
        """计算数据库查询偏移量。"""
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应包装。"""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


def build_paginated(
    items: list,
    total: int,
    params: PaginationParams,
    response_cls: type[T],
) -> PaginatedResponse[T]:
    """构建分页响应。"""
    total_pages = (total + params.page_size - 1) // params.page_size
    return PaginatedResponse(
        items=[response_cls.model_validate(i) for i in items],
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages,
    )
