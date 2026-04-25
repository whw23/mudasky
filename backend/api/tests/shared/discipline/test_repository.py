"""discipline/repository 单元测试（大分类操作）。

测试学科大分类的 CRUD 及关联检查。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.discipline.models import DisciplineCategory
from app.db.discipline.repository import (
    category_has_disciplines,
    create_category,
    delete_category,
    get_category_by_id,
    get_category_by_name,
    list_categories,
    update_category,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    s = AsyncMock()
    s.refresh = AsyncMock()
    return s


# ---- create_category ----


async def test_create_category(session):
    """创建学科大分类。"""
    cat = DisciplineCategory(name="工学")

    result = await create_category(session, cat)

    session.add.assert_called_once_with(cat)
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(cat)
    assert result == cat


async def test_create_category_with_sort_order(session):
    """创建带排序权重的大分类。"""
    cat = DisciplineCategory(name="理学", sort_order=1)

    result = await create_category(session, cat)

    session.add.assert_called_once_with(cat)
    assert result == cat


# ---- get_category_by_id ----


async def test_get_category_by_id_found(session):
    """根据 ID 查询大分类存在时返回。"""
    cat = MagicMock(spec=DisciplineCategory)
    session.get = AsyncMock(return_value=cat)

    result = await get_category_by_id(session, "cat-1")

    session.get.assert_awaited_once_with(
        DisciplineCategory, "cat-1"
    )
    assert result == cat


async def test_get_category_by_id_not_found(session):
    """大分类不存在时返回 None。"""
    session.get = AsyncMock(return_value=None)

    result = await get_category_by_id(session, "nonexistent")

    assert result is None


# ---- get_category_by_name ----


async def test_get_category_by_name_found(session):
    """根据名称查询大分类存在时返回。"""
    cat = MagicMock(spec=DisciplineCategory)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = cat
    session.execute.return_value = mock_result

    result = await get_category_by_name(session, "工学")

    assert result == cat
    session.execute.assert_awaited_once()


async def test_get_category_by_name_not_found(session):
    """名称不存在时返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_category_by_name(session, "不存在")

    assert result is None


# ---- list_categories ----


async def test_list_categories(session):
    """查询所有大分类列表。"""
    cats = [
        MagicMock(spec=DisciplineCategory),
        MagicMock(spec=DisciplineCategory),
    ]
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = cats
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_categories(session)

    assert len(result) == 2
    session.execute.assert_awaited_once()


async def test_list_categories_empty(session):
    """无大分类时返回空列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_categories(session)

    assert result == []


# ---- update_category ----


async def test_update_category(session):
    """更新大分类信息。"""
    cat = MagicMock(spec=DisciplineCategory)

    result = await update_category(session, cat)

    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(cat)
    assert result == cat


# ---- delete_category ----


async def test_delete_category(session):
    """删除大分类。"""
    cat = MagicMock(spec=DisciplineCategory)

    await delete_category(session, cat)

    session.delete.assert_awaited_once_with(cat)
    session.commit.assert_awaited_once()


# ---- category_has_disciplines ----


async def test_category_has_disciplines_true(session):
    """大分类下有学科时返回 True。"""
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = 3
    session.execute.return_value = mock_result

    result = await category_has_disciplines(session, "cat-1")

    assert result is True
    session.execute.assert_awaited_once()


async def test_category_has_disciplines_false(session):
    """大分类下无学科时返回 False。"""
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = 0
    session.execute.return_value = mock_result

    result = await category_has_disciplines(
        session, "cat-empty"
    )

    assert result is False
