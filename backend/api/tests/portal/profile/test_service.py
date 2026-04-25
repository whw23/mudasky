"""ProfileService 单元测试。"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import (
    ConflictException, ForbiddenException,
    NotFoundException, UnauthorizedException,
)
from api.portal.profile.schemas import PasswordChange, PhoneChange, UserUpdate
from api.portal.profile.service import ProfileService

DOC_REPO = "api.portal.profile.service.doc_repo"
USER_REPO = "api.portal.profile.service.repository"
AUTH_REPO = "api.portal.profile.service.auth_repo"
RBAC_REPO = "api.portal.profile.service.rbac_repo"


@pytest.fixture
def service(mock_session) -> ProfileService:
    """构建 ProfileService 实例，注入 mock session。"""
    return ProfileService(mock_session)


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_get_user_response_success(
    mock_repo, mock_rbac_repo, service, sample_user
):
    """获取用户响应，包含权限和角色名。"""
    user = sample_user(id="user-001", role_id="role-x")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_rbac_repo.get_permissions_by_role = AsyncMock(return_value=["user:read"])
    role_mock = MagicMock()
    role_mock.name = "学生角色"
    mock_rbac_repo.get_role_by_id = AsyncMock(return_value=role_mock)
    result = await service.get_user_response("user-001")
    assert result.id == "user-001"
    assert result.permissions == ["user:read"]
    assert result.role_name == "学生角色"


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_get_user_not_found(mock_repo, service):
    """用户不存在抛出异常。"""
    mock_repo.get_by_id = AsyncMock(return_value=None)
    with pytest.raises(NotFoundException):
        await service.get_user("nonexistent")


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_update_profile_username(
    mock_repo, service, sample_user
):
    """更新用户名成功。"""
    user = sample_user(id="user-1", username="old")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_repo.get_by_username = AsyncMock(return_value=None)
    mock_repo.update = AsyncMock(return_value=user)
    data = UserUpdate(username="newname")
    result = await service.update_profile("user-1", data)
    assert result == user
    mock_repo.update.assert_awaited_once()


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_update_profile_username_conflict(
    mock_repo, service, sample_user
):
    """用户名被他人使用抛出异常。"""
    user = sample_user(id="user-1")
    other = sample_user(id="user-2", username="taken")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_repo.get_by_username = AsyncMock(return_value=other)
    data = UserUpdate(username="taken")
    with pytest.raises(ConflictException):
        await service.update_profile("user-1", data)


@pytest.mark.asyncio
@patch("api.portal.profile.service.decrypt_password", return_value="newpass123")
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_change_password_success(
    mock_repo, mock_auth_repo, mock_decrypt, service, sample_user
):
    """修改密码成功。"""
    user = sample_user(phone="+86-13800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_auth_repo.verify_sms_code = AsyncMock()
    mock_repo.update = AsyncMock(return_value=user)
    data = PasswordChange(
        phone="+86-13800138000", code="123456",
        encrypted_password="enc_data", nonce="test_nonce",
    )
    with patch(
        "api.portal.profile.service.hash_password",
        return_value="new_hash",
    ):
        await service.change_password("user-001", data)
    mock_auth_repo.verify_sms_code.assert_awaited_once()
    mock_repo.update.assert_awaited_once()


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_change_password_phone_mismatch(
    mock_repo, service, sample_user
):
    """手机号不匹配应抛出 ConflictException。"""
    user = sample_user(phone="+86-13800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    data = PasswordChange(
        phone="+86-13900139000", code="123456",
        encrypted_password="enc_data", nonce="test_nonce",
    )
    with pytest.raises(ConflictException):
        await service.change_password("user-001", data)


@pytest.mark.asyncio
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_change_phone_success(
    mock_repo, mock_auth_repo, service, sample_user
):
    """修改手机号成功。"""
    user = sample_user(id="user-001", phone="+86-13800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_auth_repo.verify_sms_code = AsyncMock()
    mock_repo.get_by_phone = AsyncMock(return_value=None)
    mock_repo.update = AsyncMock(return_value=user)
    data = PhoneChange(new_phone="+86-13900139000", code="654321")
    result = await service.change_phone("user-001", data)
    assert result == user
    mock_auth_repo.verify_sms_code.assert_awaited_once()


@pytest.mark.asyncio
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_change_phone_already_used(
    mock_repo, mock_auth_repo, service, sample_user
):
    """新手机号已被其他用户使用应抛出 ConflictException。"""
    user = sample_user(id="user-001", phone="+86-13800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    other_user = sample_user(id="user-002")
    mock_repo.get_by_phone = AsyncMock(return_value=other_user)
    data = PhoneChange(new_phone="+86-13900139000", code="654321")
    with pytest.raises(ConflictException):
        await service.change_phone("user-001", data)


@pytest.mark.asyncio
@patch(DOC_REPO)
@patch(AUTH_REPO)
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_delete_user_success(
    mock_repo, mock_rbac_repo, mock_auth_repo,
    mock_doc_repo, service, sample_user
):
    """删除用户及其关联数据。"""
    user = sample_user(id="user-del", phone="+86-13800138000", role_id=None)
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_auth_repo.delete_refresh_tokens_by_user = AsyncMock()
    mock_auth_repo.delete_sms_codes_by_phone = AsyncMock()
    mock_doc_repo.delete_by_user = AsyncMock()
    mock_repo.delete = AsyncMock()
    await service.delete_user("user-del")
    mock_auth_repo.delete_refresh_tokens_by_user.assert_awaited_once()
    mock_auth_repo.delete_sms_codes_by_phone.assert_awaited_once()
    mock_doc_repo.delete_by_user.assert_awaited_once()
    mock_repo.delete.assert_awaited_once()


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_delete_user_superuser_forbidden(
    mock_repo, mock_rbac_repo, service, sample_user
):
    """删除超级管理员抛出 ForbiddenException。"""
    user = sample_user(id="admin-1", role_id="role-su")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    role_mock = MagicMock()
    role_mock.name = "superuser"
    mock_rbac_repo.get_role_by_id = AsyncMock(return_value=role_mock)
    with pytest.raises(ForbiddenException):
        await service.delete_user("admin-1")


@pytest.mark.asyncio
@patch(DOC_REPO)
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_delete_user_no_phone(
    mock_repo, mock_auth_repo, mock_doc_repo,
    service, sample_user
):
    """删除无手机号的用户跳过 sms_codes 删除。"""
    user = sample_user(id="user-nophone", phone=None, role_id=None)
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_auth_repo.delete_refresh_tokens_by_user = AsyncMock()
    mock_doc_repo.delete_by_user = AsyncMock()
    mock_repo.delete = AsyncMock()
    await service.delete_user("user-nophone")
    mock_auth_repo.delete_refresh_tokens_by_user.assert_awaited_once()
    mock_auth_repo.delete_sms_codes_by_phone.assert_not_called()


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_delete_user_not_found(mock_repo, service):
    """删除不存在的用户抛出异常。"""
    mock_repo.get_by_id = AsyncMock(return_value=None)
    with pytest.raises(NotFoundException):
        await service.delete_user("nonexistent")


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_get_user_no_role(mock_repo, mock_rbac, service, sample_user):
    """用户无角色时返回 role_name 为 None。"""
    user = sample_user(id="u-norole", role_id=None)
    mock_repo.get_by_id = AsyncMock(return_value=user)
    result = await service.get_user_response("u-norole")
    assert result.role_name is None
    assert result.permissions == []


@pytest.mark.asyncio
@patch(USER_REPO)
async def test_update_no_changes(mock_repo, service, sample_user):
    """空更新（无字段变更）仍成功。"""
    user = sample_user(id="u-1")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_repo.update = AsyncMock(return_value=user)
    result = await service.update_profile("u-1", UserUpdate())
    assert result == user


@pytest.mark.asyncio
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_change_password_verification_failed(
    mock_repo, mock_auth, service, sample_user
):
    """短信验证码无效抛出 UnauthorizedException。"""
    user = sample_user(phone="+86-13800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    err = UnauthorizedException(message="验证码无效", code="SMS_CODE_EXPIRED")
    mock_auth.verify_sms_code = AsyncMock(side_effect=err)
    data = PasswordChange(
        phone="+86-13800138000", code="000000", encrypted_password="enc", nonce="n",
    )
    with pytest.raises(UnauthorizedException):
        await service.change_password("user-001", data)


@pytest.mark.asyncio
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_change_phone_verification_failed(
    mock_repo, mock_auth, service, sample_user
):
    """新手机号验证码无效抛出 UnauthorizedException。"""
    user = sample_user(id="u-1", phone="+86-13800138000")
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_repo.get_by_phone = AsyncMock(return_value=None)
    err = UnauthorizedException(message="验证码无效", code="SMS_CODE_EXPIRED")
    mock_auth.verify_sms_code = AsyncMock(side_effect=err)
    data = PhoneChange(new_phone="+86-13900139000", code="000000")
    with pytest.raises(UnauthorizedException):
        await service.change_phone("u-1", data)


@pytest.mark.asyncio
@patch(DOC_REPO)
@patch(AUTH_REPO)
@patch(USER_REPO)
async def test_delete_user_with_documents(
    mock_repo, mock_auth, mock_doc, service, sample_user
):
    """用户有文档时删除仍清理所有关联数据。"""
    user = sample_user(id="u-doc", phone="+86-13800138000", role_id=None)
    mock_repo.get_by_id = AsyncMock(return_value=user)
    mock_auth.delete_refresh_tokens_by_user = AsyncMock()
    mock_auth.delete_sms_codes_by_phone = AsyncMock()
    mock_doc.delete_by_user = AsyncMock()
    mock_repo.delete = AsyncMock()
    await service.delete_user("u-doc")
    mock_doc.delete_by_user.assert_awaited_once_with(service.session, "u-doc")
