"""Admin Service 单元测试。

测试 AdminService 的用户管理业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.admin.service import AdminService
from app.user.models import User


def _make_user(
    user_id: str = "user-1",
    is_active: bool = True,
) -> User:
    """创建模拟 User 对象。"""
    u = MagicMock(spec=User)
    u.id = user_id
    u.phone = "13800000001"
    u.username = "testuser"
    u.is_active = is_active
    u.two_factor_enabled = False
    u.role_id = None
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
@patch(RBAC_REPO)
@patch(USER_REPO)
async def test_get_user_success(
    mock_user_repo, mock_rbac_repo, service
):
    """获取用户详情。"""
    user = _make_user(user_id="u1")
    mock_user_repo.get_by_id = AsyncMock(return_value=user)
    mock_rbac_repo.get_user_permissions = AsyncMock(
        return_value=["admin.user.list"]
    )
    mock_rbac_repo.get_user_role_name = AsyncMock(
        return_value="角色1"
    )

    result = await service.get_user("u1")

    assert result.id == "u1"
