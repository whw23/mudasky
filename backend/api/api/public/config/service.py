"""系统配置公开业务逻辑层。"""

from datetime import datetime

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
