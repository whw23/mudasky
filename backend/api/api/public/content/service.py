"""内容领域公开业务逻辑层。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.content import repository
from app.db.content.models import Article, Category
from app.core.exceptions import NotFoundException


class ContentService:
    """内容公开服务（只读）。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

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

    async def get_article(self, article_id: str) -> Article:
        """获取文章详情，不存在则抛出异常。"""
        article = await repository.get_article_by_id(
            self.session, article_id
        )
        if not article:
            raise NotFoundException(message="文章不存在", code="ARTICLE_NOT_FOUND")
        return article

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
