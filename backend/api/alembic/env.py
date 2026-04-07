"""Alembic 迁移环境配置。"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.core.database import Base

# 导入所有模型，确保 Alembic 能检测到
# RBAC 模型需在 User 之前导入，确保 PermissionGroup 在 User 关系解析前注册
from app.rbac.models import Permission, PermissionGroup  # noqa: F401
from app.user.models import User  # noqa: F401
from app.auth.models import SmsCode, RefreshToken  # noqa: F401
from app.content.models import Article, Category  # noqa: F401
from app.document.models import Document  # noqa: F401
from app.worker.models import Task  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """离线模式迁移。"""
    context.configure(
        url=settings.database_url.replace("+asyncpg", ""),
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """执行迁移。"""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """异步模式迁移。"""
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    """在线模式迁移。"""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
