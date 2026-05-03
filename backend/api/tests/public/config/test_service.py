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


# ---- get_all_homepage_config ----


@patch(REPO)
async def test_get_all_homepage_config_all_keys(
    mock_repo, service
):
    """全部 key 存在时返回正确数据和最大时间戳。"""
    ts1 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    ts2 = datetime(2026, 2, 1, tzinfo=timezone.utc)
    ts3 = datetime(2026, 3, 1, tzinfo=timezone.utc)
    ts4 = datetime(2025, 12, 1, tzinfo=timezone.utc)
    ts_nav = datetime(2026, 4, 1, tzinfo=timezone.utc)

    configs = {
        "contact_items": _make_config(
            "contact_items",
            [
                {
                    "icon": "phone",
                    "label": {"zh": "热线"},
                    "content": {"zh": "123"},
                    "image_id": None,
                    "hover_zoom": False,
                }
            ],
            "联系信息列表",
        ),
        "site_info": _make_config(
            "site_info", {"name": "站点"}, "站点信息"
        ),
        "homepage_stats": _make_config(
            "homepage_stats", {"count": 10}, "统计"
        ),
        "about_info": _make_config(
            "about_info", {"text": "关于"}, "关于"
        ),
        "nav_config": _make_config(
            "nav_config",
            {"order": ["home"], "custom_items": []},
            "导航",
        ),
    }
    configs["contact_items"].updated_at = ts1
    configs["site_info"].updated_at = ts2
    configs["homepage_stats"].updated_at = ts3
    configs["about_info"].updated_at = ts4
    configs["nav_config"].updated_at = ts_nav

    async def side_effect(session, key):
        return configs.get(key)

    mock_repo.get_by_key = AsyncMock(
        side_effect=side_effect
    )

    data, max_ts = await service.get_all_homepage_config()

    assert data["contact_items"] == [
        {
            "icon": "phone",
            "label": {"zh": "热线"},
            "content": {"zh": "123"},
            "image_id": None,
            "hover_zoom": False,
        }
    ]
    assert data["site_info"] == {"name": "站点"}
    assert data["homepage_stats"] == {"count": 10}
    assert data["about_info"] == {"text": "关于"}
    assert data["nav_config"] == {
        "order": ["home"],
        "custom_items": [],
    }
    assert max_ts == ts_nav


@patch(REPO)
async def test_get_all_homepage_config_partial_keys(
    mock_repo, service
):
    """部分 key 不存在时返回空 dict。"""
    ts = datetime(2026, 1, 15, tzinfo=timezone.utc)
    contact = _make_config(
        "contact_items",
        [
            {
                "icon": "phone",
                "label": {"zh": "热线"},
                "content": {"zh": "456"},
                "image_id": None,
                "hover_zoom": False,
            }
        ],
        "联系信息列表",
    )
    contact.updated_at = ts

    async def side_effect(session, key):
        if key == "contact_items":
            return contact
        return None

    mock_repo.get_by_key = AsyncMock(
        side_effect=side_effect
    )

    data, max_ts = await service.get_all_homepage_config()

    assert data["contact_items"] == [
        {
            "icon": "phone",
            "label": {"zh": "热线"},
            "content": {"zh": "456"},
            "image_id": None,
            "hover_zoom": False,
        }
    ]
    assert data["site_info"] == {}
    assert data["homepage_stats"] == {}
    assert data["about_info"] == {}
    # nav_config 不存在时返回默认值
    assert len(data["nav_config"]["order"]) == 9
    assert max_ts == ts


@patch(REPO)
async def test_get_all_homepage_config_all_missing(
    mock_repo, service
):
    """全部 key 不存在时返回空 dict 和最小时间戳。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    data, max_ts = await service.get_all_homepage_config()

    assert data["contact_items"] == []
    assert data["site_info"] == {}
    assert data["homepage_stats"] == {}
    assert data["about_info"] == {}
    assert data["nav_config"]["custom_items"] == []
    assert max_ts == datetime.min.replace(
        tzinfo=timezone.utc
    )


@patch(REPO)
async def test_get_all_homepage_config_max_updated(
    mock_repo, service
):
    """返回的 max_updated_at 是所有 key 中最大的。"""
    ts_old = datetime(2025, 6, 1, tzinfo=timezone.utc)
    ts_new = datetime(2026, 6, 1, tzinfo=timezone.utc)

    site = _make_config(
        "site_info", {"name": "X"}, "站点"
    )
    site.updated_at = ts_old
    about = _make_config(
        "about_info", {"x": 1}, "关于"
    )
    about.updated_at = ts_new

    async def side_effect(session, key):
        if key == "site_info":
            return site
        if key == "about_info":
            return about
        return None

    mock_repo.get_by_key = AsyncMock(
        side_effect=side_effect
    )

    _, max_ts = await service.get_all_homepage_config()

    assert max_ts == ts_new
