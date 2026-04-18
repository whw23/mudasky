"""系统配置公开路由单元测试。

覆盖 2 个 GET 端点的正向和异常场景。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import NotFoundException


class TestGetAllConfig:
    """获取首页全部配置端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ConfigService。"""
        with patch(
            "api.public.config.router.ConfigService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_all_config_success(self, client):
        """获取全部配置返回 200。"""
        ts = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.mock_svc.get_all_homepage_config.return_value = (
            {
                "contact_info": {"address": "北京"},
                "site_info": {"brand_name": "测试"},
                "homepage_stats": [],
                "about_info": {},
            },
            ts,
        )
        resp = await client.get("/public/config/all")
        assert resp.status_code == 200
        data = resp.json()
        assert "contact_info" in data
        assert "ETag" in resp.headers

    async def test_get_all_config_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        ts = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.mock_svc.get_all_homepage_config.return_value = (
            {"contact_info": {}, "site_info": {}},
            ts,
        )
        resp1 = await client.get("/public/config/all")
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/config/all",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304


class TestGetConfig:
    """获取单个配置值端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ConfigService。"""
        with patch(
            "api.public.config.router.ConfigService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_config_success(self, client):
        """查询存在的配置项返回 200。"""
        self.mock_svc.get_value_with_timestamp.return_value = (
            {
                "key": "phone_country_codes",
                "value": [{"code": "+86", "country": "CN"}],
                "description": "国家码列表",
            },
            datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        resp = await client.get(
            "/public/config/phone_country_codes"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["key"] == "phone_country_codes"
        assert "ETag" in resp.headers

    async def test_get_config_not_found(self, client):
        """查询不存在的配置项返回 404。"""
        self.mock_svc.get_value_with_timestamp.side_effect = (
            NotFoundException(message="配置项 nonexistent 不存在")
        )
        resp = await client.get("/public/config/nonexistent")
        assert resp.status_code == 404

    async def test_get_config_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        ts = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.mock_svc.get_value_with_timestamp.return_value = (
            {
                "key": "site_name",
                "value": {"name": "测试站点"},
                "description": "站点名称",
            },
            ts,
        )
        # 先获取 ETag
        resp1 = await client.get("/public/config/site_name")
        etag = resp1.headers.get("ETag")
        assert etag is not None

        # 带 If-None-Match 请求
        resp2 = await client.get(
            "/public/config/site_name",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304


class TestGetPanelConfig:
    """获取面板页面配置端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ConfigService。"""
        with patch(
            "api.public.config.router.ConfigService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_panel_config_success(self, client):
        """获取面板配置返回 200。"""
        self.mock_svc.get_value_with_timestamp.return_value = (
            {
                "key": "panel_pages",
                "value": {"pages": []},
                "description": "面板页面配置",
            },
            datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        resp = await client.get("/public/panel-config")
        assert resp.status_code == 200
        data = resp.json()
        assert data["key"] == "panel_pages"
        assert "ETag" in resp.headers

    async def test_get_panel_config_not_found(self, client):
        """面板配置不存在返回 404。"""
        self.mock_svc.get_value_with_timestamp.side_effect = (
            NotFoundException(
                message="配置项 panel_pages 不存在"
            )
        )
        resp = await client.get("/public/panel-config")
        assert resp.status_code == 404

    async def test_get_panel_config_calls_correct_key(
        self, client
    ):
        """面板配置端点使用 panel_pages 作为 key。"""
        self.mock_svc.get_value_with_timestamp.return_value = (
            {
                "key": "panel_pages",
                "value": {},
                "description": "面板配置",
            },
            datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        await client.get("/public/panel-config")
        self.mock_svc.get_value_with_timestamp.assert_awaited_once_with(
            "panel_pages"
        )

    async def test_get_panel_config_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        ts = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.mock_svc.get_value_with_timestamp.return_value = (
            {
                "key": "panel_pages",
                "value": {},
                "description": "面板配置",
            },
            ts,
        )
        resp1 = await client.get("/public/panel-config")
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/panel-config",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304
