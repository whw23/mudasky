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
            "name": "浩然学行",
            "slogan": "专注国际教育，成就留学梦想",
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
