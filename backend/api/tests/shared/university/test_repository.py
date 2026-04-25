"""university/repository 单元测试（院校 CRUD + 列表查询）。

测试院校的创建、查询、更新、删除和筛选操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.university.models import University
from app.db.university.repository import (
    create_university,
    delete_university,
    get_distinct_cities,
    get_distinct_countries,
    get_distinct_provinces,
    get_university_by_id,
    get_university_by_name,
    list_universities,
    update_university,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    s = AsyncMock()
    s.refresh = AsyncMock()
    return s


async def test_create_university(session):
    """创建院校记录。"""
    uni = University(name="北京大学", country="中国", city="北京")

    result = await create_university(session, uni)

    session.add.assert_called_once_with(uni)
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(uni)
    assert result == uni


async def test_create_university_with_optional_fields(session):
    """创建带可选字段的院校。"""
    uni = University(
        name="Harvard University",
        name_en="Harvard University",
        country="USA",
        city="Cambridge",
        is_featured=True,
        sort_order=1,
    )

    result = await create_university(session, uni)

    session.add.assert_called_once_with(uni)
    assert result == uni


async def test_get_university_by_id_found(session):
    """根据 ID 查询院校存在时返回。"""
    uni = MagicMock(spec=University)
    session.get = AsyncMock(return_value=uni)

    result = await get_university_by_id(session, "uni-1")

    session.get.assert_awaited_once_with(University, "uni-1")
    assert result == uni


async def test_get_university_by_id_not_found(session):
    """院校不存在时返回 None。"""
    session.get = AsyncMock(return_value=None)

    result = await get_university_by_id(session, "nonexistent")

    assert result is None


async def test_get_university_by_name_found(session):
    """根据名称查询院校存在时返回。"""
    uni = MagicMock(spec=University)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = uni
    session.execute.return_value = mock_result

    result = await get_university_by_name(session, "北京大学")

    assert result == uni
    session.execute.assert_awaited_once()


async def test_get_university_by_name_not_found(session):
    """名称不存在时返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_university_by_name(session, "不存在")

    assert result is None


async def test_list_universities_no_filter(session):
    """不带筛选条件分页查询院校列表。"""
    unis = [MagicMock(spec=University), MagicMock(spec=University)]
    count_result = MagicMock()
    count_result.scalar_one.return_value = 2
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = unis
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_list, total = await list_universities(
        session, offset=0, limit=10
    )

    assert total == 2
    assert len(result_list) == 2


async def test_list_universities_with_filters(session):
    """带国家和推荐筛选条件查询。"""
    unis = [MagicMock(spec=University)]
    count_result = MagicMock()
    count_result.scalar_one.return_value = 1
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = unis
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_list, total = await list_universities(
        session, offset=0, limit=10, country="中国", is_featured=True
    )

    assert total == 1
    assert len(result_list) == 1


async def test_list_universities_with_search(session):
    """带搜索关键词查询。"""
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_list, total = await list_universities(
        session, offset=0, limit=10, search="哈佛"
    )

    assert total == 0
    assert len(result_list) == 0


async def test_list_universities_empty_result(session):
    """查询结果为空。"""
    count_result = MagicMock()
    count_result.scalar_one.return_value = 0
    list_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    list_result.scalars.return_value = mock_scalars

    session.execute = AsyncMock(
        side_effect=[count_result, list_result]
    )

    result_list, total = await list_universities(
        session, offset=0, limit=10
    )

    assert total == 0
    assert result_list == []


async def test_get_distinct_countries(session):
    """获取去重国家列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = ["中国", "美国", "英国"]
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await get_distinct_countries(session)

    assert result == ["中国", "美国", "英国"]
    session.execute.assert_awaited_once()


async def test_get_distinct_countries_empty(session):
    """无院校时返回空列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await get_distinct_countries(session)

    assert result == []


async def test_get_distinct_provinces_no_filter(session):
    """获取所有省份列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = ["北京", "上海"]
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await get_distinct_provinces(session)

    assert result == ["北京", "上海"]


async def test_get_distinct_provinces_with_country(session):
    """按国家筛选省份列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = ["北京"]
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await get_distinct_provinces(session, country="中国")

    assert result == ["北京"]


async def test_get_distinct_cities_no_filter(session):
    """获取所有城市列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = ["北京", "上海", "广州"]
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await get_distinct_cities(session)

    assert result == ["北京", "上海", "广州"]


async def test_get_distinct_cities_with_country(session):
    """按国家筛选城市列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = ["Cambridge"]
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await get_distinct_cities(session, country="USA")

    assert result == ["Cambridge"]


async def test_update_university(session):
    """更新院校信息。"""
    uni = MagicMock(spec=University)

    result = await update_university(session, uni)

    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(uni)
    assert result == uni


async def test_delete_university(session):
    """删除院校记录。"""
    uni = MagicMock(spec=University)

    await delete_university(session, uni)

    session.delete.assert_awaited_once_with(uni)
    session.commit.assert_awaited_once()
