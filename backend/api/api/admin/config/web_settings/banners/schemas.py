"""Banner 管理请求/响应模型。"""

from pydantic import BaseModel, Field


class BannerRemoveRequest(BaseModel):
    """移除 Banner 图片请求。"""

    page_key: str = Field(..., description="页面 key")
    image_id: str = Field(..., description="图片 ID")


class BannerReorderRequest(BaseModel):
    """重排 Banner 图片请求。"""

    page_key: str = Field(..., description="页面 key")
    image_ids: list[str] = Field(..., description="重排后的图片 ID 列表")
