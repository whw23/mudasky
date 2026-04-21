"""个人资料。"""

from fastapi import APIRouter

from .router import router as profile_router
from .sessions import router as sessions_router
from .two_factor import router as two_factor_router

description = "个人资料"

router = APIRouter(prefix="/profile")
router.label = "个人资料"
router.include_router(profile_router)
router.include_router(sessions_router)
router.include_router(two_factor_router)

__all__ = ["router", "description"]
