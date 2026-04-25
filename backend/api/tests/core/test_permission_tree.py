"""权限树生成模块单元测试。

覆盖 _get_panel、_collect_panel_routes、_find_labeled_routers、
_build_label_map、_find_deepest_prefix、_build_tree_from_routes、
build_permission_tree。
"""

from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest
from fastapi import APIRouter
from fastapi.routing import APIRoute

from api.core.permission_tree import (
    _build_label_map,
    _build_tree_from_routes,
    _collect_panel_routes,
    _find_deepest_prefix,
    _find_labeled_routers,
    _get_panel,
    build_permission_tree,
)


# ---- _get_panel ----


class TestGetPanel:
    """_get_panel 面板提取测试。"""

    def test_admin_panel(self):
        """识别 admin 面板。"""
        assert _get_panel("/admin/users/list") == "admin"

    def test_portal_panel(self):
        """识别 portal 面板。"""
        assert _get_panel("/portal/profile/meta") == "portal"

    def test_auth_returns_none(self):
        """auth 路径返回 None。"""
        assert _get_panel("/auth/login") is None

    def test_public_returns_none(self):
        """public 路径返回 None。"""
        assert _get_panel("/public/config") is None

    def test_health_returns_none(self):
        """非面板路径返回 None。"""
        assert _get_panel("/health") is None

    def test_empty_path(self):
        """空路径返回 None。"""
        assert _get_panel("/") is None


# ---- _collect_panel_routes ----


class TestCollectPanelRoutes:
    """_collect_panel_routes 路由收集测试。"""

    def _make_route(self, path, summary, module):
        """创建模拟 APIRoute。"""
        endpoint = MagicMock()
        endpoint.__module__ = module
        route = MagicMock(spec=APIRoute)
        route.path = path
        route.summary = summary
        route.endpoint = endpoint
        return route

    def test_groups_by_module(self):
        """按 endpoint 模块分组路由。"""
        app = MagicMock()
        app.routes = [
            self._make_route(
                "/admin/users/list",
                "用户列表",
                "api.admin.user.router",
            ),
            self._make_route(
                "/admin/roles/meta",
                "前置数据",
                "api.admin.rbac.router",
            ),
        ]
        result = _collect_panel_routes(app)
        assert "api.admin.user.router" in result
        assert "api.admin.rbac.router" in result
        assert len(result["api.admin.user.router"]) == 1

    def test_skips_non_panel_routes(self):
        """跳过非面板路由。"""
        app = MagicMock()
        app.routes = [
            self._make_route(
                "/auth/login", "登录", "api.auth.router"
            ),
            self._make_route(
                "/public/config", "配置", "api.public.router"
            ),
        ]
        result = _collect_panel_routes(app)
        assert result == {}

    def test_summary_defaults_to_empty(self):
        """summary 为 None 时使用空字符串。"""
        app = MagicMock()
        route = self._make_route(
            "/admin/users/list",
            None,
            "api.admin.user.router",
        )
        route.summary = None
        app.routes = [route]
        result = _collect_panel_routes(app)
        assert result["api.admin.user.router"][0][1] == ""

    def test_skips_non_api_route(self):
        """跳过非 APIRoute 对象。"""
        app = MagicMock()
        non_route = MagicMock()
        non_route.__class__ = type("Mount", (), {})
        app.routes = [non_route]
        result = _collect_panel_routes(app)
        assert result == {}


# ---- _find_labeled_routers ----


class TestFindLabeledRouters:
    """_find_labeled_routers 标签路由查找测试。"""

    def test_finds_labeled_router(self):
        """找到带 label 和 prefix 的 router。"""
        mod = ModuleType("test_mod")
        r = APIRouter(prefix="/users")
        r.label = "用户管理"
        mod.router = r
        result = _find_labeled_routers(mod)
        assert len(result) == 1
        assert result[0].label == "用户管理"

    def test_skips_no_label(self):
        """跳过无 label 的 router。"""
        mod = ModuleType("test_mod")
        mod.router = APIRouter(prefix="/config")
        result = _find_labeled_routers(mod)
        assert result == []

    def test_skips_no_prefix(self):
        """跳过无 prefix 的 router。"""
        mod = ModuleType("test_mod")
        r = APIRouter()
        r.label = "系统设置"
        mod.router = r
        result = _find_labeled_routers(mod)
        assert result == []

    def test_multiple_routers(self):
        """找到模块中多个带标签的 router。"""
        mod = ModuleType("test_mod")
        r1 = APIRouter(prefix="/web-settings/general")
        r1.label = "通用配置"
        r2 = APIRouter(prefix="/web-settings")
        r2.label = "网站设置"
        mod.general_router = r1
        mod.web_router = r2
        result = _find_labeled_routers(mod)
        assert len(result) == 2

    def test_deduplicates_same_object(self):
        """同一 router 对象多个属性名不重复。"""
        mod = ModuleType("test_mod")
        r = APIRouter(prefix="/users")
        r.label = "用户管理"
        mod.router = r
        mod.user_router = r  # 同一对象
        result = _find_labeled_routers(mod)
        assert len(result) == 1


