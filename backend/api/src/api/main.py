"""FastAPI 应用入口。

挂载所有领域路由，注册异常处理。
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

app = FastAPI(title="mudasky", version="0.1.0")

register_exception_handlers(app)

app.include_router(auth_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(content_router, prefix="/api")
app.include_router(document_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/api/health")
async def health_check() -> dict:
    """健康检查端点。"""
    return {"status": "ok"}
