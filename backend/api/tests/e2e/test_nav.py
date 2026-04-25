"""导航栏配置模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestNav:
    """导航栏配置接口测试。"""

    async def test_get_nav_config(self, superuser_client):
        """获取导航栏配置返回 200。"""
        resp = await superuser_client.get(
            "/api/admin/web-settings/nav/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "order" in data
        assert isinstance(data["order"], list)
        assert "custom_items" in data

    async def test_nav_lifecycle(self, superuser_client):
        """新增导航项 -> 验证列表 -> 重排 -> 删除（完整生命周期）。"""
        slug = "e2e-test-nav"
        name = "E2E 测试导航"

        # 1. 新增自定义导航项
        add_resp = await superuser_client.post(
            "/api/admin/web-settings/nav/add-item",
            json={
                "slug": slug,
                "name": name,
                "description": "E2E 测试用导航项",
            },
        )
        assert add_resp.status_code == 200
        nav_config = add_resp.json()
        assert slug in nav_config["order"]
        custom_slugs = [
            item["slug"] for item in nav_config["custom_items"]
        ]
        assert slug in custom_slugs

        try:
            # 2. 验证列表中包含新增项
            list_resp = await superuser_client.get(
                "/api/admin/web-settings/nav/list"
            )
            assert list_resp.status_code == 200
            assert slug in list_resp.json()["order"]

            # 3. 重排（将当前 order 反转）
            current_order = list_resp.json()["order"]
            reversed_order = list(reversed(current_order))
            reorder_resp = await superuser_client.post(
                "/api/admin/web-settings/nav/reorder",
                json={"order": reversed_order},
            )
            assert reorder_resp.status_code == 200
            assert reorder_resp.json()["order"] == reversed_order

            # 恢复原始排序
            await superuser_client.post(
                "/api/admin/web-settings/nav/reorder",
                json={"order": current_order},
            )

        finally:
            # 4. 删除自定义导航项（清理）
            remove_resp = await superuser_client.post(
                "/api/admin/web-settings/nav/remove-item",
                json={"slug": slug, "delete_content": True},
            )
            assert remove_resp.status_code == 200
            assert slug not in remove_resp.json()["order"]


@pytest.mark.e2e
class TestNavUnauthorized:
    """导航栏接口未授权访问测试。"""

    async def test_get_nav_config_unauthorized(self, e2e_client):
        """未登录访问导航栏配置返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/web-settings/nav/list"
        )
        assert resp.status_code == 401

    async def test_add_nav_item_unauthorized(self, e2e_client):
        """未登录新增导航项返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/web-settings/nav/add-item",
            json={
                "slug": "hack-nav",
                "name": "Hack",
            },
        )
        assert resp.status_code == 401
