"""系统配置请求/响应 schema 和验证器。"""

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class CountryCodeItem(BaseModel):
    """国家码条目。"""

    code: str = Field(..., description="国家码,如 +86")
    country: str = Field(..., description="国旗 emoji,如 🇨🇳")
    label: str = Field(..., description="国家名称,如 中国")
    digits: int = Field(..., ge=6, le=15, description="号码位数")
    enabled: bool = Field(True, description="是否启用")

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        """校验国家码格式。"""
        if not re.match(r"^\+\d{1,4}$", v):
            raise ValueError("国家码格式不正确,应为 +数字(1-4位)")
        return v


class PhoneCountryCodesValue(BaseModel):
    """phone_country_codes 配置值验证。"""

    items: list[CountryCodeItem]

    @model_validator(mode="before")
    @classmethod
    def wrap_list(cls, data: Any) -> Any:
        """接收原始 list 并包装为 dict。"""
        if isinstance(data, list):
            return {"items": data}
        return data

    @field_validator("items")
    @classmethod
    def validate_unique_codes(cls, v: list[CountryCodeItem]) -> list[CountryCodeItem]:
        """校验国家码不重复。"""
        codes = [item.code for item in v]
        if len(codes) != len(set(codes)):
            raise ValueError("国家码不能重复")
        return v

    def to_list(self) -> list[dict]:
        """转为存储格式。"""
        return [item.model_dump() for item in self.items]


class ContactInfoValue(BaseModel):
    """联系方式配置值验证。"""

    address: str = Field(..., description="地址")
    phone: str = Field(..., description="电话")
    email: str = Field(..., description="邮箱")
    wechat: str = Field("", description="微信号")
    office_hours: str = Field("", description="办公时间")


# 配置键 → 验证器映射
CONFIG_VALIDATORS: dict[str, type[BaseModel]] = {
    "phone_country_codes": PhoneCountryCodesValue,
    "contact_info": ContactInfoValue,
}


class ConfigResponse(BaseModel):
    """单个配置响应。"""

    key: str
    value: Any
    description: str

    model_config = {"from_attributes": True}


class ConfigDetailResponse(ConfigResponse):
    """配置详情响应(含时间戳,管理后台用)。"""

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConfigUpdateRequest(BaseModel):
    """配置更新请求。"""

    value: Any = Field(..., description="配置值")
