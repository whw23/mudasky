"""FastAPI 应用入口。

根应用挂载 API 子应用到 /api 前缀。
开发环境下 Swagger UI 支持通过 Authorize 按钮设置网关注入的请求头。
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI

# RBAC 模型需在其他领域模块之前导入，确保关系映射正确注册
from app.rbac.models import Permission, Role  # noqa: F401
import app.config.models  # noqa: F401 — 注册 ORM 映射
from app.admin.router import router as admin_router
from app.case.admin_router import admin_router as case_admin_router
from app.case.router import router as case_router
from app.config.router import router as config_router
from app.auth.router import router as auth_router
from app.content.admin_router import admin_router as content_admin_router
from app.content.router import router as content_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.document.router import router as document_router
from app.rbac.router import router as rbac_router
from app.university.router import (
    admin_router as university_admin_router,
    public_router as university_public_router,
)
from app.user.router import router as user_router

setup_logging()

logger = logging.getLogger(__name__)

CLEANUP_INTERVAL = 3600  # 清理间隔（秒）


async def _cleanup_expired_data() -> None:
    """后台定时清理过期的验证码和刷新令牌。"""
    from app.auth import repository as auth_repo
    from app.core.database import async_session_factory

    while True:
        await asyncio.sleep(CLEANUP_INTERVAL)
        try:
            async with async_session_factory() as session:
                count = await auth_repo.delete_expired_refresh_tokens(session)
                if count:
                    logger.info("清理过期刷新令牌: %d 条", count)
        except Exception:
            logger.exception("清理过期数据失败")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """应用生命周期管理。"""
    task = asyncio.create_task(_cleanup_expired_data())
    yield
    task.cancel()


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

api.include_router(auth_router)
api.include_router(user_router)
api.include_router(content_router)
api.include_router(content_admin_router)
api.include_router(case_router)
api.include_router(case_admin_router)
api.include_router(document_router)
api.include_router(admin_router)
api.include_router(rbac_router)
api.include_router(config_router)
api.include_router(university_public_router)
api.include_router(university_admin_router)


@api.get("/health")
async def api_health_check() -> dict:
    """API 健康检查端点。"""
    return {"status": "ok"}


# 挂载子应用
app.mount("/api", api)
