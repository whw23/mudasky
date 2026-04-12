"""pytest 全局 fixtures。"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from api.main import app
from app.auth.models import SmsCode
from app.user.models import User


@pytest.fixture
async def client():
    """异步测试客户端。"""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test/api",
    ) as c:
        yield c


@pytest.fixture
def superuser_headers():
    """超级管理员请求头（拥有通配符权限）。"""
    return {
        "X-User-Id": "admin-1",
        "X-User-Permissions": "*",
    }


@pytest.fixture
def staff_headers():
    """员工用户请求头（拥有部分管理权限）。"""
    return {
        "X-User-Id": "staff-1",
        "X-User-Permissions": (
            "admin/users/*,admin/content/*,"
            "admin/categories/*,portal/articles/create"
        ),
    }


@pytest.fixture
def user_headers():
    """普通用户请求头（无管理权限）。"""
    return {
        "X-User-Id": "user-1",
        "X-User-Permissions": "",
    }


@pytest.fixture
def mock_session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    return AsyncMock()


@pytest.fixture
def sample_user() -> MagicMock:
    """创建样例用户工厂。

    返回一个可自定义属性的 User mock 对象。
    """

    def _factory(**kwargs) -> MagicMock:
        user = MagicMock(spec=User)
        user.id = kwargs.get("id", "user-001")
        user.phone = kwargs.get("phone", "+8613800138000")
        user.username = kwargs.get("username", "testuser")
        user.password_hash = kwargs.get(
            "password_hash", "hashed_pw"
        )
        user.is_active = kwargs.get("is_active", True)
        user.two_factor_enabled = kwargs.get(
            "two_factor_enabled", False
        )
        user.two_factor_method = kwargs.get(
            "two_factor_method", None
        )
        user.totp_secret = kwargs.get("totp_secret", None)
        user.role_id = kwargs.get("role_id", None)
        user.storage_quota = kwargs.get(
            "storage_quota", 104857600
        )
        user.created_at = kwargs.get(
            "created_at", datetime.now(timezone.utc)
        )
        user.updated_at = kwargs.get("updated_at", None)
        return user

    return _factory


@pytest.fixture
def sample_sms_code() -> MagicMock:
    """创建样例短信验证码工厂。"""

    def _factory(**kwargs) -> MagicMock:
        sms = MagicMock(spec=SmsCode)
        sms.id = kwargs.get("id", "sms-001")
        sms.phone = kwargs.get("phone", "+8613800138000")
        sms.code = kwargs.get("code", "123456")
        sms.is_used = kwargs.get("is_used", False)
        sms.attempts = kwargs.get("attempts", 0)
        sms.expires_at = kwargs.get(
            "expires_at", datetime.now(timezone.utc)
        )
        sms.created_at = kwargs.get(
            "created_at", datetime.now(timezone.utc)
        )
        return sms

    return _factory
