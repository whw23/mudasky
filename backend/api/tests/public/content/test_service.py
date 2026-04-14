"""ContentService 单元测试。

测试内容领域公开查询逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.public.content.service import ContentService
from app.core.exceptions import NotFoundException

REPO = "api.public.content.service.repository"


def _make_category(**kwargs) -> MagicMock:
    """创建模拟 Category 对象。"""
    c = MagicMock()
    c.id = kwargs.get("id", "cat-001")
    c.name = kwargs.get("name", "测试分类")
    c.slug = kwargs.get("slug", "test-category")
    c.description = kwargs.get("description", "分类描述")
    c.sort_order = kwargs.get("sort_order", 0)
    c.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    return c


def _make_article(**kwargs) -> MagicMock:
    """创建模拟 Article 对象。"""
    a = MagicMock()
    a.id = kwargs.get("id", "article-001")
    a.title = kwargs.get("title", "测试文章")
    a.slug = kwargs.get("slug", "test-article")
    a.content_type = kwargs.get("content_type", "markdown")
    a.content = kwargs.get("content", "文章内容")
    a.file_url = kwargs.get("file_url", None)
    a.excerpt = kwargs.get("excerpt", "摘要")
    a.cover_image = kwargs.get("cover_image", None)
    a.category_id = kwargs.get("category_id", "cat-001")
    a.author_id = kwargs.get("author_id", "user-001")
    a.status = kwargs.get("status", "published")
    a.is_pinned = kwargs.get("is_pinned", False)
    a.view_count = kwargs.get("view_count", 0)
    a.published_at = kwargs.get("published_at", None)
    a.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    a.updated_at = kwargs.get("updated_at", None)
    return a


@pytest.fixture
def service(mock_session) -> ContentService:
    """构建 ContentService 实例，注入 mock session。"""
    return ContentService(mock_session)


# ---- list_categories ----


@patch(REPO)
async def test_list_categories_success(mock_repo, service):
    """查询所有分类成功。"""
    cats = [
        _make_category(id="cat-001"),
        _make_category(id="cat-002", name="分类二"),
    ]
    mock_repo.list_categories = AsyncMock(return_value=cats)

    result = await service.list_categories()

    assert len(result) == 2
    mock_repo.list_categories.assert_awaited_once_with(
        service.session
    )


@patch(REPO)
async def test_list_categories_empty(mock_repo, service):
    """无分类时返回空列表。"""
    mock_repo.list_categories = AsyncMock(return_value=[])

    result = await service.list_categories()

    assert result == []


# ---- get_article_counts_by_category ----


@patch(REPO)
async def test_get_article_counts_success(mock_repo, service):
    """获取每个分类的文章数量成功。"""
    mock_repo.count_articles_by_category = AsyncMock(
        return_value={"cat-001": 5, "cat-002": 3}
    )

    result = await service.get_article_counts_by_category()

    assert result == {"cat-001": 5, "cat-002": 3}
    mock_repo.count_articles_by_category.assert_awaited_once_with(
        service.session
    )


@patch(REPO)
async def test_get_article_counts_empty(mock_repo, service):
    """无文章时返回空字典。"""
    mock_repo.count_articles_by_category = AsyncMock(
        return_value={}
    )

    result = await service.get_article_counts_by_category()

    assert result == {}


# ---- get_article ----


@patch(REPO)
async def test_get_article_success(mock_repo, service):
    """获取文章详情成功。"""
    article = _make_article(id="article-001")
    mock_repo.get_article_by_id = AsyncMock(return_value=article)

    result = await service.get_article("article-001")

    assert result.id == "article-001"
    mock_repo.get_article_by_id.assert_awaited_once_with(
        service.session, "article-001"
    )


@patch(REPO)
async def test_get_article_not_found(mock_repo, service):
    """文章不存在应抛出 NotFoundException。"""
    mock_repo.get_article_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_article("nonexistent")


# ---- list_published ----


@patch(REPO)
async def test_list_published_success(mock_repo, service):
    """分页查询已发布文章成功。"""
    articles = [
        _make_article(id="article-001"),
        _make_article(id="article-002"),
    ]
    mock_repo.list_published = AsyncMock(
        return_value=(articles, 2)
    )

    result, total = await service.list_published(0, 20)

    assert total == 2
    assert len(result) == 2
    mock_repo.list_published.assert_awaited_once_with(
        service.session, 0, 20, None
    )


@patch(REPO)
async def test_list_published_with_category(mock_repo, service):
    """按分类筛选已发布文章。"""
    mock_repo.list_published = AsyncMock(return_value=([], 0))

    result, total = await service.list_published(
        0, 10, category_id="cat-001"
    )

    assert total == 0
    mock_repo.list_published.assert_awaited_once_with(
        service.session, 0, 10, "cat-001"
    )


@patch(REPO)
async def test_list_published_empty(mock_repo, service):
    """查询结果为空时返回空列表和 0。"""
    mock_repo.list_published = AsyncMock(return_value=([], 0))

    result, total = await service.list_published(0, 20)

    assert result == []
    assert total == 0
