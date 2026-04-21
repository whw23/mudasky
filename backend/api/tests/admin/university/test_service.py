"""UniversityService 单元测试。

测试院校的 CRUD 业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.university.models import University
from api.admin.config.web_settings.universities.schemas import (
    UniversityCreate,
    UniversityUpdate,
)
from api.admin.config.web_settings.universities.service import UniversityService
from app.core.exceptions import NotFoundException


REPO = "api.admin.config.web_settings.universities.service.repository"


def _make_university(
    university_id: str = "uni-1",
) -> University:
    """创建模拟 University 对象。"""
    u = MagicMock(spec=University)
    u.id = university_id
    u.name = "北京大学"
    u.name_en = "Peking University"
    u.country = "中国"
    u.province = "北京"
    u.city = "北京"
    u.logo_url = None
    u.description = "简介"
    u.website = None
    u.is_featured = False
    u.sort_order = 0
    u.created_at = datetime.now(timezone.utc)
    u.updated_at = None
    return u


@pytest.fixture
def service() -> UniversityService:
    """构建 UniversityService 实例，注入 mock session。"""
    session = AsyncMock()
    return UniversityService(session)


# ---- list_universities ----


@pytest.mark.asyncio
@patch("api.admin.config.web_settings.universities.service.prog_repo")
@patch(REPO)
async def test_list_universities(mock_repo, mock_prog_repo, service):
    """分页查询院校列表，返回列表和总数。"""
    universities = [
        _make_university(),
        _make_university("uni-2"),
    ]
    mock_repo.list_universities = AsyncMock(
        return_value=(universities, 2)
    )
    mock_prog_repo.list_programs = AsyncMock(return_value=[])

    result, total = await service.list_universities(
        offset=0, limit=10
    )

    assert total == 2
    assert len(result) == 2
    mock_repo.list_universities.assert_awaited_once()


# ---- get_university ----


@pytest.mark.asyncio
@patch(REPO)
async def test_get_university_success(mock_repo, service):
    """获取院校成功。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(
        return_value=university
    )

    result = await service.get_university("uni-1")

    assert result.id == "uni-1"


@pytest.mark.asyncio
@patch(REPO)
async def test_get_university_not_found(
    mock_repo, service
):
    """院校不存在时抛出 NotFoundException。"""
    mock_repo.get_university_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(NotFoundException):
        await service.get_university("nonexistent")


# ---- create_university ----


@pytest.mark.asyncio
@patch(REPO)
async def test_create_university_success(
    mock_repo, service
):
    """创建院校成功。"""
    university = _make_university()
    mock_repo.create_university = AsyncMock(
        return_value=university
    )

    data = UniversityCreate(
        name="北京大学",
        country="中国",
        city="北京",
    )
    result = await service.create_university(data)

    assert result.id == "uni-1"
    mock_repo.create_university.assert_awaited_once()


# ---- update_university ----


@pytest.mark.asyncio
@patch(REPO)
async def test_update_university_success(
    mock_repo, service
):
    """更新院校成功。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(
        return_value=university
    )
    mock_repo.update_university = AsyncMock(
        return_value=university
    )

    data = UniversityUpdate(university_id="uni-1", name="清华大学")
    result = await service.update_university("uni-1", data)

    assert result is not None
    mock_repo.update_university.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_university_not_found(
    mock_repo, service
):
    """更新不存在的院校抛出 NotFoundException。"""
    mock_repo.get_university_by_id = AsyncMock(
        return_value=None
    )

    data = UniversityUpdate(university_id="uni-1", name="清华大学")
    with pytest.raises(NotFoundException):
        await service.update_university(
            "nonexistent", data
        )


# ---- delete_university ----


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_university_success(
    mock_repo, service
):
    """删除院校成功。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(
        return_value=university
    )
    mock_repo.delete_university = AsyncMock()

    await service.delete_university("uni-1")

    mock_repo.delete_university.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_university_not_found(
    mock_repo, service
):
    """删除不存在的院校抛出 NotFoundException。"""
    mock_repo.get_university_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(NotFoundException):
        await service.delete_university("nonexistent")
