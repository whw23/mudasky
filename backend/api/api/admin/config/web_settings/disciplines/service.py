"""学科分类服务。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.db.discipline import repository
from app.db.discipline.models import Discipline, DisciplineCategory
from app.db.model_utils import apply_updates

from .schemas import (
    CategoryCreate,
    CategoryUpdate,
    DisciplineCreate,
    DisciplineUpdate,
)


class DisciplineService:
    """学科分类管理服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务。"""
        self.session = session

    async def create_category(self, data: CategoryCreate) -> DisciplineCategory:
        """创建学科大分类。分类名称必须唯一。"""
        existing = await repository.get_category_by_name(self.session, data.name)
        if existing:
            raise ConflictException(
                message="分类名称已存在", code="DISCIPLINE_CATEGORY_EXISTS"
            )
        category = DisciplineCategory(
            name=data.name,
            sort_order=data.sort_order,
        )
        return await repository.create_category(
            self.session, category
        )

    async def get_category(self, category_id: str) -> DisciplineCategory:
        """获取学科大分类。不存在则抛出异常。"""
        category = await repository.get_category_by_id(self.session, category_id)
        if not category:
            raise NotFoundException(
                message="分类不存在", code="DISCIPLINE_CATEGORY_NOT_FOUND"
            )
        return category

    async def list_categories(self) -> list[DisciplineCategory]:
        """查询所有学科大分类。"""
        return await repository.list_categories(self.session)

    async def update_category(self, data: CategoryUpdate) -> DisciplineCategory:
        """更新学科大分类。名称变更时需检查唯一性。"""
        category = await self.get_category(data.category_id)

        if data.name is not None and data.name != category.name:
            existing = await repository.get_category_by_name(self.session, data.name)
            if existing:
                raise ConflictException(
                    message="分类名称已存在", code="DISCIPLINE_CATEGORY_EXISTS"
                )

        apply_updates(category, data)
        await repository.update_category(self.session, category)
        return category

    async def delete_category(self, category_id: str) -> None:
        """删除学科大分类。如果分类下有学科则拒绝删除。"""
        category = await self.get_category(category_id)
        if await repository.category_has_disciplines(self.session, category_id):
            raise ConflictException(
                message="分类下存在学科，无法删除",
                code="DISCIPLINE_CATEGORY_HAS_DISCIPLINES",
            )
        await repository.delete_category(self.session, category)

    async def create_discipline(self, data: DisciplineCreate) -> Discipline:
        """创建学科。分类必须存在，同一分类下学科名称必须唯一。"""
        await self.get_category(data.category_id)

        existing = await repository.get_discipline_by_name(
            self.session, data.category_id, data.name
        )
        if existing:
            raise ConflictException(
                message="学科名称已存在", code="DISCIPLINE_EXISTS"
            )

        discipline = Discipline(
            category_id=data.category_id,
            name=data.name,
            sort_order=data.sort_order,
        )
        return await repository.create_discipline(
            self.session, discipline
        )

    async def get_discipline(self, discipline_id: str) -> Discipline:
        """获取学科。不存在则抛出异常。"""
        discipline = await repository.get_discipline_by_id(
            self.session, discipline_id
        )
        if not discipline:
            raise NotFoundException(
                message="学科不存在", code="DISCIPLINE_NOT_FOUND"
            )
        return discipline

    async def list_disciplines(
        self, category_id: str | None = None
    ) -> list[Discipline]:
        """查询学科列表。可选按分类过滤。"""
        return await repository.list_disciplines(self.session, category_id)

    async def update_discipline(self, data: DisciplineUpdate) -> Discipline:
        """更新学科。名称变更时需检查同一分类下唯一性。"""
        discipline = await self.get_discipline(data.discipline_id)

        if data.name is not None and data.name != discipline.name:
            existing = await repository.get_discipline_by_name(
                self.session, discipline.category_id, data.name
            )
            if existing:
                raise ConflictException(
                    message="学科名称已存在", code="DISCIPLINE_EXISTS"
                )

        apply_updates(discipline, data)
        await repository.update_discipline(self.session, discipline)
        return discipline

    async def delete_discipline(self, discipline_id: str) -> None:
        """删除学科。如果学科下有院校则拒绝删除。"""
        discipline = await self.get_discipline(discipline_id)
        if await repository.discipline_has_universities(
            self.session, discipline_id
        ):
            raise ConflictException(
                message="学科下存在院校，无法删除",
                code="DISCIPLINE_HAS_UNIVERSITIES",
            )
        await repository.delete_discipline(self.session, discipline)
