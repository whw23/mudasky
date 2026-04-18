"""分类路由集成测试。

覆盖管理员分类管理端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_category(**kwargs) -> MagicMock:
    """创建模拟分类对象。"""
    cat = MagicMock()
    cat.id = kwargs.get("id", "cat-001")
    cat.name = kwargs.get("name", "测试分类")
    cat.slug = kwargs.get("slug", "test-category")
    cat.description = kwargs.get("description", "描述")
    cat.sort_order = kwargs.get("sort_order", 0)
    cat.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    return cat


class TestAdminCategories:
    """管理员分类管理端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 CategoryService。"""
        with patch(
            "api.admin.config.web_settings.categories.router.CategoryService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_admin_list_categories(
        self, client, superuser_headers
    ):
        """管理员查询分类列表返回 200。"""
        self.mock_svc.list_categories.return_value = []
        self.mock_svc.get_article_counts_by_category.return_value = {}
        resp = await client.get(
            "/admin/web-settings/categories/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_admin_create_category(
        self, client, superuser_headers
    ):
        """管理员创建分类返回 201。"""
        self.mock_svc.create_category.return_value = (
            _make_category()
        )
        resp = await client.post(
            "/admin/web-settings/categories/list/create",
            json={
                "name": "新分类",
                "slug": "new-cat",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 201

    async def test_admin_update_category(
        self, client, superuser_headers
    ):
        """管理员更新分类返回 200。"""
        self.mock_svc.update_category.return_value = (
            _make_category(name="更新分类")
        )
        resp = await client.post(
            "/admin/web-settings/categories/list/detail/edit",
            json={
                "category_id": "cat-001",
                "name": "更新分类",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_admin_delete_category(
        self, client, superuser_headers
    ):
        """管理员删除分类返回 204。"""
        self.mock_svc.delete_category.return_value = None
        resp = await client.post(
            "/admin/web-settings/categories/list/detail/delete",
            json={"category_id": "cat-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 204
