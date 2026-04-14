"""ContactService 单元测试。

测试访客列表、详情、标记、备注、历史、升为学员等业务逻辑。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import NotFoundException
from api.admin.contacts.service import ContactService

USER_REPO = "api.admin.contacts.service.user_repo"
RBAC_REPO = "api.admin.contacts.service.rbac_repo"
CONTACT_REPO = "api.admin.contacts.service.contact_repo"


@pytest.fixture
def service(mock_session) -> ContactService:
    """构建 ContactService 实例。"""
    return ContactService(mock_session)


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_list_contacts_success(
    mock_user_repo, mock_rbac_repo, service
):
    """查询访客列表成功。"""
    role_mock = MagicMock()
    role_mock.id = "role-visitor"
    mock_rbac_repo.get_role_by_name = AsyncMock(
        return_value=role_mock
    )
    mock_user_repo.list_by_role_and_advisor = AsyncMock(
        return_value=([], 0)
    )

    contacts, total = await service.list_contacts(0, 20)

    assert total == 0
    mock_rbac_repo.get_role_by_name.assert_awaited_once_with(
        service.session, "visitor"
    )


@pytest.mark.asyncio
@patch(RBAC_REPO)
async def test_list_contacts_no_role(
    mock_rbac_repo, service
):
    """visitor 角色不存在时返回空。"""
    mock_rbac_repo.get_role_by_name = AsyncMock(
        return_value=None
    )

    contacts, total = await service.list_contacts(0, 20)

    assert contacts == []
    assert total == 0


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_get_contact_success(
    mock_user_repo, service, sample_user
):
    """获取访客详情成功。"""
    user = sample_user(id="contact-001")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)

    result = await service.get_contact("contact-001")

    assert result.id == "contact-001"


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_get_contact_not_found(
    mock_user_repo, service
):
    """访客不存在抛出异常。"""
    mock_user_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_contact("nonexistent")


@pytest.mark.asyncio
@patch(CONTACT_REPO)
@patch(USER_REPO)
async def test_mark_status(
    mock_user_repo, mock_contact_repo, service, sample_user
):
    """标记联系状态。"""
    user = sample_user(id="c1")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock(return_value=user)
    mock_contact_repo.create_record = AsyncMock()

    await service.mark_status("c1", "contacted", "staff-1")

    assert user.contact_status == "contacted"
    mock_contact_repo.create_record.assert_awaited_once()


@pytest.mark.asyncio
@patch(CONTACT_REPO)
@patch(USER_REPO)
async def test_add_note(
    mock_user_repo, mock_contact_repo, service, sample_user
):
    """添加备注。"""
    user = sample_user(id="c1")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock(return_value=user)
    mock_contact_repo.create_record = AsyncMock()

    await service.add_note("c1", "测试备注", "staff-1")

    assert user.contact_note == "测试备注"
    mock_contact_repo.create_record.assert_awaited_once()


@pytest.mark.asyncio
@patch(CONTACT_REPO)
async def test_get_history(mock_contact_repo, service):
    """获取联系历史。"""
    mock_contact_repo.list_by_user = AsyncMock(
        return_value=[]
    )

    result = await service.get_history("c1")

    assert result == []
    mock_contact_repo.list_by_user.assert_awaited_once()


@pytest.mark.asyncio
@patch(CONTACT_REPO)
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_upgrade_to_student(
    mock_user_repo,
    mock_rbac_repo,
    mock_contact_repo,
    service,
    sample_user,
):
    """升为 student 角色。"""
    user = sample_user(id="c1")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock(return_value=user)

    student_role = MagicMock()
    student_role.id = "role-student"
    mock_rbac_repo.get_role_by_name = AsyncMock(
        return_value=student_role
    )
    mock_contact_repo.create_record = AsyncMock()

    await service.upgrade_to_student("c1", "staff-1")

    assert user.role_id == "role-student"
    mock_user_repo.update.assert_awaited_once()
    mock_contact_repo.create_record.assert_awaited_once()
