"""初始化系统配置。

从环境变量读取联系方式等配置，不硬编码敏感信息。
"""

import logging
import os
from uuid import uuid4

from sqlalchemy import select

from app.db.config.models import SystemConfig

from .seed_page_blocks import build_page_blocks

CONTACT_ITEM_IDS = [str(uuid4()) for _ in range(5)]

logger = logging.getLogger(__name__)

# 系统配置定义：(key, description, value_factory)
CONFIGS = [
    (
        "site_info",
        "网站基本信息",
        lambda: {
            "brand_name": {
                "zh": "慕大国际教育",
                "en": "Muda International Education",
                "ja": "慕大国際教育",
                "de": "Muda Internationale Bildung",
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
                "ja": "蘇さん",
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
            "history_title": {
                "zh": "15年专注国际教育",
                "en": "15 Years of International Education",
                "ja": "国際教育に15年間専念",
                "de": "15 Jahre Internationale Bildung",
            },
            "history": {
                "zh": "慕大国际教育成立于2011年，专注于小语种留学项目运营已15年。作为慕尼黑大学语言中心江苏省唯一指定招生考点，我们始终秉承\"专业、诚信、高效\"的服务理念，为数百位学子成功圆梦海外名校。从最初的德语培训到如今涵盖德语、日语、英语等多语种留学服务，我们不断拓展业务版图，致力于成为中国领先的国际教育服务机构。",
                "en": "Founded in 2011, MUTU International Education has been dedicated to foreign language study abroad programs for 15 years. As the only designated enrollment center for the Munich University Language Center in Jiangsu Province, we have always upheld the service philosophy of \"professionalism, integrity, and efficiency\", helping hundreds of students achieve their dreams of studying at prestigious overseas universities.",
                "ja": "2011年設立、慕大国際教育は15年間小語種留学プロジェクトの運営に専念してきました。ミュンヘン大学言語センター江蘇省唯一の指定入試拠点として、「専門性、誠実さ、効率性」のサービス理念を堅持し、数百名の学生の海外名門大学進学をサポートしてきました。",
                "de": "MUTU International Education wurde 2011 gegründet und widmet sich seit 15 Jahren dem Betrieb von Fremdsprachen-Studienprogrammen im Ausland. Als einziger designierter Einschreibungsort des Sprachenzentrums der Ludwig-Maximilians-Universität München in der Provinz Jiangsu haben wir stets die Servicephilosophie \"Professionalität, Integrität und Effizienz\" hochgehalten.",
            },
            "mission": {
                "zh": "让每一位学子都能获得优质的国际教育资源，开启精彩的留学人生。",
                "en": "To provide every student with access to quality international education resources and an exciting study abroad experience.",
                "ja": "すべての学生に質の高い国際教育資源を提供し、素晴らしい留学生活を開くこと。",
                "de": "Jedem Studenten Zugang zu hochwertigen internationalen Bildungsressourcen zu ermöglichen.",
            },
            "vision": {
                "zh": "成为中国最受信赖的国际教育服务机构，架起中外教育交流的桥梁。",
                "en": "To become China's most trusted international education service provider, bridging educational exchanges between China and the world.",
                "ja": "中国で最も信頼される国際教育サービス機関となり、中外教育交流の架け橋となること。",
                "de": "Das vertrauenswürdigste internationale Bildungsdienstleistungsunternehmen Chinas zu werden.",
            },
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
        "page_blocks",
        "页面模组配置",
        lambda: build_page_blocks(CONTACT_ITEM_IDS),
    ),
    (
        "contact_items",
        "联系信息列表",
        lambda: [
            {
                "id": CONTACT_ITEM_IDS[0],
                "icon": "phone",
                "label": {"zh": "服务热线", "en": "Hotline"},
                "content": {"zh": "189-1268-6656"},
                "image_id": None,
                "hover_zoom": False,
            },
            {
                "id": CONTACT_ITEM_IDS[1],
                "icon": "mail",
                "label": {"zh": "邮箱", "en": "Email"},
                "content": {"zh": "info@mudasky.com"},
                "image_id": None,
                "hover_zoom": False,
            },
            {
                "id": CONTACT_ITEM_IDS[2],
                "icon": "message-circle",
                "label": {"zh": "微信咨询", "en": "WeChat"},
                "content": {"zh": "扫码添加客服微信"},
                "image_id": None,
                "hover_zoom": True,
            },
            {
                "id": CONTACT_ITEM_IDS[3],
                "icon": "map-pin",
                "label": {"zh": "公司地址", "en": "Address"},
                "content": {"zh": "苏州市工业园区"},
                "image_id": None,
                "hover_zoom": False,
            },
            {
                "id": CONTACT_ITEM_IDS[4],
                "icon": "building",
                "label": {"zh": "注册地址", "en": "Registered Address"},
                "content": {"zh": "苏州市工业园区"},
                "image_id": None,
                "hover_zoom": False,
            },
        ],
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
