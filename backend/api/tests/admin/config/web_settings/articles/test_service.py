"""ArticleService 单元测试。

测试文章的 CRUD 业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.content.models import Article
from api.admin.config.web_settings.articles.schemas import (
    ArticleCreate,
    ArticleUpdate,
)
from api.admin.config.web_settings.articles.service import (
    ArticleService,
)
from app.core.exceptions import BadRequestException, NotFoundException


REPO = "api.admin.config.web_settings.articles.service.repository"


def _make_article(
    article_id: str = "art-1",
    author_id: str = "user-1",
    status: str = "published",
) -> Article:
    """创建模拟 Article 对象。"""
    a = MagicMock(spec=Article)
    a.id = article_id
    a.title = "测试文章"
    a.slug = "test-article"
    a.content_type = "html"
    a.content = "正文内容"
    a.file_id = None
    a.excerpt = "摘要"
    a.cover_image = None
    a.category_id = "cat-1"
    a.author_id = author_id
    a.status = status
    a.is_pinned = False
    a.view_count = 0
    a.published_at = datetime.now(timezone.utc)
    a.created_at = datetime.now(timezone.utc)
    a.updated_at = None
    return a


@pytest.fixture
def service() -> ArticleService:
    """构建 ArticleService 实例，注入 mock session。"""
    session = AsyncMock()
    return ArticleService(session)


# ---- 文章：list_all_articles ----


@pytest.mark.asyncio
@patch(REPO)
async def test_list_published(mock_repo, service):
    """分页查询所有文章，返回列表和总数。"""
    articles = [_make_article(), _make_article(article_id="art-2")]
    mock_repo.list_all_articles = AsyncMock(
        return_value=(articles, 2)
    )

    result, total = await service.list_all_articles(
        offset=0, limit=10
    )

    assert total == 2
    assert len(result) == 2
    mock_repo.list_all_articles.assert_awaited_once_with(
        service.session, 0, 10, None
    )


# ---- 文章：get_article ----


@pytest.mark.asyncio
@patch(REPO)
async def test_get_article_success(mock_repo, service):
    """获取文章成功。"""
    article = _make_article()
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )

    result = await service.get_article("art-1")

    assert result.id == "art-1"


@pytest.mark.asyncio
@patch(REPO)
async def test_get_article_not_found(mock_repo, service):
    """文章不存在时抛出 NotFoundException。"""
    mock_repo.get_article_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_article("nonexistent")


# ---- 文章：create_article ----


@pytest.mark.asyncio
@patch(REPO)
async def test_create_article_success(mock_repo, service):
    """创建文章成功，设置 author_id。"""
    article = _make_article()
    mock_repo.create_article = AsyncMock(return_value=article)

    data = ArticleCreate(
        title="测试文章",
        slug="test-article",
        content="正文内容",
        category_id="cat-1",
        status="draft",
    )
    result = await service.create_article(data, "user-1")

    assert result.id == "art-1"
    mock_repo.create_article.assert_awaited_once()


# ---- 文章：update_article ----


@pytest.mark.asyncio
@patch(REPO)
async def test_update_own_article_success(
    mock_repo, service
):
    """管理员更新文章成功。"""
    article = _make_article(author_id="user-1")
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )
    mock_repo.update_article = AsyncMock(
        return_value=article
    )

    data = ArticleUpdate(article_id="art-1", title="新标题")
    result = await service.update_article(
        "art-1", data
    )

    assert result is not None
    mock_repo.update_article.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_own_article_forbidden(
    mock_repo, service
):
    """更新不存在的文章抛出 NotFoundException。"""
    mock_repo.get_article_by_id = AsyncMock(
        return_value=None
    )

    data = ArticleUpdate(article_id="art-1", title="新标题")
    with pytest.raises(NotFoundException):
        await service.update_article(
            "nonexistent", data
        )


# ---- 文章：delete_article_admin ----


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_own_article_success(
    mock_repo, service
):
    """管理员删除文章成功。"""
    article = _make_article(author_id="user-1")
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )
    mock_repo.delete_article = AsyncMock()

    await service.delete_article_admin("art-1")

    mock_repo.delete_article.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_article_sets_published_at(
    mock_repo, service
):
    """将文章从 draft 改为 published 时设置 published_at。"""
    article = _make_article(status="draft")
    article.published_at = None
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )

    def fake_apply(obj, data):
        """模拟 apply_updates 将 status 设为 published。"""
        obj.status = "published"

    with patch(
        "api.admin.config.web_settings.articles.service.apply_updates",
        side_effect=fake_apply,
    ):
        mock_repo.update_article = AsyncMock(
            return_value=article
        )
        data = ArticleUpdate(
            article_id="art-1", status="published"
        )
        result = await service.update_article(
            "art-1", data
        )

    assert article.published_at is not None


@pytest.mark.asyncio
@patch(REPO)
async def test_update_article_already_published_no_change(
    mock_repo, service
):
    """已发布文章更新标题不改变 published_at。"""
    from datetime import datetime, timezone

    original_published = datetime(2026, 1, 1, tzinfo=timezone.utc)
    article = _make_article(status="published")
    article.published_at = original_published
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )

    def fake_apply(obj, data):
        """模拟 apply_updates 只改标题。"""
        obj.title = "新标题"

    with patch(
        "api.admin.config.web_settings.articles.service.apply_updates",
        side_effect=fake_apply,
    ):
        mock_repo.update_article = AsyncMock(
            return_value=article
        )
        data = ArticleUpdate(
            article_id="art-1", title="新标题"
        )
        await service.update_article("art-1", data)

    assert article.published_at == original_published


@pytest.mark.asyncio
@patch(REPO)
async def test_create_article_published_sets_published_at(
    mock_repo, service
):
    """创建已发布状态的文章时设置 published_at。"""
    article = _make_article()
    mock_repo.create_article = AsyncMock(return_value=article)

    data = ArticleCreate(
        title="发布文章",
        slug="published-article",
        content="内容",
        category_id="cat-1",
        status="published",
    )
    await service.create_article(data, "user-1")

    call_args = mock_repo.create_article.call_args[0][1]
    assert call_args.published_at is not None


@pytest.mark.asyncio
@patch(REPO)
async def test_create_article_draft_no_published_at(
    mock_repo, service
):
    """创建草稿文章时不设置 published_at。"""
    article = _make_article(status="draft")
    mock_repo.create_article = AsyncMock(return_value=article)

    data = ArticleCreate(
        title="草稿",
        slug="draft",
        content="内容",
        category_id="cat-1",
        status="draft",
    )
    await service.create_article(data, "user-1")

    call_args = mock_repo.create_article.call_args[0][1]
    assert call_args.published_at is None


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_own_article_forbidden(
    mock_repo, service
):
    """删除不存在的文章抛出 NotFoundException。"""
    mock_repo.get_article_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(NotFoundException):
        await service.delete_article_admin("nonexistent")


# ---- upload_pdf ----

IMAGE_REPO = (
    "api.admin.config.web_settings.articles.service"
    ".image_repo"
)


def _make_image(image_id: str = "img-1"):
    """创建模拟 Image 对象。"""
    img = MagicMock()
    img.id = image_id
    img.filename = "document.pdf"
    img.content_type = "application/pdf"
    img.size = 1024
    return img


def _make_upload_file(
    content: bytes = b"fake pdf data",
    filename: str = "document.pdf",
    content_type: str = "application/pdf",
) -> MagicMock:
    """创建模拟 UploadFile 对象。"""
    file = MagicMock()
    file.filename = filename
    file.content_type = content_type
    file.read = AsyncMock(return_value=content)
    return file


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(REPO)
async def test_upload_pdf_success(
    mock_repo, mock_image_repo, service
):
    """上传 PDF 成功。"""
    article = _make_article()
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )

    image = _make_image()
    mock_image_repo.create_image = AsyncMock(
        return_value=image
    )
    mock_repo.update_article = AsyncMock(
        return_value=article
    )

    file = _make_upload_file()
    result = await service.upload_pdf("art-1", file)

    assert result == "img-1"
    assert article.file_id == "img-1"
    assert article.content_type == "file"
    mock_repo.update_article.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_pdf_invalid_type(mock_repo, service):
    """上传非 PDF 文件抛出 BadRequestException。"""
    article = _make_article()
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )

    file = _make_upload_file(content_type="image/jpeg")
    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_pdf("art-1", file)

    assert exc_info.value.code == "INVALID_FILE_TYPE"


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_pdf_not_found(mock_repo, service):
    """上传 PDF 时文章不存在抛出 NotFoundException。"""
    mock_repo.get_article_by_id = AsyncMock(return_value=None)

    file = _make_upload_file()
    with pytest.raises(NotFoundException) as exc_info:
        await service.upload_pdf("nonexistent", file)

    assert exc_info.value.code == "ARTICLE_NOT_FOUND"


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_pdf_too_large(mock_repo, service):
    """上传超过 10MB 的 PDF 抛出 BadRequestException。"""
    article = _make_article()
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )

    large_content = b"x" * (10 * 1024 * 1024 + 1)
    file = _make_upload_file(content=large_content)

    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_pdf("art-1", file)

    assert exc_info.value.code == "FILE_TOO_LARGE"
