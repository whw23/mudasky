"""公开图片服务。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.db.image import repository


class ImageService:
    """图片读取服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务。"""
        self.session = session

    async def get_image(self, image_id: str) -> tuple[bytes, str]:
        """获取图片数据和 MIME 类型。不存在则抛出异常。"""
        image = await repository.get_by_id(self.session, image_id)
        if not image:
            raise NotFoundException(
                message="图片不存在", code="IMAGE_NOT_FOUND"
            )
        return image.file_data, image.mime_type
