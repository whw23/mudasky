"""FastAPI 应用入口。

根应用挂载 API 子应用到 /api 前缀。
开发环境下 Swagger UI 支持通过 Authorize 按钮设置网关注入的请求头。
"""

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

# RBAC 模型需在其他领域模块之前导入，确保关系映射正确注册
from app.db.rbac.models import Role  # noqa: F401
import app.db.config.models  # noqa: F401

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging

from .auth import router as auth_router
from .core.permission_tree import build_permission_tree
from .public import router as public_router
from .admin import router as admin_router
from .portal import router as portal_router

setup_logging()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """应用生命周期管理。"""
    # 权限树在 api 子应用上缓存（路由注册完成后生成）
    api.state.permission_tree = build_permission_tree(api)
    yield


# 根应用
app = FastAPI(title="mudasky", version="0.1.0", docs_url=None, lifespan=lifespan)

# API 子应用（生产环境关闭 docs）
api = FastAPI(
    title="mudasky API",
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)
register_exception_handlers(api)

if settings.DEBUG:

    def custom_openapi() -> dict[str, Any]:
        """自定义 OpenAPI schema，添加网关请求头认证方案。"""
        if api.openapi_schema:
            return api.openapi_schema
        from fastapi.openapi.utils import get_openapi

        schema = get_openapi(
            title=api.title,
            version=api.version,
            routes=api.routes,
        )
        schema["components"]["securitySchemes"] = {
            "X-User-Id": {
                "type": "apiKey",
                "in": "header",
                "name": "X-User-Id",
                "description": "用户 ID（网关注入，开发调试用）",
            },
            "X-User-Permissions": {
                "type": "apiKey",
                "in": "header",
                "name": "X-User-Permissions",
                "description": "用户权限列表，逗号分隔（网关注入，开发调试用）",
            },
            "X-User-Type": {
                "type": "apiKey",
                "in": "header",
                "name": "X-User-Type",
                "description": "用户类型：student / staff（网关注入，开发调试用）",
            },
            "X-Is-Superuser": {
                "type": "apiKey",
                "in": "header",
                "name": "X-Is-Superuser",
                "description": "是否超级管理员：true / false（网关注入，开发调试用）",
            },
        }
        schema["security"] = [
            {
                "X-User-Id": [],
                "X-User-Permissions": [],
                "X-User-Type": [],
                "X-Is-Superuser": [],
            }
        ]
        api.openapi_schema = schema
        return schema

    api.openapi = custom_openapi

# 挂载面板路由
api.include_router(auth_router)
api.include_router(public_router)
api.include_router(admin_router)
api.include_router(portal_router)


@api.get("/health", summary="健康检查")
async def api_health_check() -> dict:
    """API 健康检查端点。"""
    return {"status": "ok"}


# 挂载子应用
app.mount("/api", api)
