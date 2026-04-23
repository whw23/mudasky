"""系统配置公开业务逻辑层。"""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.config import repository
from app.core.exceptions import NotFoundException

from .schemas import ConfigResponse


class ConfigService:
    """系统配置公开服务（只读）。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_value(self, key: str) -> ConfigResponse:
        """获取单个配置值。"""
        config = await repository.get_by_key(self.session, key)
        if not config:
            raise NotFoundException(message=f"配置项 {key} 不存在", code="CONFIG_NOT_FOUND")
        return ConfigResponse.model_validate(config)

    async def get_value_with_timestamp(
        self, key: str
    ) -> tuple[ConfigResponse, datetime]:
        """获取单个配置值及更新时间（用于 ETag 计算）。"""
        config = await repository.get_by_key(self.session, key)
        if not config:
            raise NotFoundException(message=f"配置项 {key} 不存在", code="CONFIG_NOT_FOUND")
        return ConfigResponse.model_validate(config), config.updated_at

    async def get_all_homepage_config(
        self,
    ) -> tuple[dict, datetime]:
        """获取首页所需的全部配置，返回 (数据, 最大更新时间)。"""
        keys = ["contact_info", "site_info", "homepage_stats", "about_info", "page_banners", "page_blocks"]
        result = {}
        max_updated = datetime.min.replace(tzinfo=timezone.utc)
        for key in keys:
            config = await repository.get_by_key(self.session, key)
            if config:
                result[key] = config.value
                if config.updated_at and config.updated_at > max_updated:
                    max_updated = config.updated_at
            else:
                result[key] = {}
        # 导航栏配置
        nav = await repository.get_by_key(self.session, "nav_config")
        if nav:
            result["nav_config"] = nav.value
            if nav.updated_at and nav.updated_at > max_updated:
                max_updated = nav.updated_at
        else:
            result["nav_config"] = {
                "order": [
                    "home", "universities", "study-abroad",
                    "requirements", "cases", "visa",
                    "life", "news", "about",
                ],
                "custom_items": [],
            }
        return result, max_updated
