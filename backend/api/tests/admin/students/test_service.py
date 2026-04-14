"""StudentService 单元测试。

测试学生列表、详情、编辑、指定顾问、降为访客等业务逻辑。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import NotFoundException
from api.admin.students.service import StudentService

USER_REPO = "api.admin.students.service.user_repo"
RBAC_REPO = "api.admin.students.service.rbac_repo"
DOC_REPO = "api.admin.students.service.doc_repo"


@pytest.fixture
def service(mock_session) -> StudentService:
    """构建 StudentService 实例。"""
    return StudentService(mock_session)


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_list_students_success(
    mock_user_repo, mock_rbac_repo, service
):
    """查询学生列表成功。"""
    role_mock = MagicMock()
    role_mock.id = "role-student"
    mock_rbac_repo.get_role_by_name = AsyncMock(
        return_value=role_mock
    )
    mock_user_repo.list_by_role_and_advisor = AsyncMock(
        return_value=([], 0)
    )

    students, total = await service.list_students(0, 20)

    assert total == 0
    mock_rbac_repo.get_role_by_name.assert_awaited_once_with(
        service.session, "student"
    )


@pytest.mark.asyncio
@patch(RBAC_REPO)
async def test_list_students_no_role(mock_rbac_repo, service):
    """student 角色不存在时返回空。"""
    mock_rbac_repo.get_role_by_name = AsyncMock(
        return_value=None
    )

    students, total = await service.list_students(0, 20)

    assert students == []
    assert total == 0


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_get_student_success(
    mock_user_repo, service, sample_user
):
    """获取学生详情成功。"""
    user = sample_user(id="student-001")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)

    result = await service.get_student("student-001")

    assert result.id == "student-001"


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_get_student_not_found(
    mock_user_repo, service
):
    """学生不存在抛出异常。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_student("nonexistent")


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_edit_student(
    mock_user_repo, service, sample_user
):
    """编辑学生信息。"""
    user = sample_user(id="s1")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock(return_value=user)

    result = await service.edit_student("s1", is_active=False)

    assert result == user
    assert user.is_active is False
    mock_user_repo.update.assert_awaited_once()


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_downgrade_to_visitor(
    mock_user_repo, mock_rbac_repo, service, sample_user
):
    """降为 visitor 角色。"""
    user = sample_user(id="s1")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock(return_value=user)

    visitor_role = MagicMock()
    visitor_role.id = "role-visitor"
    mock_rbac_repo.get_role_by_name = AsyncMock(
        return_value=visitor_role
    )

    await service.downgrade_to_visitor("s1")

    assert user.role_id == "role-visitor"
    assert user.advisor_id is None
    mock_user_repo.update.assert_awaited_once()


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_assign_advisor(
    mock_user_repo, service, sample_user
):
    """指定负责顾问。"""
    user = sample_user(id="s1")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock(return_value=user)

    await service.assign_advisor("s1", "advisor-1")

    assert user.advisor_id == "advisor-1"
    mock_user_repo.update.assert_awaited_once()
