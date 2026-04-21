"""通用图片上传接口。"""

from fastapi import APIRouter, File, UploadFile

from api.core.dependencies import DbSession
from app.core.exceptions import BadRequestException
from app.db.image import repository as image_repo
from app.db.image.repository import ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE

router = APIRouter(prefix="/images", tags=["admin-images"])
router.label = "图片上传"


@router.post("/upload", summary="上传图片")
async def upload_image(session: DbSession, file: UploadFile = File(...)) -> dict:
    """上传图片到 image 表，返回 id 和公开 URL。"""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise BadRequestException(
            message="不支持的图片格式", code="INVALID_IMAGE_TYPE"
        )

    file_data = await file.read()
    if len(file_data) > MAX_IMAGE_SIZE:
        raise BadRequestException(
            message="图片大小不能超过 5MB", code="IMAGE_TOO_LARGE"
        )

    image = await image_repo.create_image(
        session,
        file_data,
        file.filename or "image",
        file.content_type,
    )
    return {"id": image.id, "url": f"/api/public/images/detail?id={image.id}"}
