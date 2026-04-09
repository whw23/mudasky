"""content/repository 单元测试。

测试分类和文章的 CRUD 数据库操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.content.models import Article, Category
from app.content.repository import (
    count_articles_by_category,
    create_article,
    create_category,
    delete_article,
    delete_category,
    get_article_by_id,
    get_category_by_id,
    list_all_articles,
    list_by_author,
    list_categories,
    list_published,
    update_article,
    update_category,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    s = AsyncMock()
    return s


# ---- 分类 ----


async def test_create_category(session):
    """创建分类。"""
    cat = Category(name="测试分类", slug="test", description="描述")
    session.refresh = AsyncMock()

    result = await create_category(session, cat)

    session.add.assert_called_once_with(cat)
    session.commit.assert_awaited_once()
    assert result == cat


async def test_get_category_by_id(session):
    """根据 ID 查询分类。"""
    cat = MagicMock(spec=Category)
    session.get = AsyncMock(return_value=cat)

    result = await get_category_by_id(session, "cat-1")

    session.get.assert_awaited_once_with(Category, "cat-1")
    assert result == cat


async def test_get_category_by_id_not_found(session):
    """分类不存在返回 None。"""
    session.get = AsyncMock(return_value=None)

    result = await get_category_by_id(session, "nonexistent")

    assert result is None


async def test_list_categories(session):
    """查询所有分类。"""
    cats = [MagicMock(spec=Category), MagicMock(spec=Category)]
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = cats
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_categories(session)

    assert len(result) == 2
    session.execute.assert_awaited_once()


async def test_update_category(session):
    """更新分类。"""
    cat = MagicMock(spec=Category)
    session.refresh = AsyncMock()

    result = await update_category(session, cat)

    session.commit.assert_awaited_once()
    assert result == cat


async def test_delete_category(session):
    """删除分类。"""
    cat = MagicMock(spec=Category)

    await delete_category(session, cat)

    session.delete.assert_awaited_once_with(cat)
    session.commit.assert_awaited_once()


async def test_count_articles_by_category(session):
    """统计每个分类的文章数量。"""
    row1 = MagicMock()
    row1.category_id = "cat-1"
    row1.cnt = 3
    row2 = MagicMock()
    row2.category_id = "cat-2"
    row2.cnt = 7
    mock_result = MagicMock()
    mock_result.__iter__ = MagicMock(return_value=iter([row1, row2]))
    session.execute.return_value = mock_result

    result = await count_articles_by_category(session)

    assert result == {"cat-1": 3, "cat-2": 7}


# ---- 文章 ----


async def test_create_article(session):
    """创建文章。"""
    article = Article(
        title="测试文章",
        slug="test-article",
        content="内容",
        category_id="cat-1",
        author_id="user-1",
    )
    session.refresh = AsyncMock()

    result = await create_article(session, article)

    session.add.assert_called_once_with(article)
    session.commit.assert_awaited_once()
    assert result == article


async def test_get_article_by_id(session):
    """根据 ID 查询文章。"""
    article = MagicMock(spec=Article)
    session.get = AsyncMock(return_value=article)

    result = await get_article_by_id(session, "art-1")

    session.get.assert_awaited_once_with(Article, "art-1")
    assert result == article


async def test_get_article_by_id_not_found(session):
    """文章不存在返回 None。"""
    session.get = AsyncMock(return_value=None)

    result = await get_article_by_id(session, "nonexistent")

    assert result is None


async def test_update_article(session):
    """更新文章。"""
    article = MagicMock(spec=Article)
    session.refresh = AsyncMock()

    result = await update_article(session, article)

    session.commit.assert_awaited_once()
    assert result == article


async def test_delete_article(session):
    """删除文章。"""
    article = MagicMock(spec=Article)

    await delete_article(session, article)

    session.delete.assert_awaited_once_with(article)
    session.commit.assert_awaited_once()


async def test_list_published_no_filter(session):
    """分页查询已发布文章（无分类过滤）。"""
    articles = [MagicMock(spec=Article)]
    # 总数查询
    count_result = MagicMock()
    count_result.scalar_one.return_value = 1
    # 列表查询
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = articles
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_articles, total = await list_published(
        session, offset=0, limit=10
    )

    assert total == 1
    assert len(result_articles) == 1


async def test_list_published_with_category(session):
    """分页查询已发布文章（按分类过滤）。"""
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_articles, total = await list_published(
        session, offset=0, limit=10, category_id="cat-1"
    )

    assert total == 0
    assert len(result_articles) == 0


async def test_list_by_author(session):
    """分页查询指定作者的文章。"""
    articles = [MagicMock(spec=Article)]
    count_result = MagicMock()
    count_result.scalar_one.return_value = 1
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = articles
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_articles, total = await list_by_author(
        session, author_id="user-1", offset=0, limit=10
    )

    assert total == 1
    assert len(result_articles) == 1


async def test_list_all_articles_no_filter(session):
    """管理员分页查询所有文章（无状态过滤）。"""
    articles = [MagicMock(spec=Article)]
    count_result = MagicMock()
    count_result.scalar_one.return_value = 1
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = articles
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_articles, total = await list_all_articles(
        session, offset=0, limit=10
    )

    assert total == 1
    assert len(result_articles) == 1


async def test_list_all_articles_with_status(session):
    """管理员分页查询所有文章（按状态过滤）。"""
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_articles, total = await list_all_articles(
        session, offset=0, limit=10, status="draft"
    )

    assert total == 0
    assert len(result_articles) == 0
