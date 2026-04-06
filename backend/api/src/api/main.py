"""FastAPI 应用入口。

根应用挂载 API 子应用到 /api 前缀。
"""

from fastapi import FastAPI

from app.admin.router import router as admin_router
from app.auth.router import router as auth_router
from app.content.router import router as content_router
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.document.router import router as document_router
from app.user.router import router as user_router

setup_logging()

# 根应用
app = FastAPI(title="mudasky", version="0.1.0")

# API 子应用
api = FastAPI(title="mudasky API", version="0.1.0")
register_exception_handlers(api)

api.include_router(auth_router)
api.include_router(user_router)
api.include_router(content_router)
api.include_router(document_router)
api.include_router(admin_router)

# 挂载子应用
app.mount("/api", api)


async def health_check() -> dict:
    """健康检查端点。"""
    return {"status": "ok"}


app.get("/health")(health_check)
api.get("/health")(health_check)
