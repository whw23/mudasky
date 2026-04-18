"""内容管理业务逻辑层。

处理文章发布、分类管理等业务。
"""

from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    NotFoundException,
)
from app.db.content import repository
from app.db.content.models import Article, Category
from app.db.model_utils import apply_updates

from .schemas import (
    ArticleCreate,
    ArticleUpdate,
    CategoryCreate,
    CategoryUpdate,
)


class ContentService:
    """内容业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    # ---- 分类管理 ----

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
            return await repository.create_category(
                self.session, category
            )
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

    # ---- 文章管理 ----

    async def create_article(
        self, data: ArticleCreate, author_id: str
    ) -> Article:
        """创建文章。"""
        published_at = (
            datetime.now(timezone.utc)
            if data.status == "published"
            else None
        )
        article = Article(
            title=data.title,
            slug=data.slug,
            content=data.content,
            excerpt=data.excerpt,
            cover_image=data.cover_image,
            category_id=data.category_id,
            author_id=author_id,
            status=data.status,
            published_at=published_at,
        )
        return await repository.create_article(
            self.session, article
        )

    async def get_article(self, article_id: str) -> Article:
        """获取文章详情，不存在则抛出异常。"""
        article = await repository.get_article_by_id(
            self.session, article_id
        )
        if not article:
            raise NotFoundException(message="文章不存在", code="ARTICLE_NOT_FOUND")
        return article

    async def update_article(
        self, article_id: str, data: ArticleUpdate
    ) -> Article:
        """更新文章（不检查权限，由调用方负责）。"""
        article = await self.get_article(article_id)
        self._apply_article_update(article, data)
        return await repository.update_article(
            self.session, article
        )

    async def delete_article_admin(
        self, article_id: str
    ) -> None:
        """管理员删除文章。"""
        article = await self.get_article(article_id)
        await repository.delete_article(self.session, article)

    async def list_all_articles(
        self,
        offset: int,
        limit: int,
        status: str | None = None,
    ) -> tuple[list[Article], int]:
        """管理员分页查询所有文章。"""
        return await repository.list_all_articles(
            self.session, offset, limit, status
        )

    def _apply_article_update(
        self, article: Article, data: ArticleUpdate
    ) -> None:
        """将更新数据应用到文章模型。"""
        old_status = article.status
        apply_updates(article, data)
        # 发布时设置发布时间
        if (
            article.status == "published"
            and old_status != "published"
        ):
            article.published_at = datetime.now(
                timezone.utc
            )
