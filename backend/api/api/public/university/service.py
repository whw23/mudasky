"""合作院校公开业务逻辑层。"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.university import repository
from app.db.university import program_repository as prog_repo
from app.db.university.models import University
from app.db.discipline import repository as disc_repo
from app.db.case.models import SuccessCase
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

    async def get_university_detail(self, university_id: str) -> dict:
        """获取院校详情，包含专业、学科、图片集、关联案例。"""
        university = await self.get_university(university_id)

        # 专业（含学科信息）
        programs = await prog_repo.list_programs(self.session, university_id)
        disciplines = []
        for prog in programs:
            d = await disc_repo.get_discipline_by_id(self.session, prog.discipline_id)
            if d:
                cat = await disc_repo.get_category_by_id(
                    self.session, d.category_id
                )
                disciplines.append({
                    "id": d.id,
                    "name": d.name,
                    "category_name": cat.name if cat else "",
                    "program_name": prog.name,
                })

        # 图片集
        images = await repository.list_university_images(
            self.session, university_id
        )
        image_ids = [img.image_id for img in images]

        # 关联案例（案例表中 university 字段匹配院校名称）
        related_cases = []
        try:
            stmt = (
                select(SuccessCase)
                .where(SuccessCase.university == university.name)
                .order_by(SuccessCase.year.desc())
                .limit(10)
            )
            result = await self.session.execute(stmt)
            related_cases = list(result.scalars().all())
        except Exception:
            pass  # 如果查询失败则返回空列表

        return {
            "university": university,
            "disciplines": disciplines,
            "image_ids": image_ids,
            "related_cases": related_cases,
        }

    async def filter_universities_by_discipline(
        self,
        offset: int,
        limit: int,
        discipline_category_id: str | None = None,
        discipline_id: str | None = None,
        country: str | None = None,
        city: str | None = None,
        is_featured: bool | None = None,
        search: str | None = None,
        program: str | None = None,
    ) -> tuple[list[University], int]:
        """分页查询院校列表，支持学科筛选。"""
        from app.db.university.program_models import UniversityProgram

        # 如果有学科筛选条件，先获取符合条件的院校 ID 列表
        university_ids = None
        if discipline_id:
            # 直接按学科 ID 筛选
            stmt = select(UniversityProgram.university_id).where(
                UniversityProgram.discipline_id == discipline_id
            )
            result = await self.session.execute(stmt)
            university_ids = set(result.scalars().all())
        elif discipline_category_id:
            # 按学科大分类筛选
            disciplines = await disc_repo.list_disciplines(
                self.session, discipline_category_id
            )
            if disciplines:
                discipline_ids = [d.id for d in disciplines]
                stmt = select(UniversityProgram.university_id).where(
                    UniversityProgram.discipline_id.in_(discipline_ids)
                )
                result = await self.session.execute(stmt)
                university_ids = set(result.scalars().all())
            else:
                university_ids = set()

        # 如果有学科筛选且没有匹配的院校，直接返回空
        if university_ids is not None and not university_ids:
            return [], 0

        # 获取基础查询结果
        universities, total = await self.list_universities(
            offset, limit, country, city, is_featured, search, program
        )

        # 如果有学科筛选，过滤结果
        if university_ids is not None:
            universities = [
                u for u in universities if u.id in university_ids
            ]
            # 重新计算总数
            total = len(university_ids)

        return universities, total
