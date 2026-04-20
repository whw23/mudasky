"""文章管理业务逻辑层。

处理文章的增删改查业务。
"""

from datetime import datetime, timezone

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.db.content import repository
from app.db.content.models import Article
from app.db.image import repository as image_repo
from app.db.image.repository import MAX_IMAGE_SIZE
from app.db.model_utils import apply_updates

from .schemas import (
    ArticleCreate,
    ArticleUpdate,
)


class ArticleService:
    """文章业务服务。"""

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
            content_type=data.content_type,
            file_id=data.file_id,
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

    async def upload_pdf(
        self, article_id: str, file: UploadFile
    ) -> str:
        """上传 PDF 文件，返回 file_id。"""
        article = await self.get_article(article_id)
        if file.content_type != "application/pdf":
            raise BadRequestException(
                message="仅支持 PDF 格式",
                code="INVALID_FILE_TYPE",
            )
        file_data = await file.read()
        if len(file_data) > MAX_IMAGE_SIZE:
            raise BadRequestException(
                message="文件大小不能超过 5MB",
                code="FILE_TOO_LARGE",
            )
        image = await image_repo.create_image(
            self.session,
            file_data,
            file.filename or "document.pdf",
            file.content_type,
        )
        article.file_id = image.id
        article.content_type = "file"
        await repository.update_article(self.session, article)
        return image.id

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
