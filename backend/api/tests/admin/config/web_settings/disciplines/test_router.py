"""学科分类管理路由单元测试。

覆盖分类和学科的 CRUD 端点。
"""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import ConflictException, NotFoundException


def _make_category(**overrides):
    """创建模拟分类对象（SimpleNamespace 兼容 from_attributes）。"""
    defaults = dict(
        id="cat-1",
        name="工学",
        sort_order=0,
        created_at=datetime.now(timezone.utc),
        updated_at=None,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_discipline(**overrides):
    """创建模拟学科对象（SimpleNamespace 兼容 from_attributes）。"""
    defaults = dict(
        id="disc-1",
        category_id="cat-1",
        name="计算机科学",
        sort_order=0,
        created_at=datetime.now(timezone.utc),
        updated_at=None,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestAdminCategories:
    """学科大分类管理端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 DisciplineService。"""
        with patch(
            "api.admin.config.web_settings.disciplines.router.DisciplineService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_categories(self, client, superuser_headers):
        """查询分类列表返回 200。"""
        self.mock_svc.list_categories.return_value = [
            _make_category(),
            _make_category(id="cat-2", name="理学"),
        ]
        resp = await client.get(
            "/admin/web-settings/disciplines/categories/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    async def test_list_categories_empty(self, client, superuser_headers):
        """空分类列表返回空数组。"""
        self.mock_svc.list_categories.return_value = []
        resp = await client.get(
            "/admin/web-settings/disciplines/categories/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_create_category(self, client, superuser_headers):
        """创建分类返回 201。"""
        self.mock_svc.create_category.return_value = _make_category()
        resp = await client.post(
            "/admin/web-settings/disciplines/categories/list/create",
            headers=superuser_headers,
            json={"name": "工学", "sort_order": 0},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] == "cat-1"

    async def test_create_category_duplicate(self, client, superuser_headers):
        """分类名称已存在返回 409。"""
        self.mock_svc.create_category.side_effect = ConflictException(
            message="分类名称已存在", code="DISCIPLINE_CATEGORY_EXISTS"
        )
        resp = await client.post(
            "/admin/web-settings/disciplines/categories/list/create",
            headers=superuser_headers,
            json={"name": "工学", "sort_order": 0},
        )
        assert resp.status_code == 409

    async def test_delete_category_not_found(self, client, superuser_headers):
        """删除不存在的分类返回 404。"""
        self.mock_svc.delete_category.side_effect = NotFoundException(
            message="分类不存在", code="DISCIPLINE_CATEGORY_NOT_FOUND"
        )
        resp = await client.post(
            "/admin/web-settings/disciplines/categories/list/detail/delete",
            headers=superuser_headers,
            json={"category_id": "nonexistent"},
        )
        assert resp.status_code == 404

    async def test_delete_category_has_disciplines(self, client, superuser_headers):
        """删除有学科的分类返回 409。"""
        self.mock_svc.delete_category.side_effect = ConflictException(
            message="分类下存在学科，无法删除",
            code="DISCIPLINE_CATEGORY_HAS_DISCIPLINES",
        )
        resp = await client.post(
            "/admin/web-settings/disciplines/categories/list/detail/delete",
            headers=superuser_headers,
            json={"category_id": "cat-1"},
        )
        assert resp.status_code == 409


class TestAdminDisciplines:
    """学科管理端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        with patch(
            "api.admin.config.web_settings.disciplines.router.DisciplineService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_disciplines(self, client, superuser_headers):
        """查询学科列表返回 200。"""
        self.mock_svc.list_disciplines.return_value = [
            _make_discipline(),
            _make_discipline(id="disc-2", name="软件工程"),
        ]
        resp = await client.get(
            "/admin/web-settings/disciplines/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    async def test_list_disciplines_empty(self, client, superuser_headers):
        """空学科列表返回空数组。"""
        self.mock_svc.list_disciplines.return_value = []
        resp = await client.get(
            "/admin/web-settings/disciplines/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_create_discipline(self, client, superuser_headers):
        """创建学科返回 201。"""
        self.mock_svc.create_discipline.return_value = _make_discipline()
        resp = await client.post(
            "/admin/web-settings/disciplines/list/create",
            headers=superuser_headers,
            json={"category_id": "cat-1", "name": "计算机科学", "sort_order": 0},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] == "disc-1"

    async def test_create_discipline_duplicate(self, client, superuser_headers):
        """学科名称已存在返回 409。"""
        self.mock_svc.create_discipline.side_effect = ConflictException(
            message="学科名称已存在", code="DISCIPLINE_EXISTS"
        )
        resp = await client.post(
            "/admin/web-settings/disciplines/list/create",
            headers=superuser_headers,
            json={"category_id": "cat-1", "name": "计算机科学", "sort_order": 0},
        )
        assert resp.status_code == 409

    async def test_delete_discipline_has_universities(self, client, superuser_headers):
        """删除有院校的学科返回 409。"""
        self.mock_svc.delete_discipline.side_effect = ConflictException(
            message="学科下存在院校，无法删除",
            code="DISCIPLINE_HAS_UNIVERSITIES",
        )
        resp = await client.post(
            "/admin/web-settings/disciplines/list/detail/delete",
            headers=superuser_headers,
            json={"discipline_id": "disc-1"},
        )
        assert resp.status_code == 409

    async def test_create_discipline_missing_fields(self, client, superuser_headers):
        """缺少必填字段返回 422。"""
        resp = await client.post(
            "/admin/web-settings/disciplines/list/create",
            headers=superuser_headers,
            json={"name": "计算机科学", "sort_order": 0},
        )
        assert resp.status_code == 422
