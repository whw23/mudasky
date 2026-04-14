"""管理后台。"""

from fastapi import APIRouter

from .case import router as case_router
from .config import router as config_router
from .contacts import router as contacts_router
from .content import router as content_router
from .rbac import router as rbac_router
from .students import router as students_router
from .university import router as university_router
from .user import router as user_router

description = "管理后台"

router = APIRouter(prefix="/admin")
router.include_router(user_router)
router.include_router(rbac_router)
router.include_router(config_router)
router.include_router(content_router)
router.include_router(case_router)
router.include_router(university_router)
router.include_router(students_router)
router.include_router(contacts_router)

__all__ = ["router", "description"]
