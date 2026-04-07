"""Admin Service 单元测试。

测试 AdminService 的目标用户权限检查、用户类型修改等业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.admin.service import AdminService
from app.core.exceptions import ForbiddenException
from app.user.models import User


def _make_user(
    user_type: str = "student",
    is_superuser: bool = False,
    user_id: str = "user-1",
) -> User:
    """创建模拟 User 对象。"""
    u = MagicMock(spec=User)
    u.id = user_id
    u.phone = "13800000001"
    u.username = "testuser"
    u.user_type = user_type
    u.is_superuser = is_superuser
    u.is_active = True
    u.two_factor_enabled = False
    u.storage_quota = 104857600
    u.created_at = datetime.now(timezone.utc)
    u.updated_at = None
    return u


USER_REPO = "app.admin.service.user_repo"
RBAC_REPO = "app.admin.service.rbac_repo"


@pytest.fixture
def service() -> AdminService:
    """构建 AdminService 实例，注入 mock session。"""
    session = AsyncMock()
    return AdminService(session)


@pytest.mark.asyncio
async def test_check_target_permission_student(service):
    """拥有 student:manage 权限可以操作学生用户。"""
    target = _make_user(user_type="student")

    # 不应抛出异常
    await service.check_target_permission(
        target_user=target,
        operator_permissions=["student:manage"],
        is_superuser=False,
    )


@pytest.mark.asyncio
async def test_check_target_permission_staff_denied(service):
    """student:manage 权限不能操作员工用户。"""
    target = _make_user(user_type="staff")

    with pytest.raises(ForbiddenException):
        await service.check_target_permission(
            target_user=target,
            operator_permissions=["student:manage"],
            is_superuser=False,
        )


@pytest.mark.asyncio
async def test_check_target_permission_superuser_bypass(service):
    """超级管理员可以操作任何用户。"""
    target = _make_user(user_type="staff")

    # 不应抛出异常
    await service.check_target_permission(
        target_user=target,
        operator_permissions=[],
        is_superuser=True,
    )


@pytest.mark.asyncio
async def test_check_target_permission_superuser_target(service):
    """即使有 staff:manage，也不能管理超级管理员。"""
    target = _make_user(
        user_type="staff", is_superuser=True
    )

    with pytest.raises(ForbiddenException):
        await service.check_target_permission(
            target_user=target,
            operator_permissions=["staff:manage"],
            is_superuser=False,
        )


@pytest.mark.asyncio
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_change_user_type(
    mock_user_repo, mock_rbac_repo, service
):
    """修改用户类型为合法值。"""
    user = _make_user(user_type="student", user_id="u1")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_user_repo.update = AsyncMock()
    mock_rbac_repo.get_user_permissions = AsyncMock(
        return_value=["student:manage"]
    )
    mock_rbac_repo.get_user_group_ids = AsyncMock(
        return_value=["g1"]
    )

    result = await service.change_user_type("u1", "staff")

    assert result.user_type == "staff"
    mock_user_repo.update.assert_awaited_once()
