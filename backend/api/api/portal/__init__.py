"""Portal 面板路由组装。"""

from fastapi import APIRouter

from .content import router as content_router
from .document import router as document_router
from .user import router as user_router

router = APIRouter(prefix="/portal")
router.include_router(user_router)
router.include_router(document_router)
router.include_router(content_router)
