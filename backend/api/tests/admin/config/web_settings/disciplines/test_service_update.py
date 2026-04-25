"""DisciplineService 单元测试（更新、获取、列表）。

测试学科分类的更新、获取和列表业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.disciplines.schemas import (
    CategoryUpdate,
    DisciplineUpdate,
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


# ---- update_category ----


@pytest.mark.asyncio
@patch(REPO)
async def test_update_category_name_success(mock_repo, service):
    """更新分类名称成功（名称变更且无冲突）。"""
    category = _make_category()
    category.name = "工学"
    mock_repo.get_category_by_id = AsyncMock(return_value=category)
    mock_repo.get_category_by_name = AsyncMock(return_value=None)
    mock_repo.update_category = AsyncMock()

    data = CategoryUpdate(category_id="cat-1", name="新工学")
    result = await service.update_category(data)

    assert result is category
    mock_repo.get_category_by_name.assert_awaited_once_with(
        service.session, "新工学"
    )
    mock_repo.update_category.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_category_name_conflict(mock_repo, service):
    """更新分类名称时名称已存在应抛出 ConflictException。"""
    category = _make_category()
    category.name = "工学"
    existing = _make_category("cat-2")
    existing.name = "理学"
    mock_repo.get_category_by_id = AsyncMock(return_value=category)
    mock_repo.get_category_by_name = AsyncMock(return_value=existing)

    data = CategoryUpdate(category_id="cat-1", name="理学")
    with pytest.raises(ConflictException) as exc_info:
        await service.update_category(data)

    assert exc_info.value.code == "DISCIPLINE_CATEGORY_EXISTS"


@pytest.mark.asyncio
@patch(REPO)
async def test_update_category_same_name(mock_repo, service):
    """更新分类时名称未变则跳过唯一性校验。"""
    category = _make_category()
    category.name = "工学"
    mock_repo.get_category_by_id = AsyncMock(return_value=category)
    mock_repo.update_category = AsyncMock()

    data = CategoryUpdate(category_id="cat-1", name="工学", sort_order=5)
    result = await service.update_category(data)

    assert result is category
    mock_repo.get_category_by_name.assert_not_called()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_category_not_found(mock_repo, service):
    """更新不存在的分类应抛出 NotFoundException。"""
    mock_repo.get_category_by_id = AsyncMock(return_value=None)

    data = CategoryUpdate(category_id="nonexistent", name="新名称")
    with pytest.raises(NotFoundException) as exc_info:
        await service.update_category(data)

    assert exc_info.value.code == "DISCIPLINE_CATEGORY_NOT_FOUND"


# ---- get_discipline ----


@pytest.mark.asyncio
@patch(REPO)
async def test_get_discipline_success(mock_repo, service):
    """获取学科成功。"""
    discipline = _make_discipline()
    mock_repo.get_discipline_by_id = AsyncMock(return_value=discipline)

    result = await service.get_discipline("disc-1")

    assert result.id == "disc-1"


@pytest.mark.asyncio
@patch(REPO)
async def test_get_discipline_not_found(mock_repo, service):
    """学科不存在应抛出 NotFoundException。"""
    mock_repo.get_discipline_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException) as exc_info:
        await service.get_discipline("nonexistent")

    assert exc_info.value.code == "DISCIPLINE_NOT_FOUND"


# ---- list_disciplines ----


@pytest.mark.asyncio
@patch(REPO)
async def test_list_disciplines_with_category(mock_repo, service):
    """按分类过滤学科列表。"""
    disciplines = [_make_discipline()]
    mock_repo.list_disciplines = AsyncMock(return_value=disciplines)

    result = await service.list_disciplines(category_id="cat-1")

    assert len(result) == 1
    mock_repo.list_disciplines.assert_awaited_once_with(
        service.session, "cat-1"
    )


@pytest.mark.asyncio
@patch(REPO)
async def test_list_disciplines_all(mock_repo, service):
    """无分类过滤时返回所有学科。"""
    disciplines = [_make_discipline(), _make_discipline("disc-2")]
    mock_repo.list_disciplines = AsyncMock(return_value=disciplines)

    result = await service.list_disciplines()

    assert len(result) == 2
    mock_repo.list_disciplines.assert_awaited_once_with(
        service.session, None
    )


# ---- update_discipline ----


@pytest.mark.asyncio
@patch(REPO)
async def test_update_discipline_name_success(mock_repo, service):
    """更新学科名称成功（名称变更且无冲突）。"""
    discipline = _make_discipline()
    discipline.name = "计算机科学"
    mock_repo.get_discipline_by_id = AsyncMock(return_value=discipline)
    mock_repo.get_discipline_by_name = AsyncMock(return_value=None)
    mock_repo.update_discipline = AsyncMock()

    data = DisciplineUpdate(discipline_id="disc-1", name="软件工程")
    result = await service.update_discipline(data)

    assert result is discipline
    mock_repo.get_discipline_by_name.assert_awaited_once_with(
        service.session, "cat-1", "软件工程"
    )
    mock_repo.update_discipline.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_discipline_name_conflict(mock_repo, service):
    """更新学科名称时同分类下名称已存在应抛出 ConflictException。"""
    discipline = _make_discipline()
    discipline.name = "计算机科学"
    existing = _make_discipline("disc-2")
    existing.name = "软件工程"
    mock_repo.get_discipline_by_id = AsyncMock(return_value=discipline)
    mock_repo.get_discipline_by_name = AsyncMock(return_value=existing)

    data = DisciplineUpdate(discipline_id="disc-1", name="软件工程")
    with pytest.raises(ConflictException) as exc_info:
        await service.update_discipline(data)

    assert exc_info.value.code == "DISCIPLINE_EXISTS"


@pytest.mark.asyncio
@patch(REPO)
async def test_update_discipline_same_name(mock_repo, service):
    """更新学科时名称未变则跳过唯一性校验。"""
    discipline = _make_discipline()
    discipline.name = "计算机科学"
    mock_repo.get_discipline_by_id = AsyncMock(return_value=discipline)
    mock_repo.update_discipline = AsyncMock()

    data = DisciplineUpdate(
        discipline_id="disc-1", name="计算机科学", sort_order=10
    )
    result = await service.update_discipline(data)

    assert result is discipline
    mock_repo.get_discipline_by_name.assert_not_called()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_discipline_not_found(mock_repo, service):
    """更新不存在的学科应抛出 NotFoundException。"""
    mock_repo.get_discipline_by_id = AsyncMock(return_value=None)

    data = DisciplineUpdate(discipline_id="nonexistent", name="新名称")
    with pytest.raises(NotFoundException) as exc_info:
        await service.update_discipline(data)

    assert exc_info.value.code == "DISCIPLINE_NOT_FOUND"
