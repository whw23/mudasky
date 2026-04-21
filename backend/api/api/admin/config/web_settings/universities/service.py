"""合作院校管理业务逻辑层。

处理院校的增删改查业务。
"""

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from app.db.discipline import repository as disc_repo
from app.db.image import repository as image_repo
from app.db.image.repository import ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE
from app.db.model_utils import apply_updates
from app.db.university import repository
from app.db.university import program_repository as prog_repo
from app.db.university.image_models import UniversityImage
from app.db.university.models import University

from .schemas import (
    ProgramItem,
    UniversityCreate,
    UniversityUpdate,
)


class UniversityService:
    """院校业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def create_university(
        self, data: UniversityCreate
    ) -> University:
        """创建院校。"""
        university = University(
            name=data.name,
            name_en=data.name_en,
            country=data.country,
            province=data.province,
            city=data.city,
            logo_url=data.logo_url,
            description=data.description,
            website=data.website,
            is_featured=data.is_featured,
            sort_order=data.sort_order,
            admission_requirements=data.admission_requirements,
            scholarship_info=data.scholarship_info,
            qs_rankings=data.qs_rankings,
            latitude=data.latitude,
            longitude=data.longitude,
        )
        return await repository.create_university(
            self.session, university
        )

    async def get_university(
        self, university_id: str
    ) -> University:
        """获取院校详情，不存在则抛出异常。"""
        university = await repository.get_university_by_id(
            self.session, university_id
        )
        if not university:
            raise NotFoundException(message="院校不存在", code="UNIVERSITY_NOT_FOUND")
        return university

    async def update_university(
        self, university_id: str, data: UniversityUpdate
    ) -> University:
        """更新院校。"""
        university = await self.get_university(
            university_id
        )
        apply_updates(university, data)
        return await repository.update_university(
            self.session, university
        )

    async def delete_university(
        self, university_id: str
    ) -> None:
        """删除院校。"""
        university = await self.get_university(
            university_id
        )
        await repository.delete_university(
            self.session, university
        )

    async def list_universities(
        self,
        offset: int,
        limit: int,
        country: str | None = None,
        city: str | None = None,
        is_featured: bool | None = None,
        search: str | None = None,
        program: str | None = None,
    ) -> tuple[list[dict], int]:
        """分页查询院校列表，包含专业信息。"""
        universities, total = await repository.list_universities(
            self.session,
            offset,
            limit,
            country,
            city,
            is_featured,
            search,
            program,
        )

        # Enrich with programs
        result = []
        for uni in universities:
            programs = await prog_repo.list_programs(self.session, uni.id)
            uni_dict = {
                "id": uni.id,
                "name": uni.name,
                "name_en": uni.name_en,
                "country": uni.country,
                "province": uni.province,
                "city": uni.city,
                "logo_url": uni.logo_url,
                "description": uni.description,
                "website": uni.website,
                "is_featured": uni.is_featured,
                "sort_order": uni.sort_order,
                "logo_image_id": uni.logo_image_id,
                "admission_requirements": uni.admission_requirements,
                "scholarship_info": uni.scholarship_info,
                "qs_rankings": uni.qs_rankings,
                "latitude": uni.latitude,
                "longitude": uni.longitude,
                "created_at": uni.created_at,
                "updated_at": uni.updated_at,
                "programs": programs,
            }
            result.append(uni_dict)

        return result, total

    async def upload_logo(self, university_id: str, file: UploadFile) -> str:
        """上传院校校徽，返回 image_id。"""
        university = await self.get_university(university_id)
        image = await self._save_image(file)
        university.logo_image_id = image.id
        await repository.update_university(self.session, university)
        return image.id

    async def upload_image(self, university_id: str, file: UploadFile) -> UniversityImage:
        """上传院校图片（最多 5 张）。"""
        await self.get_university(university_id)
        count = await repository.count_university_images(self.session, university_id)
        if count >= 5:
            raise ConflictException(
                message="院校图片最多 5 张",
                code="UNIVERSITY_IMAGE_LIMIT",
            )
        image = await self._save_image(file)
        uni_image = UniversityImage(
            university_id=university_id,
            image_id=image.id,
            sort_order=count,
        )
        return await repository.add_university_image(self.session, uni_image)

    async def delete_image(self, university_id: str, image_record_id: str) -> None:
        """删除院校图片。"""
        await self.get_university(university_id)
        record = await repository.get_university_image_by_id(self.session, image_record_id)
        if not record or record.university_id != university_id:
            raise NotFoundException(
                message="图片记录不存在",
                code="UNIVERSITY_IMAGE_NOT_FOUND",
            )
        await repository.delete_university_image(self.session, record)

    async def set_programs(self, university_id: str, programs: list[ProgramItem]) -> None:
        """设置院校专业（全量覆盖）。"""
        await self.get_university(university_id)
        # Validate all disciplines exist
        for prog in programs:
            d = await disc_repo.get_discipline_by_id(self.session, prog.discipline_id)
            if not d:
                raise NotFoundException(
                    message=f"学科 {prog.discipline_id} 不存在",
                    code="DISCIPLINE_NOT_FOUND",
                )
        # Replace programs
        programs_data = [{"name": p.name, "discipline_id": p.discipline_id} for p in programs]
        await prog_repo.replace_programs(self.session, university_id, programs_data)
        await self.session.commit()

    async def _save_image(self, file: UploadFile):
        """校验并保存图片到 image 表。"""
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
