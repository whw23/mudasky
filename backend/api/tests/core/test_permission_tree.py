"""权限树生成模块单元测试。

覆盖 _build_folder_tree、_insert_endpoint、build_permission_tree。
"""

from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest

from api.core.permission_tree import (
    _build_folder_tree,
    _insert_endpoint,
    build_permission_tree,
)


# ---- _build_folder_tree ----


class TestBuildFolderTree:
    """_build_folder_tree 递归扫描测试。"""

    @patch("api.core.permission_tree.pkgutil")
    @patch("api.core.permission_tree.importlib")
    def test_empty_package(self, mock_importlib, mock_pkgutil):
        """空包返回空字典。"""
        pkg = ModuleType("api.admin")
        pkg.__path__ = ["/fake/path"]
        mock_importlib.import_module.return_value = pkg
        mock_pkgutil.iter_modules.return_value = []

        result = _build_folder_tree("api.admin")

        assert result == {}

    @patch("api.core.permission_tree.pkgutil")
    @patch("api.core.permission_tree.importlib")
    def test_import_error(self, mock_importlib, mock_pkgutil):
        """ImportError 时返回空字典。"""
        mock_importlib.import_module.side_effect = ImportError

        result = _build_folder_tree("api.nonexistent")

        assert result == {}

    @patch("api.core.permission_tree.pkgutil")
    @patch("api.core.permission_tree.importlib")
    def test_skips_non_packages(self, mock_importlib, mock_pkgutil):
        """非包（is_pkg=False）应被跳过。"""
        pkg = ModuleType("api.admin")
        pkg.__path__ = ["/fake/path"]
        mock_importlib.import_module.return_value = pkg
        mock_pkgutil.iter_modules.return_value = [
            (None, "router", False),
            (None, "schemas", False),
        ]

        result = _build_folder_tree("api.admin")

        assert result == {}

    @patch("api.core.permission_tree.pkgutil")
    @patch("api.core.permission_tree.importlib")
    def test_single_subpackage_with_description(
        self, mock_importlib, mock_pkgutil
    ):
        """单个子包，带 description 属性。"""
        pkg = ModuleType("api.admin")
        pkg.__path__ = ["/fake/path"]

        sub_pkg = ModuleType("api.admin.user")
        sub_pkg.description = "用户管理"
        sub_pkg.__path__ = ["/fake/path/user"]

        def import_side_effect(name):
            """按包名返回对应模块。"""
            if name == "api.admin":
                return pkg
            if name == "api.admin.user":
                return sub_pkg
            raise ImportError

        mock_importlib.import_module.side_effect = (
            import_side_effect
        )

        # 顶层有一个子包 user，user 下无子包
        call_count = 0

        def iter_modules_side_effect(path):
            """第一次返回子包列表，第二次返回空。"""
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return [(None, "user", True)]
            return []

        mock_pkgutil.iter_modules.side_effect = (
            iter_modules_side_effect
        )

        result = _build_folder_tree("api.admin")

        assert "user" in result
        assert result["user"]["description"] == "用户管理"
        assert "children" not in result["user"]

    @patch("api.core.permission_tree.pkgutil")
    @patch("api.core.permission_tree.importlib")
    def test_subpackage_without_description_uses_name(
        self, mock_importlib, mock_pkgutil
    ):
        """子包没有 description 属性时使用模块名作为描述。"""
        pkg = ModuleType("api.admin")
        pkg.__path__ = ["/fake/path"]

        sub_pkg = ModuleType("api.admin.config")
        sub_pkg.__path__ = ["/fake/path/config"]
        # 不设置 description

        def import_side_effect(name):
            """按包名返回对应模块。"""
            if name == "api.admin":
                return pkg
            if name == "api.admin.config":
                return sub_pkg
            raise ImportError

        mock_importlib.import_module.side_effect = (
            import_side_effect
        )

        call_count = 0

        def iter_modules_side_effect(path):
            """仅顶层返回子包。"""
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return [(None, "config", True)]
            return []

        mock_pkgutil.iter_modules.side_effect = (
            iter_modules_side_effect
        )

        result = _build_folder_tree("api.admin")

        assert result["config"]["description"] == "config"

    @patch("api.core.permission_tree.pkgutil")
    @patch("api.core.permission_tree.importlib")
    def test_nested_subpackages(
        self, mock_importlib, mock_pkgutil
    ):
        """嵌套子包生成 children 层级。"""
        pkg = ModuleType("api.portal")
        pkg.__path__ = ["/fake/portal"]

        profile = ModuleType("api.portal.profile")
        profile.description = "个人资料"
        profile.__path__ = ["/fake/portal/profile"]

        sessions = ModuleType("api.portal.profile.sessions")
        sessions.description = "会话管理"
        sessions.__path__ = ["/fake/portal/profile/sessions"]

        modules = {
            "api.portal": pkg,
            "api.portal.profile": profile,
            "api.portal.profile.sessions": sessions,
        }

        mock_importlib.import_module.side_effect = (
            lambda name: modules[name]
        )

        call_count = 0

        def iter_modules_side_effect(path):
            """按层级返回子包。"""
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return [(None, "profile", True)]
            if call_count == 2:
                return [(None, "sessions", True)]
            return []

        mock_pkgutil.iter_modules.side_effect = (
            iter_modules_side_effect
        )

        result = _build_folder_tree("api.portal")

        assert result["profile"]["description"] == "个人资料"
        assert "children" in result["profile"]
        children = result["profile"]["children"]
        assert children["sessions"]["description"] == "会话管理"


