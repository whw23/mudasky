"""FastAPI 应用入口。

根应用挂载 API 子应用到 /api 前缀。
开发环境下 Swagger UI 支持通过 Authorize 按钮设置网关注入的请求头。
"""

from typing import Any

from fastapi import FastAPI

from app.admin.router import router as admin_router
from app.auth.router import router as auth_router
from app.content.router import router as content_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.document.router import router as document_router
from app.user.router import router as user_router

setup_logging()

# 根应用
app = FastAPI(title="mudasky", version="0.1.0", docs_url=None)

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
            "X-User-Role": {
                "type": "apiKey",
                "in": "header",
                "name": "X-User-Role",
                "description": "用户角色：user / admin（网关注入，开发调试用）",
            },
        }
        schema["security"] = [{"X-User-Id": [], "X-User-Role": []}]
        api.openapi_schema = schema
        return schema

    api.openapi = custom_openapi

api.include_router(auth_router)
api.include_router(user_router)
api.include_router(content_router)
api.include_router(document_router)
api.include_router(admin_router)


@api.get("/health")
async def api_health_check() -> dict:
    """API 健康检查端点。"""
    return {"status": "ok"}


# 挂载子应用
app.mount("/api", api)


@app.get("/health")
async def health_check() -> dict:
    """健康检查端点。"""
    return {"status": "ok"}
