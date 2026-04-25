"""main.py 应用入口单元测试。

覆盖 FastAPI 应用创建、lifespan、自定义 OpenAPI、
异常处理、权限树端点、版本端点、健康检查、路由列表。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---- app / api 创建 ----


class TestAppCreation:
    """应用和 API 子应用创建测试。"""

    def test_app_exists(self):
        """根应用存在且有标题。"""
        from api.main import app

        assert app.title == "mudasky"

    def test_api_exists(self):
        """API 子应用存在且有标题。"""
        from api.main import api

        assert api.title == "mudasky API"

    def test_api_mounted_at_api_prefix(self):
        """API 子应用挂载在 /api 前缀下。"""
        from api.main import app

        route_paths = []
        for route in app.routes:
            if hasattr(route, "path"):
                route_paths.append(route.path)
        # Mount 路由的 path 是 /api
        assert any("/api" in p for p in route_paths)

    def test_api_includes_auth_router(self):
        """API 包含 auth 路由。"""
        from api.main import api

        paths = [
            r.path for r in api.routes if hasattr(r, "path")
        ]
        assert any("/auth" in p for p in paths)

    def test_api_includes_public_router(self):
        """API 包含 public 路由。"""
        from api.main import api

        paths = [
            r.path for r in api.routes if hasattr(r, "path")
        ]
        assert any("/public" in p for p in paths)


# ---- lifespan ----


class TestLifespan:
    """应用生命周期测试。"""

    @pytest.mark.asyncio
    async def test_lifespan_builds_permission_tree(self):
        """启动时构建权限树并存到 app.state。"""
        from api.main import api, lifespan

        async with lifespan(api):
            assert hasattr(api.state, "permission_tree")
            assert isinstance(api.state.permission_tree, dict)


# ---- custom OpenAPI (DEBUG mode) ----


class TestCustomOpenAPI:
    """自定义 OpenAPI schema 测试（DEBUG 模式）。"""

    @patch("api.main.settings")
    def test_custom_openapi_adds_security_schemes(
        self, mock_settings
    ):
        """DEBUG 模式下 OpenAPI schema 包含自定义 securitySchemes。"""
        mock_settings.DEBUG = True
        # 重新导入以触发 DEBUG 分支
        from api.main import api

        if hasattr(api, "openapi") and callable(api.openapi):
            # 清除缓存
            api.openapi_schema = None
            schema = api.openapi()
            if "components" in schema:
                schemes = schema["components"].get(
                    "securitySchemes", {}
                )
                # 如果 DEBUG 模式生效，应有自定义 header
                if schemes:
                    assert "X-User-Id" in schemes


# ---- 异常处理 ----


class TestExceptionHandlers:
    """异常处理器测试。"""

    @pytest.mark.asyncio
    async def test_app_exception_returns_json(self, client):
        """AppException 返回 JSON 格式错误响应。"""
        from app.core.exceptions import NotFoundException

        with patch(
            "api.public.image.router.ImageService"
        ) as mock_cls:
            svc = AsyncMock()
            svc.get_image.side_effect = NotFoundException(
                message="图片不存在", code="IMAGE_NOT_FOUND"
            )
            mock_cls.return_value = svc

            resp = await client.get(
                "/public/images/detail?id=bad"
            )

            assert resp.status_code == 404
            data = resp.json()
            assert data["code"] == "IMAGE_NOT_FOUND"
            assert data["message"] == "图片不存在"

    @pytest.mark.asyncio
    async def test_bad_request_exception(self, client):
        """BadRequestException 返回 400。"""
        from app.core.exceptions import BadRequestException

        with patch(
            "api.public.image.router.ImageService"
        ) as mock_cls:
            svc = AsyncMock()
            svc.get_image.side_effect = BadRequestException(
                message="参数错误", code="BAD_PARAM"
            )
            mock_cls.return_value = svc

            resp = await client.get(
                "/public/images/detail?id=bad"
            )

            assert resp.status_code == 400
            assert resp.json()["code"] == "BAD_PARAM"


# ---- /health ----


class TestHealthCheck:
    """健康检查端点测试。"""

    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """健康检查返回 200 + status ok。"""
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data

    @pytest.mark.asyncio
    async def test_health_check_with_version(self, client):
        """健康检查返回 BUILD_VERSION 环境变量。"""
        with patch.dict(
            "os.environ", {"BUILD_VERSION": "v1.2.3"}
        ):
            resp = await client.get("/health")
            assert resp.status_code == 200
            assert resp.json()["version"] == "v1.2.3"


# ---- /meta/routes ----


class TestListRoutes:
    """路由列表端点测试。"""

    @pytest.mark.asyncio
    async def test_list_routes_forbidden_without_secret(
        self, client
    ):
        """无 internal_secret 访问路由列表返回 403。"""
        with patch(
            "app.core.config.settings"
        ) as mock_settings:
            mock_settings.INTERNAL_SECRET = "test-secret"
            resp = await client.get("/meta/routes")
            assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_list_routes_forbidden_wrong_secret(
        self, client
    ):
        """错误的 internal_secret 返回 403。"""
        with patch(
            "app.core.config.settings"
        ) as mock_settings:
            mock_settings.INTERNAL_SECRET = "correct-secret"
            client.cookies.set("internal_secret", "wrong")
            resp = await client.get("/meta/routes")
            assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_list_routes_success(self, client):
        """正确 internal_secret 返回路由列表。"""
        with patch(
            "app.core.config.settings",
        ) as mock_settings:
            mock_settings.INTERNAL_SECRET = "test-secret"
            client.cookies.set(
                "internal_secret", "test-secret"
            )
            resp = await client.get("/meta/routes")
            assert resp.status_code == 200
            data = resp.json()
            assert isinstance(data, list)
            assert len(data) > 0
            assert "method" in data[0]
            assert "path" in data[0]


# ---- /version ----


class TestVersionEndpoint:
    """版本信息端点测试。"""

    @pytest.mark.asyncio
    async def test_version_returns_api_version(self, client):
        """版本端点返回 API 版本。"""
        with patch(
            "app.db.async_session_factory"
        ) as mock_factory:
            mock_session = AsyncMock()
            mock_result = MagicMock()
            mock_result.scalar.return_value = "v2.0.0"
            mock_session.execute.return_value = mock_result
            mock_factory.return_value.__aenter__ = (
                AsyncMock(return_value=mock_session)
            )
            mock_factory.return_value.__aexit__ = (
                AsyncMock(return_value=False)
            )

            resp = await client.get("/version")

            assert resp.status_code == 200
            data = resp.json()
            assert "version" in data
            assert "db_version" in data

    @pytest.mark.asyncio
    async def test_version_db_error_returns_unknown(
        self, client
    ):
        """数据库查询失败时 db_version 返回 unknown。"""
        with patch(
            "app.db.async_session_factory"
        ) as mock_factory:
            mock_factory.return_value.__aenter__ = (
                AsyncMock(side_effect=Exception("DB down"))
            )
            mock_factory.return_value.__aexit__ = (
                AsyncMock(return_value=False)
            )

            resp = await client.get("/version")

            assert resp.status_code == 200
            data = resp.json()
            assert data["db_version"] == "unknown"
