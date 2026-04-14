"""CaseService 单元测试。

测试成功案例公开查询逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.public.case.service import CaseService
from app.core.exceptions import NotFoundException

REPO = "api.public.case.service.repository"


def _make_case(**kwargs) -> MagicMock:
    """创建模拟 SuccessCase 对象。"""
    c = MagicMock()
    c.id = kwargs.get("id", "case-001")
    c.student_name = kwargs.get("student_name", "张三")
    c.university = kwargs.get("university", "测试大学")
    c.program = kwargs.get("program", "计算机科学")
    c.year = kwargs.get("year", 2025)
    c.testimonial = kwargs.get("testimonial", "很棒")
    c.avatar_url = kwargs.get("avatar_url", None)
    c.is_featured = kwargs.get("is_featured", False)
    c.sort_order = kwargs.get("sort_order", 0)
    c.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    c.updated_at = kwargs.get("updated_at", None)
    return c


@pytest.fixture
def service(mock_session) -> CaseService:
    """构建 CaseService 实例，注入 mock session。"""
    return CaseService(mock_session)


# ---- get_case ----


@patch(REPO)
async def test_get_case_success(mock_repo, service):
    """获取案例详情成功。"""
    case = _make_case(id="case-001")
    mock_repo.get_case_by_id = AsyncMock(return_value=case)

    result = await service.get_case("case-001")

    assert result.id == "case-001"
    mock_repo.get_case_by_id.assert_awaited_once_with(
        service.session, "case-001"
    )


@patch(REPO)
async def test_get_case_not_found(mock_repo, service):
    """案例不存在应抛出 NotFoundException。"""
    mock_repo.get_case_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_case("nonexistent")


# ---- list_cases ----


@patch(REPO)
async def test_list_cases_success(mock_repo, service):
    """分页查询案例列表成功。"""
    cases = [_make_case(id="case-001"), _make_case(id="case-002")]
    mock_repo.list_cases = AsyncMock(return_value=(cases, 2))

    result, total = await service.list_cases(0, 20)

    assert total == 2
    assert len(result) == 2
    mock_repo.list_cases.assert_awaited_once_with(
        service.session, 0, 20, None, None
    )


@patch(REPO)
async def test_list_cases_with_filters(mock_repo, service):
    """带筛选条件查询案例列表。"""
    mock_repo.list_cases = AsyncMock(return_value=([], 0))

    result, total = await service.list_cases(
        0, 10, year=2025, featured=True
    )

    assert total == 0
    mock_repo.list_cases.assert_awaited_once_with(
        service.session, 0, 10, 2025, True
    )


@patch(REPO)
async def test_list_cases_empty(mock_repo, service):
    """查询结果为空时返回空列表和 0。"""
    mock_repo.list_cases = AsyncMock(return_value=([], 0))

    result, total = await service.list_cases(0, 20)

    assert result == []
    assert total == 0
