"""discipline/repository 单元测试（学科操作）。

测试学科的 CRUD 及院校关联检查。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.discipline.models import Discipline
from app.db.discipline.repository import (
    create_discipline,
    delete_discipline,
    discipline_has_universities,
    get_discipline_by_id,
    get_discipline_by_name,
    list_disciplines,
    update_discipline,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    s = AsyncMock()
    s.refresh = AsyncMock()
    return s


# ---- create_discipline ----


async def test_create_discipline(session):
    """创建学科。"""
    disc = Discipline(category_id="cat-1", name="计算机科学")

    result = await create_discipline(session, disc)

    session.add.assert_called_once_with(disc)
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(disc)
    assert result == disc


async def test_create_discipline_with_sort_order(session):
    """创建带排序权重的学科。"""
    disc = Discipline(
        category_id="cat-1", name="电气工程", sort_order=2
    )

    result = await create_discipline(session, disc)

    session.add.assert_called_once_with(disc)
    assert result == disc


# ---- get_discipline_by_id ----


async def test_get_discipline_by_id_found(session):
    """根据 ID 查询学科存在时返回。"""
    disc = MagicMock(spec=Discipline)
    session.get = AsyncMock(return_value=disc)

    result = await get_discipline_by_id(session, "disc-1")

    session.get.assert_awaited_once_with(Discipline, "disc-1")
    assert result == disc


async def test_get_discipline_by_id_not_found(session):
    """学科不存在时返回 None。"""
    session.get = AsyncMock(return_value=None)

    result = await get_discipline_by_id(session, "nonexistent")

    assert result is None


# ---- get_discipline_by_name ----


async def test_get_discipline_by_name_found(session):
    """根据大分类和名称查询学科存在时返回。"""
    disc = MagicMock(spec=Discipline)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = disc
    session.execute.return_value = mock_result

    result = await get_discipline_by_name(
        session, "cat-1", "计算机科学"
    )

    assert result == disc
    session.execute.assert_awaited_once()


async def test_get_discipline_by_name_not_found(session):
    """学科不存在时返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_discipline_by_name(
        session, "cat-1", "不存在"
    )

    assert result is None


# ---- list_disciplines ----


async def test_list_disciplines_no_filter(session):
    """不带分类筛选查询所有学科。"""
    discs = [
        MagicMock(spec=Discipline),
        MagicMock(spec=Discipline),
    ]
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = discs
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_disciplines(session)

    assert len(result) == 2


async def test_list_disciplines_with_category(session):
    """按大分类筛选查询学科列表。"""
    discs = [MagicMock(spec=Discipline)]
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = discs
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_disciplines(
        session, category_id="cat-1"
    )

    assert len(result) == 1


async def test_list_disciplines_empty(session):
    """查询结果为空。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_disciplines(session)

    assert result == []


# ---- update_discipline ----


async def test_update_discipline(session):
    """更新学科信息。"""
    disc = MagicMock(spec=Discipline)

    result = await update_discipline(session, disc)

    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(disc)
    assert result == disc


# ---- delete_discipline ----


async def test_delete_discipline(session):
    """删除学科。"""
    disc = MagicMock(spec=Discipline)

    await delete_discipline(session, disc)

    session.delete.assert_awaited_once_with(disc)
    session.commit.assert_awaited_once()


# ---- discipline_has_universities ----


async def test_discipline_has_universities_true(session):
    """学科有院校专业关联时返回 True。"""
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = 2
    session.execute.return_value = mock_result

    result = await discipline_has_universities(
        session, "disc-1"
    )

    assert result is True
    session.execute.assert_awaited_once()


async def test_discipline_has_universities_false(session):
    """学科无院校专业关联时返回 False。"""
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = 0
    session.execute.return_value = mock_result

    result = await discipline_has_universities(
        session, "disc-no-uni"
    )

    assert result is False
