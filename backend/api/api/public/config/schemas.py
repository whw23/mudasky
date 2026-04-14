"""系统配置公开响应 schema。"""

from typing import Any

from pydantic import BaseModel


class ConfigResponse(BaseModel):
    """单个配置响应。"""

    key: str
    value: Any
    description: str

    model_config = {"from_attributes": True}
