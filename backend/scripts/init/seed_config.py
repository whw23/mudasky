"""初始化系统配置。

从环境变量读取联系方式等配置，不硬编码敏感信息。
"""

import logging
import os

from sqlalchemy import select

from app.db.config.models import SystemConfig

logger = logging.getLogger(__name__)

# 系统配置定义：(key, description, value_factory)
CONFIGS = [
    (
        "site_info",
        "网站基本信息",
        lambda: {
            "brand_name": {
                "zh": "慕大国际教育",
                "en": "MUTU International Education",
                "ja": "慕大国際教育",
                "de": "MUTU Internationale Bildung",
            },
            "tagline": {
                "zh": "专注国际教育 · 专注出国服务",
                "en": "International Education · Study Abroad Services",
                "ja": "国際教育に専念 · 留学サービスに専念",
                "de": "Internationale Bildung · Auslandsstudium",
            },
            "hotline": "189-1268-6656",
            "hotline_contact": {
                "zh": "苏老师",
                "en": "Ms. Su",
                "ja": "蘇先生",
                "de": "Frau Su",
            },
            "company_name": "浩然学行(苏州)文化传播有限公司",
            "icp_filing": "苏ICP备2022046719号-1",
        },
    ),
    (
        "phone_country_codes",
        "手机号国家码",
        lambda: [
            {"code": "+86", "country": "\U0001f1e8\U0001f1f3", "label": "\u4e2d\u56fd", "digits": 11, "enabled": True},
            {"code": "+1", "country": "\U0001f1fa\U0001f1f8", "label": "\u7f8e\u56fd", "digits": 10, "enabled": False},
            {"code": "+44", "country": "\U0001f1ec\U0001f1e7", "label": "\u82f1\u56fd", "digits": 10, "enabled": False},
            {"code": "+81", "country": "\U0001f1ef\U0001f1f5", "label": "\u65e5\u672c", "digits": 10, "enabled": False},
            {"code": "+49", "country": "\U0001f1e9\U0001f1ea", "label": "\u5fb7\u56fd", "digits": 11, "enabled": False},
        ],
    ),
    (
        "homepage_stats",
        "首页统计数据",
        lambda: [
            {"value": "15+", "label": "年办学经验"},
            {"value": "500+", "label": "成功案例"},
            {"value": "50+", "label": "合作院校"},
            {"value": "98%", "label": "签证通过率"},
        ],
    ),
    (
        "about_info",
        "关于我们",
        lambda: {
            "history": "",
            "mission": "",
            "vision": "",
            "partnership": "",
        },
    ),
    (
        "panel_pages",
        "面板页面配置",
        lambda: {
            "admin": [],
            "portal": [],
        },
    ),
    (
        "nav_config",
        "导航栏配置",
        lambda: {
            "order": [
                "home",
                "universities",
                "study-abroad",
                "requirements",
                "cases",
                "visa",
                "life",
                "news",
                "about",
            ],
            "custom_items": [],
        },
    ),
    (
        "page_banners",
        "页面 Banner 配置",
        lambda: {
            "home": {"image_ids": []},
            "universities": {"image_ids": []},
            "cases": {"image_ids": []},
            "study-abroad": {"image_ids": []},
            "requirements": {"image_ids": []},
            "visa": {"image_ids": []},
            "life": {"image_ids": []},
            "news": {"image_ids": []},
            "about": {"image_ids": []},
        },
    ),
    (
        "contact_info",
        "联系方式",
        lambda: {
            "address": os.environ.get(
                "CONTACT_ADDRESS", ""
            ),
            "phone": os.environ.get(
                "CONTACT_PHONE", ""
            ),
            "email": os.environ.get(
                "CONTACT_EMAIL", ""
            ),
            "wechat": os.environ.get("CONTACT_WECHAT", ""),
            "registered_address": os.environ.get(
                "CONTACT_REGISTERED_ADDRESS", ""
            ),
        },
    ),
]


async def init_system_config(session) -> None:
    """初始化系统配置。已存在的配置跳过。"""
    for key, description, value_factory in CONFIGS:
        stmt = select(SystemConfig).where(SystemConfig.key == key)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug("配置已存在，跳过: %s", key)
            continue

        config = SystemConfig(
            key=key,
            value=value_factory(),
            description=description,
        )
        session.add(config)
        logger.info("创建配置: %s", key)

    await session.flush()
    print("  + 系统配置已初始化")
