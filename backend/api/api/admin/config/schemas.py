"""系统配置管理请求/响应 schema 和验证器。"""

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
    registered_address: str = Field("", description="注册地")


class SiteInfoValue(BaseModel):
    """品牌信息配置值验证。支持多语言字段（str 或 {zh, en, ja, de} dict）。"""

    model_config = {"extra": "allow"}

    brand_name: str | dict = Field(..., description="品牌名称（str 或多语言 dict）")
    tagline: str | dict = Field("", description="品牌标语（str 或多语言 dict）")
    hotline: str = Field("", description="服务热线")
    hotline_contact: str | dict = Field("", description="热线联系人（str 或多语言 dict）")
    logo_url: str = Field("", description="Logo 图片地址")
    favicon_url: str = Field("", description="Favicon 地址")
    wechat_service_qr_url: str = Field("", description="客服微信二维码图片地址")
    wechat_official_qr_url: str = Field("", description="公众号二维码图片地址")
    company_name: str = Field("", description="公司名称")
    icp_filing: str = Field("", description="ICP 备案号")


class HomepageStatItem(BaseModel):
    """首页统计条目。"""

    value: str = Field(..., description="统计数值,如 15+")
    label: str = Field(..., description="统计标签,如 年办学经验")


class HomepageStatsValue(BaseModel):
    """homepage_stats 配置值验证。"""

    items: list[HomepageStatItem]

    @model_validator(mode="before")
    @classmethod
    def wrap_list(cls, data: Any) -> Any:
        """接收原始 list 并包装为 dict。"""
        if isinstance(data, list):
            return {"items": data}
        return data

    def to_list(self) -> list[dict]:
        """转为存储格式。"""
        return [item.model_dump() for item in self.items]


class AboutInfoValue(BaseModel):
    """关于我们页面内容配置值验证。"""

    history: str = Field(..., description="公司历史介绍")
    mission: str = Field(..., description="使命")
    vision: str = Field(..., description="愿景")
    partnership: str = Field("", description="合作介绍")


class PageBannerItem(BaseModel):
    """单个页面的 Banner 配置。"""

    image_ids: list[str] = Field(default_factory=list, description="图片 ID 列表")


class PageBannersValue(BaseModel):
    """页面 Banner 配置验证。"""

    model_config = {"extra": "allow"}


# 配置键 → 验证器映射
CONFIG_VALIDATORS: dict[str, type[BaseModel]] = {
    "phone_country_codes": PhoneCountryCodesValue,
    "contact_info": ContactInfoValue,
    "site_info": SiteInfoValue,
    "homepage_stats": HomepageStatsValue,
    "about_info": AboutInfoValue,
    "page_banners": PageBannersValue,
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

    key: str = Field(..., description="配置键")
    value: Any = Field(..., description="配置值")
