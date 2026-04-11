"""系统配置模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestPublicConfig:
    """公开配置接口测试。"""

    async def test_get_site_info(self, anon_client):
        """获取站点信息（公开接口，预置数据）。"""
        resp = await anon_client.get(
            "/api/public/config/site_info"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["key"] == "site_info"
        assert isinstance(data["value"], dict)
        assert "brand_name" in data["value"]
        assert "description" in data


@pytest.mark.e2e
class TestAdminConfig:
    """管理员配置接口测试。"""

    async def test_list_configs(self, superuser_client):
        """超级管理员获取所有配置列表。"""
        resp = await superuser_client.get(
            "/api/admin/general-settings/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # 每项应包含 key, value, description, created_at, updated_at
        first = data[0]
        assert "key" in first
        assert "value" in first
        assert "description" in first
        assert "created_at" in first
        assert "updated_at" in first

    async def test_update_config_and_revert(self, superuser_client):
        """更新配置值后验证，再恢复原值。"""
        key = "site_info"

        # 1. 获取原始值
        resp = await superuser_client.get(
            f"/api/public/config/{key}"
        )
        assert resp.status_code == 200
        original_value = resp.json()["value"]

        # 2. 修改值（更新 tagline 字段）
        updated_value = {**original_value, "hotline": "000-0000-0000"}
        update_resp = await superuser_client.post(
            f"/api/admin/general-settings/edit/{key}",
            json={"value": updated_value},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["value"]["hotline"] == "000-0000-0000"

        # 3. 验证更新生效
        verify_resp = await superuser_client.get(
            f"/api/public/config/{key}"
        )
        assert verify_resp.status_code == 200
        assert verify_resp.json()["value"]["hotline"] == "000-0000-0000"

        # 4. 恢复原始值
        revert_resp = await superuser_client.post(
            f"/api/admin/general-settings/edit/{key}",
            json={"value": original_value},
        )
        assert revert_resp.status_code == 200
        assert revert_resp.json()["value"] == original_value


@pytest.mark.e2e
class TestConfigUnauthorized:
    """配置接口未授权访问测试。"""

    async def test_list_configs_without_auth(self, e2e_client):
        """未登录访问管理配置列表返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/general-settings/list"
        )
        assert resp.status_code == 401

    async def test_update_config_without_auth(self, e2e_client):
        """未登录更新配置返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/general-settings/edit/site_info",
            json={"value": {"brand_name": "hack"}},
        )
        assert resp.status_code == 401
