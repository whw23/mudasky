"""成功案例管理业务逻辑层。

处理成功案例的增删改查业务。
"""

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.db.case import repository
from app.db.case.models import SuccessCase
from app.db.image import repository as image_repo
from app.db.image.repository import ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE
from app.db.model_utils import apply_updates

from .schemas import CaseCreate, CaseUpdate


class CaseService:
    """成功案例业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def create_case(
        self, data: CaseCreate
    ) -> SuccessCase:
        """创建成功案例。"""
        case = SuccessCase(
            student_name=data.student_name,
            university=data.university,
            program=data.program,
            year=data.year,
            testimonial=data.testimonial,
            avatar_url=data.avatar_url,
            is_featured=data.is_featured,
            sort_order=data.sort_order,
            university_id=data.university_id,
        )
        return await repository.create_case(
            self.session, case
        )

    async def get_case(self, case_id: str) -> SuccessCase:
        """获取成功案例详情，不存在则抛出异常。"""
        case = await repository.get_case_by_id(
            self.session, case_id
        )
        if not case:
            raise NotFoundException(message="案例不存在", code="CASE_NOT_FOUND")
        return case

    async def update_case(
        self, case_id: str, data: CaseUpdate
    ) -> SuccessCase:
        """更新成功案例。"""
        case = await self.get_case(case_id)
        apply_updates(case, data)
        return await repository.update_case(
            self.session, case
        )

    async def delete_case(self, case_id: str) -> None:
        """删除成功案例。"""
        case = await self.get_case(case_id)
        await repository.delete_case(self.session, case)

    async def list_cases(
        self,
        offset: int,
        limit: int,
        year: int | None = None,
        featured: bool | None = None,
    ) -> tuple[list[SuccessCase], int]:
        """分页查询成功案例。"""
        return await repository.list_cases(
            self.session, offset, limit, year, featured
        )

    async def upload_avatar(self, case_id: str, file: UploadFile) -> str:
        """上传学生照片。"""
        case = await self.get_case(case_id)
        image = await self._save_image(file)
        case.avatar_image_id = image.id
        await repository.update_case(self.session, case)
        return image.id

    async def upload_offer(self, case_id: str, file: UploadFile) -> str:
        """上传录取通知书图片。"""
        case = await self.get_case(case_id)
        image = await self._save_image(file)
        case.offer_image_id = image.id
        await repository.update_case(self.session, case)
        return image.id

    async def _save_image(self, file: UploadFile):
        """校验并保存图片。"""
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise BadRequestException(
                message="不支持的图片格式",
                code="INVALID_IMAGE_TYPE",
            )
        file_data = await file.read()
        if len(file_data) > MAX_IMAGE_SIZE:
            raise BadRequestException(
                message="图片大小不能超过 10MB",
                code="IMAGE_TOO_LARGE",
            )
        return await image_repo.create_image(
            self.session, file_data, file.filename or "image", file.content_type,
        )
