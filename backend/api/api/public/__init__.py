"""Public 面板路由组装。"""

from fastapi import APIRouter

from .config import router as config_router
from .content import router as content_router
from .case import router as case_router
from .university import router as university_router

router = APIRouter(prefix="/public")
router.include_router(config_router)
router.include_router(content_router)
router.include_router(case_router)
router.include_router(university_router)
