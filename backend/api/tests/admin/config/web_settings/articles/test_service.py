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
from app.core.exceptions import NotFoundException


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
    a.content_type = "markdown"
    a.content = "正文内容"
    a.file_url = None
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
