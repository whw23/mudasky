"""配置 Schema 单元测试。

覆盖验证器、序列化方法等分支。
"""

import pytest
from pydantic import ValidationError

from api.admin.config.schemas import (
    CountryCodeItem,
    HomepageStatsValue,
    PhoneCountryCodesValue,
)


# ---- CountryCodeItem.validate_code ----


def test_country_code_invalid_format():
    """国家码格式不正确应报错。"""
    with pytest.raises(ValidationError):
        CountryCodeItem(
            code="86",
            country="🇨🇳",
            label="中国",
            digits=11,
        )


def test_country_code_valid_format():
    """国家码格式正确。"""
    item = CountryCodeItem(
        code="+86",
        country="🇨🇳",
        label="中国",
        digits=11,
    )
    assert item.code == "+86"


# ---- PhoneCountryCodesValue ----


def test_phone_codes_wrap_list():
    """列表数据自动包装为 dict。"""
    data = [
        {"code": "+86", "country": "🇨🇳", "label": "中国", "digits": 11},
    ]
    result = PhoneCountryCodesValue.model_validate(data)
    assert len(result.items) == 1


def test_phone_codes_wrap_dict():
    """字典数据直接传入。"""
    data = {
        "items": [
            {"code": "+86", "country": "🇨🇳", "label": "中国", "digits": 11},
        ]
    }
    result = PhoneCountryCodesValue.model_validate(data)
    assert len(result.items) == 1


def test_phone_codes_duplicate_codes():
    """国家码重复应报错。"""
    data = [
        {"code": "+86", "country": "🇨🇳", "label": "中国", "digits": 11},
        {"code": "+86", "country": "🇨🇳", "label": "中国2", "digits": 11},
    ]
    with pytest.raises(ValidationError):
        PhoneCountryCodesValue.model_validate(data)


def test_phone_codes_to_list():
    """to_list 返回字典列表。"""
    data = [
        {"code": "+86", "country": "🇨🇳", "label": "中国", "digits": 11},
    ]
    result = PhoneCountryCodesValue.model_validate(data)
    items = result.to_list()
    assert isinstance(items, list)
    assert items[0]["code"] == "+86"


# ---- HomepageStatsValue ----


def test_homepage_stats_wrap_list():
    """列表数据自动包装。"""
    data = [
        {"value": "15+", "label": "年办学经验"},
    ]
    result = HomepageStatsValue.model_validate(data)
    assert len(result.items) == 1


def test_homepage_stats_wrap_dict():
    """字典数据直接传入。"""
    data = {"items": [{"value": "15+", "label": "年办学经验"}]}
    result = HomepageStatsValue.model_validate(data)
    assert len(result.items) == 1


def test_homepage_stats_to_list():
    """to_list 返回字典列表。"""
    data = [{"value": "15+", "label": "年办学经验"}]
    result = HomepageStatsValue.model_validate(data)
    items = result.to_list()
    assert isinstance(items, list)
    assert items[0]["value"] == "15+"
