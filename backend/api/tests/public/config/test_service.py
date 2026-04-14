"""ConfigService（public）单元测试。

测试系统配置公开查询逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.public.config.service import ConfigService
from app.core.exceptions import NotFoundException

REPO = "api.public.config.service.repository"


def _make_config(
    key: str = "site_name",
    value: dict | list | None = None,
    description: str = "站点名称",
) -> MagicMock:
    """创建模拟 SystemConfig 对象。"""
    c = MagicMock()
    c.key = key
    c.value = value if value is not None else {"name": "测试站点"}
    c.description = description
    c.created_at = datetime.now(timezone.utc)
    c.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return c


@pytest.fixture
def service(mock_session) -> ConfigService:
    """构建 ConfigService 实例，注入 mock session。"""
    return ConfigService(mock_session)


# ---- get_value ----


@patch(REPO)
async def test_get_value_success(mock_repo, service):
    """获取配置值成功。"""
    config = _make_config(key="site_name")
    mock_repo.get_by_key = AsyncMock(return_value=config)

    result = await service.get_value("site_name")

    assert result.key == "site_name"
    assert result.description == "站点名称"
    mock_repo.get_by_key.assert_awaited_once_with(
        service.session, "site_name"
    )


@patch(REPO)
async def test_get_value_not_found(mock_repo, service):
    """配置项不存在应抛出 NotFoundException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_value("nonexistent")


# ---- get_value_with_timestamp ----


@patch(REPO)
async def test_get_value_with_timestamp_success(mock_repo, service):
    """获取配置值和时间戳成功。"""
    ts = datetime(2026, 1, 1, tzinfo=timezone.utc)
    config = _make_config(key="panel_pages")
    config.updated_at = ts
    mock_repo.get_by_key = AsyncMock(return_value=config)

    result, updated_at = await service.get_value_with_timestamp(
        "panel_pages"
    )

    assert result.key == "panel_pages"
    assert updated_at == ts
    mock_repo.get_by_key.assert_awaited_once_with(
        service.session, "panel_pages"
    )


@patch(REPO)
async def test_get_value_with_timestamp_not_found(
    mock_repo, service
):
    """配置项不存在时 get_value_with_timestamp 抛出 NotFoundException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_value_with_timestamp("nonexistent")
