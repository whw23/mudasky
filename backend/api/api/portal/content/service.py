"""Portal 内容领域业务逻辑层。

处理用户自己的文章创建、更新、删除等业务。
"""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
)
from app.db.content import repository
from app.db.content.models import Article
from app.db.model_utils import apply_updates

from .schemas import ArticleCreate, ArticleUpdate


class ContentService:
    """Portal 内容业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

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

    async def list_my_articles(
        self, author_id: str, offset: int, limit: int
    ) -> tuple[list[Article], int]:
        """分页查询当前用户的文章。"""
        return await repository.list_by_author(
            self.session, author_id, offset, limit
        )

    async def update_own_article(
        self,
        article_id: str,
        data: ArticleUpdate,
        user_id: str,
    ) -> Article:
        """更新自己的文章。"""
        article = await self.get_article(article_id)
        if article.author_id != user_id:
            raise ForbiddenException(message="无权操作此文章", code="ARTICLE_ACCESS_DENIED")
        self._apply_article_update(article, data)
        return await repository.update_article(
            self.session, article
        )

    async def delete_own_article(
        self, article_id: str, user_id: str
    ) -> None:
        """删除自己的文章。"""
        article = await self.get_article(article_id)
        if article.author_id != user_id:
            raise ForbiddenException(message="无权操作此文章", code="ARTICLE_ACCESS_DENIED")
        await repository.delete_article(self.session, article)

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
