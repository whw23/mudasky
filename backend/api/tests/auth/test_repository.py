"""auth/repository 单元测试。

测试短信验证码和刷新令牌的数据库操作。
使用 mock session 隔离真实数据库。
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.auth.models import RefreshToken, SmsCode
from app.db.auth.repository import (
    count_recent_sms,
    create_sms_code,
    delete_expired_refresh_tokens,
    delete_expired_sms_codes,
    get_latest_sms_code,
    get_refresh_token_by_hash,
    revoke_user_refresh_tokens,
    save_refresh_token,
    verify_sms_code,
)
from app.core.exceptions import UnauthorizedException


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    s = AsyncMock()
    return s


# ---- create_sms_code ----


async def test_create_sms_code(session):
    """创建短信验证码记录。"""
    sms = SmsCode(
        phone="+8613800138000",
        code="123456",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    session.refresh = AsyncMock()

    result = await create_sms_code(session, sms)

    session.add.assert_called_once_with(sms)
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(sms)
    assert result == sms


# ---- get_latest_sms_code ----


async def test_get_latest_sms_code_found(session):
    """获取最新有效验证码。"""
    sms = MagicMock(spec=SmsCode)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sms
    session.execute.return_value = mock_result

    result = await get_latest_sms_code(session, "+8613800138000")

    assert result == sms
    session.execute.assert_awaited_once()


async def test_get_latest_sms_code_not_found(session):
    """无有效验证码返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_latest_sms_code(session, "+8613800138000")

    assert result is None


# ---- verify_sms_code ----


async def test_verify_sms_code_success(session):
    """验证码正确，标记已使用。"""
    sms = MagicMock(spec=SmsCode)
    sms.code = "123456"
    sms.attempts = 0
    sms.is_used = False

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sms
    session.execute.return_value = mock_result

    await verify_sms_code(session, "+8613800138000", "123456")

    assert sms.is_used is True
    assert sms.attempts == 1
    session.commit.assert_awaited()


async def test_verify_sms_code_no_code(session):
    """无有效验证码抛出异常。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    with pytest.raises(UnauthorizedException):
        await verify_sms_code(session, "+8613800138000", "999999")


async def test_verify_sms_code_wrong_code(session):
    """验证码不正确抛出异常，attempts 增加。"""
    sms = MagicMock(spec=SmsCode)
    sms.code = "123456"
    sms.attempts = 0

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = sms
    session.execute.return_value = mock_result

    with pytest.raises(UnauthorizedException):
        await verify_sms_code(session, "+8613800138000", "999999")

    assert sms.attempts == 1
    session.commit.assert_awaited()


# ---- count_recent_sms ----


async def test_count_recent_sms(session):
    """统计最近短信数量。"""
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = 3
    session.execute.return_value = mock_result

    result = await count_recent_sms(session, "+8613800138000", minutes=60)

    assert result == 3
    session.execute.assert_awaited_once()


# ---- delete_expired_sms_codes ----


async def test_delete_expired_sms_codes(session):
    """删除过期或已使用的验证码。"""
    await delete_expired_sms_codes(session, "+8613800138000")

    session.execute.assert_awaited_once()


# ---- delete_expired_refresh_tokens ----


async def test_delete_expired_refresh_tokens(session):
    """删除过期刷新令牌，返回删除数量。"""
    mock_result = MagicMock()
    mock_result.rowcount = 5
    session.execute.return_value = mock_result

    count = await delete_expired_refresh_tokens(session)

    assert count == 5
    session.commit.assert_awaited_once()


# ---- save_refresh_token ----


async def test_save_refresh_token(session):
    """保存刷新令牌。"""
    token = RefreshToken(
        user_id="user-1",
        token_hash="abc123",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    session.refresh = AsyncMock()

    result = await save_refresh_token(session, token)

    session.add.assert_called_once_with(token)
    session.commit.assert_awaited_once()
    assert result == token


# ---- get_refresh_token_by_hash ----


async def test_get_refresh_token_by_hash_found(session):
    """根据哈希查询刷新令牌。"""
    token = MagicMock(spec=RefreshToken)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = token
    session.execute.return_value = mock_result

    result = await get_refresh_token_by_hash(session, "hash123")

    assert result == token


async def test_get_refresh_token_by_hash_not_found(session):
    """未找到令牌返回 None。"""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    session.execute.return_value = mock_result

    result = await get_refresh_token_by_hash(session, "nonexistent")

    assert result is None


# ---- revoke_user_refresh_tokens ----


async def test_revoke_user_refresh_tokens(session):
    """撤销用户所有刷新令牌。"""
    await revoke_user_refresh_tokens(session, "user-1")

    session.execute.assert_awaited_once()
    session.commit.assert_awaited_once()
