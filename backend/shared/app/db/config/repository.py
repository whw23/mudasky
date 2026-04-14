"""系统配置数据访问层。"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.config.models import SystemConfig


async def get_by_key(
    session: AsyncSession, key: str
) -> SystemConfig | None:
    """按 key 获取配置。"""
    result = await session.execute(
        select(SystemConfig).where(SystemConfig.key == key)
    )
    return result.scalar_one_or_none()


async def list_all(
    session: AsyncSession,
) -> list[SystemConfig]:
    """获取所有配置。"""
    result = await session.execute(
        select(SystemConfig).order_by(SystemConfig.key)
    )
    return list(result.scalars().all())


async def update_value(
    session: AsyncSession, config: SystemConfig, value: dict | list
) -> None:
    """更新配置值。"""
    config.value = value
    await session.flush()


async def create(
    session: AsyncSession, key: str, value: dict | list, description: str
) -> SystemConfig:
    """创建配置项。"""
    config = SystemConfig(key=key, value=value, description=description)
    session.add(config)
    await session.flush()
    return config