# ---- _insert_endpoint ----


class TestInsertEndpoint:
    """_insert_endpoint 端点插入测试。"""

    def test_empty_segments(self):
        """空路径段不做任何操作。"""
        tree = {}
        _insert_endpoint(tree, [], "操作")
        assert tree == {}

    def test_single_segment_new_node(self):
        """单段路径创建新叶子节点。"""
        tree = {}
        _insert_endpoint(tree, ["list"], "查看列表")
        assert tree == {"list": {"description": "查看列表"}}

    def test_single_segment_existing_node(self):
        """单段路径更新已有节点的描述。"""
        tree = {"list": {"description": "旧描述"}}
        _insert_endpoint(tree, ["list"], "新描述")
        assert tree["list"]["description"] == "新描述"

    def test_multi_segment_creates_hierarchy(self):
        """多段路径创建层级结构。"""
        tree = {}
        _insert_endpoint(tree, ["user", "list"], "用户列表")

        assert "user" in tree
        assert tree["user"]["description"] == "user"
        assert "children" in tree["user"]
        assert tree["user"]["children"]["list"][
            "description"
        ] == "用户列表"

    def test_multi_segment_existing_parent(self):
        """已有父节点时在 children 下插入。"""
        tree = {
            "user": {
                "description": "用户管理",
                "children": {},
            }
        }
        _insert_endpoint(tree, ["user", "create"], "创建用户")

        assert tree["user"]["children"]["create"][
            "description"
        ] == "创建用户"

    def test_multi_segment_parent_without_children(self):
        """父节点没有 children 时自动创建。"""
        tree = {"user": {"description": "用户管理"}}
        _insert_endpoint(tree, ["user", "delete"], "删除用户")

        assert "children" in tree["user"]
        assert tree["user"]["children"]["delete"][
            "description"
        ] == "删除用户"

    def test_three_level_depth(self):
        """三级深度路径正确嵌套。"""
        tree = {}
        _insert_endpoint(
            tree,
            ["profile", "sessions", "revoke"],
            "撤销会话",
        )

        assert tree["profile"]["children"]["sessions"][
            "children"
        ]["revoke"]["description"] == "撤销会话"


# ---- build_permission_tree ----


