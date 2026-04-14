"""UniversityService 单元测试。

测试合作院校公开查询逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.public.university.service import UniversityService
from app.core.exceptions import NotFoundException

REPO = "api.public.university.service.repository"


def _make_university(**kwargs) -> MagicMock:
    """创建模拟 University 对象。"""
    u = MagicMock()
    u.id = kwargs.get("id", "uni-001")
    u.name = kwargs.get("name", "测试大学")
    u.name_en = kwargs.get("name_en", "Test University")
    u.country = kwargs.get("country", "中国")
    u.province = kwargs.get("province", "北京")
    u.city = kwargs.get("city", "北京")
    u.logo_url = kwargs.get("logo_url", None)
    u.description = kwargs.get("description", "描述")
    u.programs = kwargs.get("programs", ["计算机"])
    u.website = kwargs.get("website", None)
    u.is_featured = kwargs.get("is_featured", False)
    u.sort_order = kwargs.get("sort_order", 0)
    u.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    u.updated_at = kwargs.get("updated_at", None)
    return u


@pytest.fixture
def service(mock_session) -> UniversityService:
    """构建 UniversityService 实例，注入 mock session。"""
    return UniversityService(mock_session)


# ---- get_university ----


@patch(REPO)
async def test_get_university_success(mock_repo, service):
    """获取院校详情成功。"""
    uni = _make_university(id="uni-001")
    mock_repo.get_university_by_id = AsyncMock(return_value=uni)

    result = await service.get_university("uni-001")

    assert result.id == "uni-001"
    mock_repo.get_university_by_id.assert_awaited_once_with(
        service.session, "uni-001"
    )


@patch(REPO)
async def test_get_university_not_found(mock_repo, service):
    """院校不存在应抛出 NotFoundException。"""
    mock_repo.get_university_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_university("nonexistent")


# ---- list_universities ----


@patch(REPO)
async def test_list_universities_success(mock_repo, service):
    """分页查询院校列表成功。"""
    unis = [_make_university(id="uni-001"), _make_university(id="uni-002")]
    mock_repo.list_universities = AsyncMock(return_value=(unis, 2))

    result, total = await service.list_universities(0, 20)

    assert total == 2
    assert len(result) == 2
    mock_repo.list_universities.assert_awaited_once_with(
        service.session, 0, 20, None, None, None, None, None
    )


@patch(REPO)
async def test_list_universities_with_filters(mock_repo, service):
    """带筛选条件查询院校列表。"""
    mock_repo.list_universities = AsyncMock(return_value=([], 0))

    result, total = await service.list_universities(
        0, 10, country="中国", city="北京",
        is_featured=True, search="清华", program="计算机"
    )

    assert total == 0
    mock_repo.list_universities.assert_awaited_once_with(
        service.session, 0, 10, "中国", "北京", True, "清华", "计算机"
    )


@patch(REPO)
async def test_list_universities_empty(mock_repo, service):
    """查询结果为空时返回空列表和 0。"""
    mock_repo.list_universities = AsyncMock(return_value=([], 0))

    result, total = await service.list_universities(0, 20)

    assert result == []
    assert total == 0


# ---- get_distinct_countries ----


@patch(REPO)
async def test_get_distinct_countries(mock_repo, service):
    """获取去重国家列表成功。"""
    mock_repo.get_distinct_countries = AsyncMock(
        return_value=["中国", "美国", "英国"]
    )

    result = await service.get_distinct_countries()

    assert result == ["中国", "美国", "英国"]
    mock_repo.get_distinct_countries.assert_awaited_once_with(
        service.session
    )


@patch(REPO)
async def test_get_distinct_countries_empty(mock_repo, service):
    """无院校时返回空国家列表。"""
    mock_repo.get_distinct_countries = AsyncMock(return_value=[])

    result = await service.get_distinct_countries()

    assert result == []


# ---- get_distinct_provinces ----


@patch(REPO)
async def test_get_distinct_provinces(mock_repo, service):
    """获取去重省份列表成功。"""
    mock_repo.get_distinct_provinces = AsyncMock(
        return_value=["北京", "上海"]
    )

    result = await service.get_distinct_provinces()

    assert result == ["北京", "上海"]
    mock_repo.get_distinct_provinces.assert_awaited_once_with(
        service.session, None
    )


@patch(REPO)
async def test_get_distinct_provinces_with_country(mock_repo, service):
    """按国家筛选省份列表。"""
    mock_repo.get_distinct_provinces = AsyncMock(
        return_value=["北京"]
    )

    result = await service.get_distinct_provinces("中国")

    assert result == ["北京"]
    mock_repo.get_distinct_provinces.assert_awaited_once_with(
        service.session, "中国"
    )


# ---- get_distinct_cities ----


@patch(REPO)
async def test_get_distinct_cities(mock_repo, service):
    """获取去重城市列表成功。"""
    mock_repo.get_distinct_cities = AsyncMock(
        return_value=["北京", "上海"]
    )

    result = await service.get_distinct_cities()

    assert result == ["北京", "上海"]
    mock_repo.get_distinct_cities.assert_awaited_once_with(
        service.session, None
    )


@patch(REPO)
async def test_get_distinct_cities_with_country(mock_repo, service):
    """按国家筛选城市列表。"""
    mock_repo.get_distinct_cities = AsyncMock(
        return_value=["东京"]
    )

    result = await service.get_distinct_cities("日本")

    assert result == ["东京"]
    mock_repo.get_distinct_cities.assert_awaited_once_with(
        service.session, "日本"
    )
