"""ConfigService 单元测试。

测试系统配置的查询和更新逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.config.models import SystemConfig
from app.config.service import ConfigService
from app.core.exceptions import BadRequestException, NotFoundException

CONFIG_REPO = "app.config.service.repository"


def _make_config(
    key: str = "site_name",
    value: dict | list | None = None,
    description: str = "站点名称",
) -> MagicMock:
    """创建模拟 SystemConfig 对象。"""
    c = MagicMock(spec=SystemConfig)
    c.key = key
    c.value = value if value is not None else {"name": "测试站点"}
    c.description = description
    c.created_at = datetime.now(timezone.utc)
    c.updated_at = datetime.now(timezone.utc)
    return c


@pytest.fixture
def service(mock_session) -> ConfigService:
    """构建 ConfigService 实例，注入 mock session。"""
    return ConfigService(mock_session)


# ---- get_value ----


@pytest.mark.asyncio
@patch(CONFIG_REPO)
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


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_get_value_not_found(mock_repo, service):
    """配置项不存在应抛出 NotFoundException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_value("nonexistent")


# ---- update_value ----


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_update_value_success(mock_repo, service):
    """更新配置值成功（无特殊验证器）。"""
    config = _make_config(key="site_name")
    mock_repo.get_by_key = AsyncMock(return_value=config)
    mock_repo.update_value = AsyncMock()

    result = await service.update_value(
        "site_name", {"name": "新站点"}
    )

    assert result.key == "site_name"
    mock_repo.update_value.assert_awaited_once()


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_update_value_with_validator_invalid(
    mock_repo, service
):
    """带验证器的配置项传入无效数据应抛出 BadRequestException。"""
    config = _make_config(
        key="phone_country_codes",
        value=[],
        description="国家码列表",
    )
    mock_repo.get_by_key = AsyncMock(return_value=config)

    # 传入不合法数据（缺少必填字段）
    invalid_value = [{"code": "invalid"}]

    with pytest.raises(BadRequestException):
        await service.update_value(
            "phone_country_codes", invalid_value
        )


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_update_value_not_found(mock_repo, service):
    """更新不存在的配置项应抛出 NotFoundException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.update_value("nonexistent", {"v": 1})
