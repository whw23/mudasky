"""配置路由集成测试。

覆盖公开配置查询和管理员配置管理端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest


class TestGetConfig:
    """公开配置查询端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ConfigService。"""
        with patch(
            "api.public.config.router.ConfigService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_existing_config(self, client):
        """查询存在的配置项返回 200。"""
        self.mock_svc.get_value_with_timestamp.return_value = (
            {
                "key": "phone_country_codes",
                "value": [{"code": "+86", "country": "🇨🇳"}],
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

    async def test_get_nonexistent_config(self, client):
        """查询不存在的配置项返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.get_value_with_timestamp.side_effect = (
            NotFoundException(message="配置项 nonexistent 不存在")
        )
        resp = await client.get("/public/config/nonexistent")
        assert resp.status_code == 404


class TestAdminListConfig:
    """管理员配置列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ConfigService。"""
        with patch(
            "api.admin.config.router.ConfigService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_configs_superuser(
        self, client, superuser_headers
    ):
        """超级管理员可查看所有配置。"""
        self.mock_svc.list_all.return_value = []
        resp = await client.get(
            "/admin/web-settings/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200



class TestAdminUpdateConfig:
    """管理员配置更新端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ConfigService。"""
        with patch(
            "api.admin.config.router.ConfigService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_config_superuser(
        self, client, superuser_headers
    ):
        """超级管理员可更新配置。"""
        self.mock_svc.update_value.return_value = {
            "key": "phone_country_codes",
            "value": [],
            "description": "国家码列表",
        }
        resp = await client.post(
            "/admin/web-settings/list/edit",
            json={"key": "phone_country_codes", "value": []},
            headers=superuser_headers,
        )
        assert resp.status_code == 200


class TestWebSettingsListConfig:
    """网站配置列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ConfigService。"""
        with patch(
            "api.admin.config.router.ConfigService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_web_configs(
        self, client, superuser_headers
    ):
        """查询网站配置列表返回 200。"""
        self.mock_svc.list_all.return_value = []
        resp = await client.get(
            "/admin/web-settings/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_web_configs_with_data(
        self, client, superuser_headers
    ):
        """查询网站配置列表包含数据。"""
        self.mock_svc.list_all.return_value = [
            {
                "key": "site_info",
                "value": {"brand_name": "测试"},
                "description": "品牌信息",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        ]
        resp = await client.get(
            "/admin/web-settings/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1


class TestWebSettingsUpdateConfig:
    """网站配置更新端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ConfigService。"""
        with patch(
            "api.admin.config.router.ConfigService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_web_config(
        self, client, superuser_headers
    ):
        """更新网站配置返回 200。"""
        self.mock_svc.update_value.return_value = {
            "key": "site_info",
            "value": {"brand_name": "新品牌"},
            "description": "品牌信息",
        }
        resp = await client.post(
            "/admin/web-settings/list/edit",
            json={"key": "site_info", "value": {"brand_name": "新品牌"}},
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_update_web_config_not_found(
        self, client, superuser_headers
    ):
        """更新不存在的网站配置返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.update_value.side_effect = (
            NotFoundException(message="配置项不存在")
        )
        resp = await client.post(
            "/admin/web-settings/list/edit",
            json={"key": "nonexistent", "value": "x"},
            headers=superuser_headers,
        )
        assert resp.status_code == 404