class TestBuildPermissionTree:
    """build_permission_tree 完整权限树生成测试。"""

    @patch("api.core.permission_tree._build_folder_tree")
    @patch("api.core.permission_tree.importlib")
    def test_basic_tree_structure(
        self, mock_importlib, mock_folder_tree
    ):
        """生成包含 admin 和 portal 的基本树结构。"""
        mock_folder_tree.return_value = {}

        admin_mod = MagicMock()
        admin_mod.description = "管理后台"
        portal_mod = MagicMock()
        portal_mod.description = "用户中心"

        def import_side_effect(name):
            """按面板名返回模块。"""
            if name == "api.admin":
                return admin_mod
            if name == "api.portal":
                return portal_mod
            raise ImportError

        mock_importlib.import_module.side_effect = (
            import_side_effect
        )

        mock_app = MagicMock()
        mock_app.openapi.return_value = {"paths": {}}

        result = build_permission_tree(mock_app)

        assert "admin" in result
        assert "portal" in result
        assert result["admin"]["description"] == "管理后台"
        assert result["portal"]["description"] == "用户中心"

    @patch("api.core.permission_tree._build_folder_tree")
    @patch("api.core.permission_tree.importlib")
    def test_openapi_endpoints_inserted(
        self, mock_importlib, mock_folder_tree
    ):
        """OpenAPI 端点正确插入到权限树中。"""
        mock_folder_tree.return_value = {}

        admin_mod = MagicMock()
        admin_mod.description = "管理后台"
        portal_mod = MagicMock()
        portal_mod.description = "用户中心"

        mock_importlib.import_module.side_effect = (
            lambda name: admin_mod
            if name == "api.admin"
            else portal_mod
        )

        mock_app = MagicMock()
        mock_app.openapi.return_value = {
            "paths": {
                "/api/admin/user/list": {
                    "get": {"summary": "用户列表"}
                },
                "/api/portal/profile/update": {
                    "post": {"summary": "更新个人资料"}
                },
            }
        }

        result = build_permission_tree(mock_app)

        admin_children = result["admin"]["children"]
        assert "user" in admin_children
        assert (
            admin_children["user"]["children"]["list"][
                "description"
            ]
            == "用户列表"
        )

        portal_children = result["portal"]["children"]
        assert "profile" in portal_children

    @patch("api.core.permission_tree._build_folder_tree")
    @patch("api.core.permission_tree.importlib")
    def test_non_admin_portal_paths_skipped(
        self, mock_importlib, mock_folder_tree
    ):
        """非 admin/portal 路径被跳过。"""
        mock_folder_tree.return_value = {}
        mod = MagicMock()
        mod.description = "面板"
        mock_importlib.import_module.return_value = mod

        mock_app = MagicMock()
        mock_app.openapi.return_value = {
            "paths": {
                "/api/auth/login": {
                    "post": {"summary": "登录"}
                },
                "/api/public/config": {
                    "get": {"summary": "公开配置"}
                },
                "/health": {"get": {"summary": "健康检查"}},
            }
        }

        result = build_permission_tree(mock_app)

        # auth/public/health 路径不应出现在树中
        admin_children = result["admin"]["children"]
        portal_children = result["portal"]["children"]
        assert "auth" not in admin_children
        assert "public" not in admin_children
        assert "auth" not in portal_children
        assert "health" not in portal_children

    @patch("api.core.permission_tree._build_folder_tree")
    @patch("api.core.permission_tree.importlib")
    def test_single_segment_path_skipped(
        self, mock_importlib, mock_folder_tree
    ):
        """只有一个路径段的端点被跳过（len < 2）。"""
        mock_folder_tree.return_value = {}
        mod = MagicMock()
        mod.description = "面板"
        mock_importlib.import_module.return_value = mod

        mock_app = MagicMock()
        mock_app.openapi.return_value = {
            "paths": {
                "/api/admin": {
                    "get": {"summary": "管理面板首页"}
                },
            }
        }

        result = build_permission_tree(mock_app)

        # 单段路径不应插入 children
        assert result["admin"]["children"] == {}

    @patch("api.core.permission_tree._build_folder_tree")
    @patch("api.core.permission_tree.importlib")
    def test_no_paths_in_openapi(
        self, mock_importlib, mock_folder_tree
    ):
        """OpenAPI 无 paths 时仍正常返回树结构。"""
        mock_folder_tree.return_value = {"user": {"description": "用户"}}
        mod = MagicMock()
        mod.description = "面板"
        mock_importlib.import_module.return_value = mod

        mock_app = MagicMock()
        mock_app.openapi.return_value = {}

        result = build_permission_tree(mock_app)

        assert "admin" in result
        assert "portal" in result
        assert result["admin"]["children"]["user"]["description"] == "用户"

    @patch("api.core.permission_tree._build_folder_tree")
    @patch("api.core.permission_tree.importlib")
    def test_endpoint_without_summary(
        self, mock_importlib, mock_folder_tree
    ):
        """端点没有 summary 时使用空字符串。"""
        mock_folder_tree.return_value = {}
        mod = MagicMock()
        mod.description = "面板"
        mock_importlib.import_module.return_value = mod

        mock_app = MagicMock()
        mock_app.openapi.return_value = {
            "paths": {
                "/api/admin/user/list": {
                    "get": {}
                },
            }
        }

        result = build_permission_tree(mock_app)

        admin_children = result["admin"]["children"]
        assert (
            admin_children["user"]["children"]["list"][
                "description"
            ]
            == ""
        )
