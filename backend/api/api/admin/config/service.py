"""系统配置管理业务逻辑层。"""

from datetime import datetime
from typing import Any
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.db.config import repository

from .schemas import CONFIG_VALIDATORS, ConfigDetailResponse, ConfigResponse


class ConfigService:
    """系统配置服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
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
            raise NotFoundException(message=f"配置项 {key} 不存在", code="CONFIG_NOT_FOUND")

        validator = CONFIG_VALIDATORS.get(key)
        if validator:
            try:
                validated = validator.model_validate(value)
                if hasattr(validated, "to_list"):
                    value = validated.to_list()
            except ValidationError as e:
                raise BadRequestException(message=str(e))

        if key == "contact_items" and isinstance(value, list):
            for item in value:
                if isinstance(item, dict) and not item.get("id"):
                    item["id"] = str(uuid4())

        await repository.update_value(self.session, config, value)
        await self.session.commit()
        return ConfigResponse.model_validate(config)