# ---- _find_deepest_prefix ----


class TestFindDeepestPrefix:
    """_find_deepest_prefix 最深前缀匹配测试。"""

    def test_exact_match(self):
        """精确匹配前缀。"""
        lm = {"/admin/users": "用户管理"}
        prefix, remaining = _find_deepest_prefix(
            "/admin/users/list", lm
        )
        assert prefix == "/admin/users"
        assert remaining == "list"

    def test_deepest_wins(self):
        """最深前缀优先。"""
        lm = {
            "/admin/web-settings": "网站设置",
            "/admin/web-settings/articles": "文章管理",
        }
        prefix, remaining = _find_deepest_prefix(
            "/admin/web-settings/articles/list", lm
        )
        assert prefix == "/admin/web-settings/articles"
        assert remaining == "list"

    def test_no_match(self):
        """无匹配时返回空前缀。"""
        lm = {"/admin/users": "用户管理"}
        prefix, remaining = _find_deepest_prefix(
            "/admin/roles/meta", lm
        )
        assert prefix == ""
        assert remaining == "admin/roles/meta"

    def test_multi_segment_remaining(self):
        """剩余路径包含多个段。"""
        lm = {"/admin/users": "用户管理"}
        prefix, remaining = _find_deepest_prefix(
            "/admin/users/list/detail/edit", lm
        )
        assert prefix == "/admin/users"
        assert remaining == "list/detail/edit"


# ---- _build_label_map ----


class TestBuildLabelMap:
    """_build_label_map 标签映射构建测试。"""

    def _make_module_with_router(
        self, prefix, label, route_path, mod_name
    ):
        """创建带路由的模拟模块。"""
        router = APIRouter(prefix=prefix)
        router.label = label

        endpoint = MagicMock()
        endpoint.__module__ = mod_name

        @router.get(route_path, summary="测试")
        async def test_endpoint():
            """测试端点。"""

        # 修正 endpoint 的 module
        for r in router.routes:
            if isinstance(r, APIRoute):
                r.endpoint.__module__ = mod_name

        return router

    @patch("api.core.permission_tree.importlib")
    def test_basic_label_map(self, mock_importlib):
        """基本标签映射构建。"""
        mod = ModuleType("api.admin.user.router")
        router = self._make_module_with_router(
            "/users", "用户管理", "/list", "api.admin.user.router"
        )
        mod.router = router
        mock_importlib.import_module.return_value = mod

        module_routes = {
            "api.admin.user.router": [
                ("/admin/users/list", "用户列表"),
            ],
        }
        result = _build_label_map(module_routes)
        assert result["/admin/users"] == "用户管理"

    @patch("api.core.permission_tree.importlib")
    def test_skips_no_prefix_router(self, mock_importlib):
        """跳过无 prefix 的 router。"""
        mod = ModuleType("api.admin.config.router")
        router = APIRouter()
        router.label = "系统设置"
        mod.router = router
        mock_importlib.import_module.return_value = mod

        module_routes = {
            "api.admin.config.router": [
                ("/admin/web-settings/list", "配置列表"),
            ],
        }
        result = _build_label_map(module_routes)
        assert "/admin" not in result


# ---- _build_tree_from_routes ----


