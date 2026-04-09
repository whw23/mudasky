"""合作院校领域业务逻辑层。

处理院校的增删改查业务。
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.university import repository
from app.university.models import University
from app.university.schemas import (
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
            city=data.city,
            logo_url=data.logo_url,
            description=data.description,
            programs=data.programs,
            website=data.website,
            is_featured=data.is_featured,
            sort_order=data.sort_order,
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
            raise NotFoundException(message="院校不存在")
        return university

    async def update_university(
        self, university_id: str, data: UniversityUpdate
    ) -> University:
        """更新院校。"""
        university = await self.get_university(
            university_id
        )
        if data.name is not None:
            university.name = data.name
        if data.name_en is not None:
            university.name_en = data.name_en
        if data.country is not None:
            university.country = data.country
        if data.city is not None:
            university.city = data.city
        if data.logo_url is not None:
            university.logo_url = data.logo_url
        if data.description is not None:
            university.description = data.description
        if data.programs is not None:
            university.programs = data.programs
        if data.website is not None:
            university.website = data.website
        if data.is_featured is not None:
            university.is_featured = data.is_featured
        if data.sort_order is not None:
            university.sort_order = data.sort_order
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
        is_featured: bool | None = None,
        search: str | None = None,
        program: str | None = None,
    ) -> tuple[list[University], int]:
        """分页查询院校列表。"""
        return await repository.list_universities(
            self.session,
            offset,
            limit,
            country,
            is_featured,
            search,
            program,
        )

    async def get_distinct_countries(
        self,
    ) -> list[str]:
        """获取所有院校的去重国家列表。"""
        return await repository.get_distinct_countries(
            self.session
        )
