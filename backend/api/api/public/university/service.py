"""合作院校公开业务逻辑层。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.university import repository
from app.db.university.models import University
from app.core.exceptions import NotFoundException


class UniversityService:
    """院校公开服务（只读）。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

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

    async def list_universities(
        self,
        offset: int,
        limit: int,
        country: str | None = None,
        city: str | None = None,
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
            city,
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

    async def get_distinct_provinces(
        self, country: str | None = None
    ) -> list[str]:
        """获取院校的去重省份列表，可按国家筛选。"""
        return await repository.get_distinct_provinces(
            self.session, country
        )

    async def get_distinct_cities(
        self, country: str | None = None
    ) -> list[str]:
        """获取院校的去重城市列表，可按国家筛选。"""
        return await repository.get_distinct_cities(
            self.session, country
        )
