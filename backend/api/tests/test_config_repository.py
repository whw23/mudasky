"""config/repository 单元测试。

测试系统配置的 CRUD 数据库操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.config.models import SystemConfig
from app.config.repository import (
    create,
    get_by_key,
    list_all,
    update_value,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    return AsyncMock()


async def test_get_by_key_found(session):
    """按 key 获取配置。"""
    config = MagicMock(spec=SystemConfig)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = config
    session.execute.return_value = mock_result

    result = await get_by_key(session, "site_name")

    assert result == config
    session.execute.assert_awaited_once()


async def test_get_by_key_not_found(session):
    """配置不存在返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_by_key(session, "nonexistent")

    assert result is None


async def test_list_all(session):
    """获取所有配置。"""
    configs = [MagicMock(spec=SystemConfig), MagicMock(spec=SystemConfig)]
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = configs
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_all(session)

    assert len(result) == 2


async def test_update_value(session):
    """更新配置值。"""
    config = MagicMock(spec=SystemConfig)

    await update_value(session, config, {"key": "new_value"})

    assert config.value == {"key": "new_value"}
    session.flush.assert_awaited_once()


async def test_create_config(session):
    """创建配置项。"""
    result = await create(
        session, "test_key", {"data": True}, "测试描述"
    )

    session.add.assert_called_once()
    session.flush.assert_awaited_once()
    assert isinstance(result, SystemConfig)
    assert result.key == "test_key"
    assert result.value == {"data": True}
    assert result.description == "测试描述"
