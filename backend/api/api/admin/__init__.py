"""管理后台。"""

from fastapi import APIRouter

from .config import router as config_router
from .contacts import router as contacts_router
from .rbac import router as rbac_router
from .students import router as students_router
from .user import router as user_router

description = "管理后台"

router = APIRouter(prefix="/admin")
router.label = "管理后台"
router.include_router(user_router)
router.include_router(rbac_router)
router.include_router(config_router)
router.include_router(students_router)
router.include_router(contacts_router)

__all__ = ["router", "description"]
