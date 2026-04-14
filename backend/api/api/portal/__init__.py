"""用户面板。"""

from fastapi import APIRouter

from .document import router as document_router
from .profile import router as profile_router

description = "用户面板"

router = APIRouter(prefix="/portal")
router.include_router(profile_router)
router.include_router(document_router)

__all__ = ["router", "description"]
