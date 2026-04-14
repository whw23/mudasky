"""ContentService 单元测试。

测试文章和分类的 CRUD 业务逻辑，包括权限校验。
使用 mock 隔离数据库层。
注：此文件包含 admin/portal/public 三个面板的 ContentService 测试。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.content.models import Article, Category
from api.admin.content.schemas import ArticleCreate, ArticleUpdate, CategoryCreate, CategoryUpdate
from api.admin.content.service import ContentService
from app.core.exceptions import ForbiddenException, NotFoundException


REPO = "api.admin.content.service.repository"


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


def _make_category(category_id: str = "cat-1") -> Category:
    """创建模拟 Category 对象。"""
    c = MagicMock(spec=Category)
    c.id = category_id
    c.name = "测试分类"
    c.slug = "test-cat"
    c.description = "描述"
    c.sort_order = 0
    c.created_at = datetime.now(timezone.utc)
    return c


@pytest.fixture
def service() -> ContentService:
    """构建 ContentService 实例，注入 mock session。"""
    session = AsyncMock()
    return ContentService(session)


# ---- 文章：list_published ----


@pytest.mark.asyncio
@patch(REPO)
async def test_list_published(mock_repo, service):
    """分页查询已发布文章，返回列表和总数。"""
    articles = [_make_article(), _make_article(article_id="art-2")]
    mock_repo.list_published = AsyncMock(
        return_value=(articles, 2)
    )

    result, total = await service.list_published(
        offset=0, limit=10
    )

    assert total == 2
    assert len(result) == 2
    mock_repo.list_published.assert_awaited_once_with(
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


# ---- 文章：update_own_article ----


@pytest.mark.asyncio
@patch(REPO)
async def test_update_own_article_success(
    mock_repo, service
):
    """作者更新自己的文章成功。"""
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
async def test_update_own_article_forbidden(
    mock_repo, service
):
    """非作者更新文章时抛出 ForbiddenException。"""
    article = _make_article(author_id="user-1")
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )

    data = ArticleUpdate(title="新标题")
    with pytest.raises(ForbiddenException):
        await service.update_own_article(
            "art-1", data, "other-user"
        )


# ---- 文章：delete_own_article ----


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_own_article_success(
    mock_repo, service
):
    """作者删除自己的文章成功。"""
    article = _make_article(author_id="user-1")
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )
    mock_repo.delete_article = AsyncMock()

    await service.delete_own_article("art-1", "user-1")

    mock_repo.delete_article.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_own_article_forbidden(
    mock_repo, service
):
    """非作者删除文章时抛出 ForbiddenException。"""
    article = _make_article(author_id="user-1")
    mock_repo.get_article_by_id = AsyncMock(
        return_value=article
    )

    with pytest.raises(ForbiddenException):
        await service.delete_own_article(
            "art-1", "other-user"
        )


# ---- 分类：list_categories ----


@pytest.mark.asyncio
@patch(REPO)
async def test_list_categories(mock_repo, service):
    """查询所有分类。"""
    categories = [_make_category(), _make_category("cat-2")]
    mock_repo.list_categories = AsyncMock(
        return_value=categories
    )

    result = await service.list_categories()

    assert len(result) == 2


# ---- 分类：create_category ----


@pytest.mark.asyncio
@patch(REPO)
async def test_create_category_success(mock_repo, service):
    """创建分类成功。"""
    category = _make_category()
    mock_repo.create_category = AsyncMock(
        return_value=category
    )

    data = CategoryCreate(
        name="测试分类", slug="test-cat"
    )
    result = await service.create_category(data)

    assert result.id == "cat-1"
    mock_repo.create_category.assert_awaited_once()


# ---- 分类：update_category ----


@pytest.mark.asyncio
@patch(REPO)
async def test_update_category_success(mock_repo, service):
    """更新分类成功。"""
    category = _make_category()
    mock_repo.get_category_by_id = AsyncMock(
        return_value=category
    )
    mock_repo.update_category = AsyncMock(
        return_value=category
    )

    data = CategoryUpdate(name="新分类名")
    result = await service.update_category("cat-1", data)

    assert result is not None
    mock_repo.update_category.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_category_not_found(
    mock_repo, service
):
    """更新不存在的分类抛出 NotFoundException。"""
    mock_repo.get_category_by_id = AsyncMock(
        return_value=None
    )

    data = CategoryUpdate(name="新分类名")
    with pytest.raises(NotFoundException):
        await service.update_category("nonexistent", data)


# ---- 分类：delete_category ----


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_category_success(mock_repo, service):
    """删除分类成功。"""
    category = _make_category()
    mock_repo.get_category_by_id = AsyncMock(
        return_value=category
    )
    mock_repo.delete_category = AsyncMock()

    await service.delete_category("cat-1")

    mock_repo.delete_category.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_category_not_found(
    mock_repo, service
):
    """删除不存在的分类抛出 NotFoundException。"""
    mock_repo.get_category_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(NotFoundException):
        await service.delete_category("nonexistent")
