"""Banner 管理接口。"""

from fastapi import APIRouter, File, UploadFile, status

from api.core.dependencies import DbSession

from .schemas import BannerRemoveRequest, BannerReorderRequest
from .service import BannerService

router = APIRouter(prefix="/banners", tags=["admin-banners"])


@router.get("/list", summary="获取所有 Banner 配置")
async def list_banners(session: DbSession) -> dict:
    """获取所有页面的 Banner 配置。"""
    svc = BannerService(session)
    return await svc.get_all_banners()


@router.post("/upload", summary="上传 Banner 图片")
async def upload_banner(
    page_key: str,
    session: DbSession,
    file: UploadFile = File(...),
) -> dict:
    """上传 Banner 图片到指定页面。"""
    svc = BannerService(session)
    image_id = await svc.upload_banner(page_key, file)
    return {"image_id": image_id}


@router.post(
    "/remove", status_code=status.HTTP_204_NO_CONTENT, summary="移除 Banner 图片"
)
async def remove_banner(data: BannerRemoveRequest, session: DbSession) -> None:
    """从指定页面移除 Banner 图片。"""
    svc = BannerService(session)
    await svc.remove_banner(data.page_key, data.image_id)


@router.post(
    "/reorder", status_code=status.HTTP_204_NO_CONTENT, summary="重排 Banner 图片"
)
async def reorder_banners(data: BannerReorderRequest, session: DbSession) -> None:
    """重排指定页面的 Banner 图片顺序。"""
    svc = BannerService(session)
    await svc.reorder_banners(data.page_key, data.image_ids)
