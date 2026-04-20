"""Banner 管理服务。"""

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.db.config import repository as config_repo
from app.db.image import repository as image_repo
from app.db.image.repository import ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE


class BannerService:
    """Banner 管理服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_all_banners(self) -> dict:
        """获取所有页面的 Banner 配置。"""
        config = await config_repo.get_by_key(self.session, "page_banners")
        if not config:
            return {}
        return config.value

    async def upload_banner(self, page_key: str, file: UploadFile) -> str:
        """上传 Banner 图片到指定页面。"""
        config = await config_repo.get_by_key(self.session, "page_banners")
        if not config:
            raise NotFoundException(
                message="Banner 配置不存在", code="BANNER_CONFIG_NOT_FOUND"
            )

        banners = config.value
        if page_key not in banners:
            raise BadRequestException(
                message=f"无效的页面 key: {page_key}", code="INVALID_PAGE_KEY"
            )

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
            self.session,
            file_data,
            file.filename or "banner",
            file.content_type,
        )

        banners[page_key]["image_ids"].append(image.id)
        await config_repo.update_value(self.session, config, banners)
        await self.session.commit()
        return image.id

    async def remove_banner(self, page_key: str, image_id: str) -> None:
        """从指定页面移除 Banner 图片。"""
        config = await config_repo.get_by_key(self.session, "page_banners")
        if not config:
            raise NotFoundException(
                message="Banner 配置不存在", code="BANNER_CONFIG_NOT_FOUND"
            )

        banners = config.value
        if page_key not in banners:
            raise BadRequestException(
                message=f"无效的页面 key: {page_key}", code="INVALID_PAGE_KEY"
            )

        ids = banners[page_key]["image_ids"]
        if image_id not in ids:
            raise NotFoundException(
                message="图片不存在于该页面", code="BANNER_IMAGE_NOT_FOUND"
            )

        ids.remove(image_id)
        await config_repo.update_value(self.session, config, banners)
        await self.session.commit()

    async def reorder_banners(self, page_key: str, image_ids: list[str]) -> None:
        """重排指定页面的 Banner 图片顺序。"""
        config = await config_repo.get_by_key(self.session, "page_banners")
        if not config:
            raise NotFoundException(
                message="Banner 配置不存在", code="BANNER_CONFIG_NOT_FOUND"
            )

        banners = config.value
        if page_key not in banners:
            raise BadRequestException(
                message=f"无效的页面 key: {page_key}", code="INVALID_PAGE_KEY"
            )

        banners[page_key]["image_ids"] = image_ids
        await config_repo.update_value(self.session, config, banners)
        await self.session.commit()
