"""DisciplineService 单元测试。

测试学科分类的 CRUD 业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.disciplines.schemas import (
    CategoryCreate,
    DisciplineCreate,
)
from api.admin.config.web_settings.disciplines.service import DisciplineService
from app.core.exceptions import ConflictException, NotFoundException
from app.db.discipline.models import Discipline, DisciplineCategory

REPO = "api.admin.config.web_settings.disciplines.service.repository"


def _make_category(category_id: str = "cat-1") -> MagicMock:
    """创建模拟 DisciplineCategory 对象。"""
    c = MagicMock(spec=DisciplineCategory)
    c.id = category_id
    c.name = "工学"
    c.sort_order = 0
    c.created_at = datetime.now(timezone.utc)
    c.updated_at = None
    return c


def _make_discipline(discipline_id: str = "disc-1") -> MagicMock:
    """创建模拟 Discipline 对象。"""
    d = MagicMock(spec=Discipline)
    d.id = discipline_id
    d.category_id = "cat-1"
    d.name = "计算机科学"
    d.sort_order = 0
    d.created_at = datetime.now(timezone.utc)
    d.updated_at = None
    return d


@pytest.fixture
def service(mock_session) -> DisciplineService:
    """构建 DisciplineService 实例，注入 mock session。"""
    return DisciplineService(mock_session)


# ---- create_category ----


@pytest.mark.asyncio
@patch(REPO)
async def test_create_category_success(mock_repo, service):
    """创建学科大分类成功。"""
    mock_repo.get_category_by_name = AsyncMock(return_value=None)
    category = _make_category()
    mock_repo.create_category = AsyncMock(return_value=category)

    data = CategoryCreate(name="工学", sort_order=0)
    result = await service.create_category(data)

    assert result.id == "cat-1"
    assert result.name == "工学"
    mock_repo.get_category_by_name.assert_awaited_once_with(service.session, "工学")
    mock_repo.create_category.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_create_category_duplicate(mock_repo, service):
    """分类名称已存在应抛出 ConflictException。"""
    existing = _make_category()
    mock_repo.get_category_by_name = AsyncMock(return_value=existing)

    data = CategoryCreate(name="工学", sort_order=0)
    with pytest.raises(ConflictException) as exc_info:
        await service.create_category(data)

    assert exc_info.value.code == "DISCIPLINE_CATEGORY_EXISTS"


# ---- get_category ----


@pytest.mark.asyncio
@patch(REPO)
async def test_get_category_not_found(mock_repo, service):
    """分类不存在应抛出 NotFoundException。"""
    mock_repo.get_category_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException) as exc_info:
        await service.get_category("nonexistent")

    assert exc_info.value.code == "DISCIPLINE_CATEGORY_NOT_FOUND"


@pytest.mark.asyncio
@patch(REPO)
async def test_get_category_success(mock_repo, service):
    """获取分类成功。"""
    category = _make_category()
    mock_repo.get_category_by_id = AsyncMock(return_value=category)

    result = await service.get_category("cat-1")

    assert result.id == "cat-1"


# ---- delete_category ----


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_category_has_disciplines(mock_repo, service):
    """分类下存在学科时拒绝删除。"""
    category = _make_category()
    mock_repo.get_category_by_id = AsyncMock(return_value=category)
    mock_repo.category_has_disciplines = AsyncMock(return_value=True)

    with pytest.raises(ConflictException) as exc_info:
        await service.delete_category("cat-1")

    assert exc_info.value.code == "DISCIPLINE_CATEGORY_HAS_DISCIPLINES"


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_category_success(mock_repo, service):
    """删除空分类成功。"""
    category = _make_category()
    mock_repo.get_category_by_id = AsyncMock(return_value=category)
    mock_repo.category_has_disciplines = AsyncMock(return_value=False)
    mock_repo.delete_category = AsyncMock()

    await service.delete_category("cat-1")

    mock_repo.delete_category.assert_awaited_once()


# ---- create_discipline ----


@pytest.mark.asyncio
@patch(REPO)
async def test_create_discipline_success(mock_repo, service):
    """创建学科成功。"""
    category = _make_category()
    mock_repo.get_category_by_id = AsyncMock(return_value=category)
    mock_repo.get_discipline_by_name = AsyncMock(return_value=None)
    discipline = _make_discipline()
    mock_repo.create_discipline = AsyncMock(return_value=discipline)

    data = DisciplineCreate(category_id="cat-1", name="计算机科学", sort_order=0)
    result = await service.create_discipline(data)

    assert result.id == "disc-1"
    assert result.name == "计算机科学"


@pytest.mark.asyncio
@patch(REPO)
async def test_create_discipline_duplicate(mock_repo, service):
    """同一分类下学科名称已存在应抛出 ConflictException。"""
    category = _make_category()
    mock_repo.get_category_by_id = AsyncMock(return_value=category)
    existing = _make_discipline()
    mock_repo.get_discipline_by_name = AsyncMock(return_value=existing)

    data = DisciplineCreate(category_id="cat-1", name="计算机科学", sort_order=0)
    with pytest.raises(ConflictException) as exc_info:
        await service.create_discipline(data)

    assert exc_info.value.code == "DISCIPLINE_EXISTS"


# ---- delete_discipline ----


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_discipline_has_universities(mock_repo, service):
    """学科下存在院校时拒绝删除。"""
    discipline = _make_discipline()
    mock_repo.get_discipline_by_id = AsyncMock(return_value=discipline)
    mock_repo.discipline_has_universities = AsyncMock(return_value=True)

    with pytest.raises(ConflictException) as exc_info:
        await service.delete_discipline("disc-1")

    assert exc_info.value.code == "DISCIPLINE_HAS_UNIVERSITIES"


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_discipline_success(mock_repo, service):
    """删除无院校的学科成功。"""
    discipline = _make_discipline()
    mock_repo.get_discipline_by_id = AsyncMock(return_value=discipline)
    mock_repo.discipline_has_universities = AsyncMock(return_value=False)
    mock_repo.delete_discipline = AsyncMock()

    await service.delete_discipline("disc-1")

    mock_repo.delete_discipline.assert_awaited_once()


# ---- list_categories ----


@pytest.mark.asyncio
@patch(REPO)
async def test_list_categories(mock_repo, service):
    """查询所有分类。"""
    categories = [_make_category("cat-1"), _make_category("cat-2")]
    mock_repo.list_categories = AsyncMock(return_value=categories)

    result = await service.list_categories()

    assert len(result) == 2
    mock_repo.list_categories.assert_awaited_once_with(service.session)


@pytest.mark.asyncio
@patch(REPO)
async def test_list_categories_empty(mock_repo, service):
    """无分类时返回空列表。"""
    mock_repo.list_categories = AsyncMock(return_value=[])

    result = await service.list_categories()

    assert result == []
