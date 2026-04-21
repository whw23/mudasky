"""初始化种子图片。

将 assets/ 下的占位图片写入 Image 表，更新 site_info 配置引用。
"""

import logging
from pathlib import Path

from sqlalchemy import select

from app.db.config.models import SystemConfig
from app.db.image.repository import create_image

logger = logging.getLogger(__name__)

ASSETS_DIR = Path(__file__).parent / "assets"

SEED_IMAGES = [
    ("logo.png", "image/png", "logo_url"),
    ("favicon.png", "image/png", "favicon_url"),
    ("wechat-service-qr.png", "image/png", "wechat_service_qr_url"),
]


async def init_seed_images(session) -> None:
    """初始化种子图片并更新 site_info 配置。"""
    stmt = select(SystemConfig).where(SystemConfig.key == "site_info")
    result = await session.execute(stmt)
    config = result.scalar_one_or_none()
    if not config:
        logger.warning("site_info 配置不存在，跳过图片初始化")
        return

    site_info = dict(config.value)
    updated = False

    for filename, mime_type, config_field in SEED_IMAGES:
        if site_info.get(config_field):
            logger.debug("字段已有值，跳过: %s", config_field)
            continue

        filepath = ASSETS_DIR / filename
        if not filepath.exists():
            logger.warning("种子图片不存在: %s", filepath)
            continue

        file_data = filepath.read_bytes()
        image = await create_image(session, file_data, filename, mime_type)
        url = f"/api/public/images/detail?id={image.id}"
        site_info[config_field] = url
        updated = True
        logger.info("种子图片已导入: %s → %s", filename, config_field)

    if updated:
        config.value = site_info
        await session.flush()

    print("  + 种子图片已初始化")
