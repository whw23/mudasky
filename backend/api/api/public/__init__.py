"""公开接口。"""

from fastapi import APIRouter

from .case import router as case_router
from .config import router as config_router
from .content import router as content_router
from .discipline import router as discipline_router
from .image import router as image_router
from .university import router as university_router

description = "公开接口"

router = APIRouter(prefix="/public")
router.include_router(config_router)
router.include_router(content_router)
router.include_router(case_router)
router.include_router(university_router)
router.include_router(image_router)
router.include_router(discipline_router)

__all__ = ["router", "description"]
