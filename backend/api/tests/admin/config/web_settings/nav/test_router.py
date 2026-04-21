"""导航栏配置路由测试。

覆盖管理员导航栏配置端点。
"""

from unittest.mock import AsyncMock, patch

import pytest

from api.admin.config.web_settings.nav.schemas import (
    NavConfig,
    NavCustomItem,
)
from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
)

SVC_PATH = (
    "api.admin.config.web_settings.nav.router.NavService"
)


def _default_nav() -> NavConfig:
    """创建默认 NavConfig。"""
    return NavConfig(
        order=[
            "home",
            "universities",
            "study-abroad",
            "requirements",
            "cases",
            "visa",
            "life",
            "news",
            "about",
        ],
        custom_items=[],
    )


def _nav_with_custom() -> NavConfig:
    """创建包含自定义项的 NavConfig。"""
    return NavConfig(
        order=["home", "about", "my-page"],
        custom_items=[
            NavCustomItem(
                slug="my-page",
                name="我的页面",
                category_id="cat-100",
            )
        ],
    )


class TestGetNavConfig:
    """GET /nav/list 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 NavService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_nav_config_success(
        self, client, superuser_headers
    ):
        """获取导航栏配置返回 200。"""
        self.mock_svc.get_nav_config.return_value = (
            _default_nav()
        )
        resp = await client.get(
            "/admin/web-settings/nav/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["order"]) == 9
        assert data["custom_items"] == []

    async def test_get_nav_config_with_custom(
        self, client, superuser_headers
    ):
        """获取包含自定义项的导航栏配置。"""
        self.mock_svc.get_nav_config.return_value = (
            _nav_with_custom()
        )
        resp = await client.get(
            "/admin/web-settings/nav/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "my-page" in data["order"]
        assert len(data["custom_items"]) == 1


class TestReorderNav:
    """POST /nav/reorder 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 NavService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_reorder_success(
        self, client, superuser_headers
    ):
        """排序成功返回 200。"""
        new_order = ["about", "home"]
        self.mock_svc.reorder.return_value = NavConfig(
            order=new_order, custom_items=[]
        )
        resp = await client.post(
            "/admin/web-settings/nav/reorder",
            json={"order": new_order},
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["order"] == new_order

    async def test_reorder_invalid_key(
        self, client, superuser_headers
    ):
        """排序包含无效 key 返回 400。"""
        self.mock_svc.reorder.side_effect = (
            BadRequestException(
                message="无效的导航项: bad",
                code="INVALID_NAV_KEY",
            )
        )
        resp = await client.post(
            "/admin/web-settings/nav/reorder",
            json={"order": ["bad"]},
            headers=superuser_headers,
        )
        assert resp.status_code == 400

    async def test_reorder_missing_body(
        self, client, superuser_headers
    ):
        """缺少 order 字段返回 422。"""
        resp = await client.post(
            "/admin/web-settings/nav/reorder",
            json={},
            headers=superuser_headers,
        )
        assert resp.status_code == 422


class TestAddNavItem:
    """POST /nav/add-item 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 NavService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_add_item_success(
        self, client, superuser_headers
    ):
        """新增导航项成功返回 200。"""
        self.mock_svc.add_item.return_value = (
            _nav_with_custom()
        )
        resp = await client.post(
            "/admin/web-settings/nav/add-item",
            json={
                "slug": "my-page",
                "name": "我的页面",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert "my-page" in resp.json()["order"]

    async def test_add_item_with_description(
        self, client, superuser_headers
    ):
        """新增导航项带描述成功。"""
        self.mock_svc.add_item.return_value = (
            _nav_with_custom()
        )
        resp = await client.post(
            "/admin/web-settings/nav/add-item",
            json={
                "slug": "my-page",
                "name": "我的页面",
                "description": "页面描述",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_add_item_conflict(
        self, client, superuser_headers
    ):
        """slug 已存在返回 400。"""
        self.mock_svc.add_item.side_effect = (
            BadRequestException(
                message="导航项 home 已存在",
                code="NAV_ITEM_EXISTS",
            )
        )
        resp = await client.post(
            "/admin/web-settings/nav/add-item",
            json={"slug": "home", "name": "首页"},
            headers=superuser_headers,
        )
        assert resp.status_code == 400

    async def test_add_item_missing_slug(
        self, client, superuser_headers
    ):
        """缺少 slug 字段返回 422。"""
        resp = await client.post(
            "/admin/web-settings/nav/add-item",
            json={"name": "缺少slug"},
            headers=superuser_headers,
        )
        assert resp.status_code == 422


class TestRemoveNavItem:
    """POST /nav/remove-item 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 NavService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_remove_item_success(
        self, client, superuser_headers
    ):
        """删除导航项成功返回 200。"""
        self.mock_svc.remove_item.return_value = (
            _default_nav()
        )
        resp = await client.post(
            "/admin/web-settings/nav/remove-item",
            json={"slug": "custom-1"},
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_remove_item_with_delete_content(
        self, client, superuser_headers
    ):
        """删除导航项并级联删除内容返回 200。"""
        self.mock_svc.remove_item.return_value = (
            _default_nav()
        )
        resp = await client.post(
            "/admin/web-settings/nav/remove-item",
            json={
                "slug": "custom-1",
                "delete_content": True,
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        self.mock_svc.remove_item.assert_awaited_once_with(
            "custom-1", True
        )

    async def test_remove_builtin_item(
        self, client, superuser_headers
    ):
        """删除预设导航项返回 400。"""
        self.mock_svc.remove_item.side_effect = (
            BadRequestException(
                message="预设导航项不可删除",
                code="BUILTIN_NAV_ITEM",
            )
        )
        resp = await client.post(
            "/admin/web-settings/nav/remove-item",
            json={"slug": "home"},
            headers=superuser_headers,
        )
        assert resp.status_code == 400

    async def test_remove_not_found(
        self, client, superuser_headers
    ):
        """删除不存在的导航项返回 404。"""
        self.mock_svc.remove_item.side_effect = (
            NotFoundException(
                message="导航项不存在",
                code="NAV_ITEM_NOT_FOUND",
            )
        )
        resp = await client.post(
            "/admin/web-settings/nav/remove-item",
            json={"slug": "nonexistent"},
            headers=superuser_headers,
        )
        assert resp.status_code == 404

    async def test_remove_missing_slug(
        self, client, superuser_headers
    ):
        """缺少 slug 字段返回 422。"""
        resp = await client.post(
            "/admin/web-settings/nav/remove-item",
            json={},
            headers=superuser_headers,
        )
        assert resp.status_code == 422
