"""分类管理业务逻辑层。

处理分类的增删改查业务。
"""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    NotFoundException,
)
from app.db.content import repository
from app.db.content.models import Category

from .schemas import (
    CategoryCreate,
    CategoryUpdate,
)


class CategoryService:
    """分类业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def create_category(
        self, data: CategoryCreate
    ) -> Category:
        """创建分类。"""
        category = Category(
            name=data.name,
            slug=data.slug,
            description=data.description,
            sort_order=data.sort_order,
        )
        try:
            category = await repository.create_category(
                self.session, category
            )
            await self.session.commit()
            return category
        except IntegrityError:
            raise ConflictException(
                message="分类标识已存在",
                code="SLUG_ALREADY_EXISTS",
            )

    async def update_category(
        self, category_id: str, data: CategoryUpdate
    ) -> Category:
        """更新分类。"""
        category = await repository.get_category_by_id(
            self.session, category_id
        )
        if not category:
            raise NotFoundException(message="分类不存在", code="CATEGORY_NOT_FOUND")

        if data.name is not None:
            category.name = data.name
        if data.slug is not None:
            category.slug = data.slug
        if data.description is not None:
            category.description = data.description
        if data.sort_order is not None:
            category.sort_order = data.sort_order

        try:
            return await repository.update_category(
                self.session, category
            )
        except IntegrityError:
            raise ConflictException(
                message="分类标识已存在",
                code="SLUG_ALREADY_EXISTS",
            )

    async def delete_category(
        self, category_id: str
    ) -> None:
        """删除分类。"""
        category = await repository.get_category_by_id(
            self.session, category_id
        )
        if not category:
            raise NotFoundException(message="分类不存在", code="CATEGORY_NOT_FOUND")
        await repository.delete_category(self.session, category)

    async def list_categories(self) -> list[Category]:
        """查询所有分类。"""
        return await repository.list_categories(self.session)

    async def get_article_counts_by_category(
        self,
    ) -> dict[str, int]:
        """获取每个分类的文章数量。"""
        return await repository.count_articles_by_category(
            self.session
        )
