"""内容领域业务逻辑层。

处理文章发布、分类管理、审核流程等业务。
"""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.content import repository
from app.content.models import Article, Category
from app.content.schemas import ArticleCreate, ArticleUpdate, CategoryCreate
from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
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
            sort_order=data.sort_order,
        )
        return await repository.create_category(
            self.session, category
        )

    async def list_categories(self) -> list[Category]:
        """查询所有分类。"""
        return await repository.list_categories(self.session)

    # ---- 文章管理 ----

    async def create_article(
        self, data: ArticleCreate, author_id: str, role: str
    ) -> Article:
        """创建文章。

        管理员直接发布，普通用户进入待审核状态。
        """
        status = "published" if role == "admin" else "pending"
        published_at = (
            datetime.now(timezone.utc)
            if status == "published"
            else None
        )
        article = Article(
            title=data.title,
            content=data.content,
            summary=data.summary,
            cover_image=data.cover_image,
            category_id=data.category_id,
            author_id=author_id,
            status=status,
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
            raise NotFoundException(message="文章不存在")
        return article

    async def update_article(
        self,
        article_id: str,
        data: ArticleUpdate,
        user_id: str,
        role: str,
    ) -> Article:
        """更新文章，检查所有权或管理员权限。"""
        article = await self.get_article(article_id)
        self._check_ownership_or_admin(article, user_id, role)

        if data.title is not None:
            article.title = data.title
        if data.content is not None:
            article.content = data.content
        if data.summary is not None:
            article.summary = data.summary
        if data.cover_image is not None:
            article.cover_image = data.cover_image
        if data.category_id is not None:
            article.category_id = data.category_id

        return await repository.update_article(
            self.session, article
        )

    async def delete_article(
        self, article_id: str, user_id: str, role: str
    ) -> None:
        """删除文章，检查所有权或管理员权限。"""
        article = await self.get_article(article_id)
        self._check_ownership_or_admin(article, user_id, role)
        await repository.delete_article(self.session, article)

    async def submit_for_review(
        self, article_id: str, user_id: str
    ) -> Article:
        """提交文章审核（draft → pending）。"""
        article = await self.get_article(article_id)
        if article.author_id != user_id:
            raise ForbiddenException(message="无权操作此文章")
        if article.status != "draft":
            raise ConflictException(
                message="只有草稿状态的文章可以提交审核"
            )
        article.status = "pending"
        return await repository.update_article(
            self.session, article
        )

    async def review_article(
        self, article_id: str, approved: bool
    ) -> Article:
        """审核文章（pending → published/rejected）。"""
        article = await self.get_article(article_id)
        if article.status != "pending":
            raise ConflictException(
                message="只有待审核的文章可以审核"
            )
        if approved:
            article.status = "published"
            article.published_at = datetime.now(timezone.utc)
        else:
            article.status = "rejected"
        return await repository.update_article(
            self.session, article
        )

    async def list_published(
        self,
        offset: int,
        limit: int,
        category_id: str | None = None,
    ) -> tuple[list[Article], int]:
        """分页查询已发布文章。"""
        return await repository.list_published(
            self.session, offset, limit, category_id
        )

    async def list_my_articles(
        self, author_id: str, offset: int, limit: int
    ) -> tuple[list[Article], int]:
        """分页查询当前用户的文章。"""
        return await repository.list_by_author(
            self.session, author_id, offset, limit
        )

    async def list_pending(
        self, offset: int, limit: int
    ) -> tuple[list[Article], int]:
        """分页查询待审核文章。"""
        return await repository.list_pending(
            self.session, offset, limit
        )

    def _check_ownership_or_admin(
        self, article: Article, user_id: str, role: str
    ) -> None:
        """检查文章所有权或管理员权限。"""
        if article.author_id != user_id and role != "admin":
            raise ForbiddenException(message="无权操作此文章")
