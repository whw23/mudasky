"""系统配置业务逻辑层。"""

from datetime import datetime
from typing import Any

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import repository
from app.config.schemas import CONFIG_VALIDATORS, ConfigDetailResponse, ConfigResponse
from app.core.exceptions import BadRequestException, NotFoundException


class ConfigService:
    """系统配置服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_value(self, key: str) -> ConfigResponse:
        """获取单个配置值。"""
        config = await repository.get_by_key(self.session, key)
        if not config:
            raise NotFoundException(message=f"配置项 {key} 不存在")
        return ConfigResponse.model_validate(config)

    async def get_value_with_timestamp(
        self, key: str
    ) -> tuple[ConfigResponse, datetime]:
        """获取单个配置值及更新时间（用于 ETag 计算）。"""
        config = await repository.get_by_key(self.session, key)
        if not config:
            raise NotFoundException(message=f"配置项 {key} 不存在")
        return ConfigResponse.model_validate(config), config.updated_at

    async def list_all(self) -> list[ConfigDetailResponse]:
        """获取所有配置。"""
        configs = await repository.list_all(self.session)
        return [
            ConfigDetailResponse.model_validate(c) for c in configs
        ]

    async def update_value(self, key: str, value: Any) -> ConfigResponse:
        """更新配置值，按 key 查找对应验证器校验。"""
        config = await repository.get_by_key(self.session, key)
        if not config:
            raise NotFoundException(message=f"配置项 {key} 不存在")

        validator = CONFIG_VALIDATORS.get(key)
        if validator:
            try:
                validated = validator.model_validate(value)
                if hasattr(validated, "to_list"):
                    value = validated.to_list()
            except ValidationError as e:
                raise BadRequestException(message=str(e))

        await repository.update_value(self.session, config, value)
        await self.session.commit()
        return ConfigResponse.model_validate(config)
