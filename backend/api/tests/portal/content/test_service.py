"""Portal ContentService 单元测试。

测试用户文章的 CRUD 业务逻辑，包括权限校验。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.content.models import Article
from api.portal.content.schemas import (
    ArticleCreate,
    ArticleUpdate,
)
from api.portal.content.service import ContentService
from app.core.exceptions import (
    ForbiddenException,
    NotFoundException,
)


REPO = "api.portal.content.service.repository"


def _make_article(
    article_id: str = "art-1",
    author_id: str = "user-1",
    status: str = "draft",
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
    a.published_at = None
    a.created_at = datetime.now(timezone.utc)
    a.updated_at = None
    return a


@pytest.fixture
def service() -> ContentService:
    """构建 ContentService 实例，注入 mock session。"""
    session = AsyncMock()
    return ContentService(session)


# ---- list_my_articles ----


@pytest.mark.asyncio
@patch(REPO)
async def test_list_my_articles(mock_repo, service):
    """分页查询当前用户的文章，返回列表和总数。"""
    articles = [
        _make_article(),
        _make_article(article_id="art-2"),
    ]
    mock_repo.list_by_author = AsyncMock(
        return_value=(articles, 2)
    )

    result, total = await service.list_my_articles(
        author_id="user-1", offset=0, limit=10
    )

    assert total == 2
    assert len(result) == 2
    mock_repo.list_by_author.assert_awaited_once_with(
        service.session, "user-1", 0, 10
    )


# ---- get_article ----


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
    mock_repo.get_article_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(NotFoundException):
        await service.get_article("nonexistent")


# ---- create_article ----


@pytest.mark.asyncio
@patch(REPO)
async def test_create_article_draft(mock_repo, service):
    """创建草稿文章成功，published_at 为 None。"""
    article = _make_article()
    mock_repo.create_article = AsyncMock(
        return_value=article
    )

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
    # 验证传入的 Article 对象的 published_at 为 None
    created_article = (
        mock_repo.create_article.call_args[0][1]
    )
    assert created_article.published_at is None


@pytest.mark.asyncio
@patch(REPO)
async def test_create_article_published(
    mock_repo, service
):
    """创建已发布文章成功，published_at 被设置。"""
    article = _make_article(status="published")
    mock_repo.create_article = AsyncMock(
        return_value=article
    )

    data = ArticleCreate(
        title="测试文章",
        slug="test-article",
        content="正文内容",
        category_id="cat-1",
        status="published",
    )
    result = await service.create_article(data, "user-1")

    assert result is not None
    mock_repo.create_article.assert_awaited_once()
    # 验证传入的 Article 对象的 published_at 已设置
    created_article = (
        mock_repo.create_article.call_args[0][1]
    )
    assert created_article.published_at is not None


# ---- update_own_article ----


@pytest.mark.asyncio
@patch(REPO)
async def test_update_own_article_success(
    mock_repo, service
):
    """更新自己的文章成功。"""
    article = _make_article(author_id="user-1")
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )
    mock_repo.update_article = AsyncMock(
        return_value=article
    )

    data = ArticleUpdate(title="新标题")
    result = await service.update_own_article(
        "art-1", data, "user-1"
    )

    assert result is not None
    mock_repo.update_article.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_own_article_not_found(
    mock_repo, service
):
    """更新不存在的文章抛出 NotFoundException。"""
    mock_repo.get_article_by_id = AsyncMock(
        return_value=None
    )

    data = ArticleUpdate(title="新标题")
    with pytest.raises(NotFoundException):
        await service.update_own_article(
            "nonexistent", data, "user-1"
        )


@pytest.mark.asyncio
@patch(REPO)
async def test_update_own_article_forbidden(
    mock_repo, service
):
    """更新别人的文章抛出 ForbiddenException。"""
    article = _make_article(author_id="other-user")
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )

    data = ArticleUpdate(title="新标题")
    with pytest.raises(ForbiddenException):
        await service.update_own_article(
            "art-1", data, "user-1"
        )


# ---- delete_own_article ----


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_own_article_success(
    mock_repo, service
):
    """删除自己的文章成功。"""
    article = _make_article(author_id="user-1")
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )
    mock_repo.delete_article = AsyncMock()

    await service.delete_own_article("art-1", "user-1")

    mock_repo.delete_article.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_own_article_not_found(
    mock_repo, service
):
    """删除不存在的文章抛出 NotFoundException。"""
    mock_repo.get_article_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(NotFoundException):
        await service.delete_own_article(
            "nonexistent", "user-1"
        )


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_own_article_forbidden(
    mock_repo, service
):
    """删除别人的文章抛出 ForbiddenException。"""
    article = _make_article(author_id="other-user")
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )

    with pytest.raises(ForbiddenException):
        await service.delete_own_article(
            "art-1", "user-1"
        )