class TestBuildTreeFromRoutes:
    """_build_tree_from_routes 树构建测试。"""

    def _make_route(self, path, summary):
        """创建模拟 APIRoute。"""
        endpoint = MagicMock()
        endpoint.__module__ = "test"
        route = MagicMock(spec=APIRoute)
        route.path = path
        route.summary = summary
        route.endpoint = endpoint
        return route

    def test_basic_tree(self):
        """基本树结构：面板 + 分支 + 叶子。"""
        app = MagicMock()
        app.routes = [
            self._make_route("/admin/users/list", "用户列表"),
            self._make_route(
                "/admin/users/list/detail", "用户详情"
            ),
        ]
        label_map = {
            "/admin": "管理后台",
            "/portal": "用户面板",
            "/admin/users": "用户管理",
        }
        result = _build_tree_from_routes(app, label_map)
        admin = result["admin"]
        assert admin["description"] == "管理后台"
        assert "users" in admin["children"]
        users = admin["children"]["users"]
        assert users["description"] == "用户管理"
        assert users["children"]["list"]["description"] == "用户列表"
        assert (
            users["children"]["list/detail"]["description"]
            == "用户详情"
        )

    def test_nested_branch(self):
        """嵌套分支节点（如 web-settings/articles）。"""
        app = MagicMock()
        app.routes = [
            self._make_route(
                "/admin/web-settings/articles/list", "文章列表"
            ),
        ]
        label_map = {
            "/admin": "管理后台",
            "/portal": "用户面板",
            "/admin/web-settings": "网站设置",
            "/admin/web-settings/articles": "文章管理",
        }
        result = _build_tree_from_routes(app, label_map)
        children = result["admin"]["children"]
        assert "web-settings" in children
        ws = children["web-settings"]
        assert ws["description"] == "网站设置"
        assert "articles" in ws["children"]
        articles = ws["children"]["articles"]
        assert articles["description"] == "文章管理"
        assert articles["children"]["list"]["description"] == "文章列表"

    def test_skips_non_panel_routes(self):
        """跳过非面板路由。"""
        app = MagicMock()
        app.routes = [
            self._make_route("/auth/login", "登录"),
        ]
        label_map = {
            "/admin": "管理后台",
            "/portal": "用户面板",
        }
        result = _build_tree_from_routes(app, label_map)
        assert result["admin"]["children"] == {
            "dashboard": {"description": "管理仪表盘"},
        }

    def test_existing_branch_without_children_key(self):
        """分支节点已存在但无 children 键时自动补充。"""
        app = MagicMock()
        app.routes = [
            self._make_route(
                "/admin/web-settings/articles/list",
                "文章列表",
            ),
            self._make_route(
                "/admin/web-settings/articles/list/create",
                "创建文章",
            ),
        ]
        label_map = {
            "/admin": "管理后台",
            "/portal": "用户面板",
            "/admin/web-settings": "网站设置",
            "/admin/web-settings/articles": "文章管理",
        }
        result = _build_tree_from_routes(app, label_map)
        ws = result["admin"]["children"]["web-settings"]
        articles = ws["children"]["articles"]
        # 两个叶子节点都存在
        assert "list" in articles["children"]
        assert "list/create" in articles["children"]


# ---- build_permission_tree ----


class TestBuildPermissionTree:
    """build_permission_tree 完整权限树生成测试。"""

    @patch("api.core.permission_tree._build_tree_from_routes")
    @patch("api.core.permission_tree._add_panel_labels")
    @patch("api.core.permission_tree._build_label_map")
    @patch("api.core.permission_tree._collect_panel_routes")
    def test_calls_pipeline(
        self, mock_collect, mock_label, mock_panels, mock_tree
    ):
        """验证构建流水线调用顺序。"""
        mock_collect.return_value = {}
        mock_label.return_value = {}
        mock_tree.return_value = {"admin": {}, "portal": {}}

        app = MagicMock()
        result = build_permission_tree(app)

        mock_collect.assert_called_once_with(app)
        mock_label.assert_called_once()
        mock_panels.assert_called_once()
        mock_tree.assert_called_once()
        assert "admin" in result

    @patch("api.core.permission_tree.importlib")
    def test_integration_with_mock_app(self, mock_importlib):
        """使用模拟应用测试完整权限树生成。"""
        # 构造模拟模块
        admin_mod = MagicMock()
        admin_mod.description = "管理后台"
        portal_mod = MagicMock()
        portal_mod.description = "用户面板"
        user_mod = ModuleType("api.admin.user.router")
        router = APIRouter(prefix="/users")
        router.label = "用户管理"

        endpoint1 = MagicMock()
        endpoint1.__module__ = "api.admin.user.router"

        @router.get("/list", summary="用户列表")
        async def list_users():
            """测试。"""

        for r in router.routes:
            if isinstance(r, APIRoute):
                r.endpoint.__module__ = "api.admin.user.router"

        user_mod.router = router

        def import_side(name):
            """按模块名返回模拟模块。"""
            if name == "api.admin":
                return admin_mod
            if name == "api.portal":
                return portal_mod
            if name == "api.admin.user.router":
                return user_mod
            if name == "api.admin.user":
                return user_mod
            raise ImportError

        mock_importlib.import_module.side_effect = import_side

        # 构造模拟 app
        route = MagicMock(spec=APIRoute)
        route.path = "/admin/users/list"
        route.summary = "用户列表"
        route.endpoint = MagicMock()
        route.endpoint.__module__ = "api.admin.user.router"

        app = MagicMock()
        app.routes = [route]

        result = build_permission_tree(app)

        assert result["admin"]["description"] == "管理后台"
        assert result["portal"]["description"] == "用户面板"
        assert "users" in result["admin"]["children"]
        users = result["admin"]["children"]["users"]
        assert users["description"] == "用户管理"
        assert users["children"]["list"]["description"] == "用户列表"
