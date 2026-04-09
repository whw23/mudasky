"""pytest 全局 fixtures。"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.user.models import User
from app.auth.models import SmsCode


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
        user.password_hash = kwargs.get("password_hash", "hashed_pw")
        user.user_type = kwargs.get("user_type", "student")
        user.is_superuser = kwargs.get("is_superuser", False)
        user.is_active = kwargs.get("is_active", True)
        user.two_factor_enabled = kwargs.get(
            "two_factor_enabled", False
        )
        user.two_factor_method = kwargs.get(
            "two_factor_method", None
        )
        user.totp_secret = kwargs.get("totp_secret", None)
        user.storage_quota = kwargs.get("storage_quota", 104857600)
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
