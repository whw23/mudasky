"""SessionService 单元测试。

覆盖会话列表查询、撤销指定会话、撤销所有其他会话。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.portal.profile.sessions.service import SessionService
from app.core.exceptions import NotFoundException

AUTH_REPO = "api.portal.profile.sessions.service.auth_repo"


@pytest.fixture
def service(mock_session) -> SessionService:
    """构建 SessionService 实例，注入 mock session。"""
    return SessionService(mock_session)


def _make_token(**kwargs) -> MagicMock:
    """创建模拟 RefreshToken 对象。"""
    token = MagicMock()
    token.id = kwargs.get("id", "token-001")
    token.user_agent = kwargs.get(
        "user_agent", "Mozilla/5.0"
    )
    token.ip_address = kwargs.get(
        "ip_address", "192.168.1.1"
    )
    token.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    token.token_hash = kwargs.get(
        "token_hash", "hash-001"
    )
    return token


# ---- list_sessions ----


class TestListSessions:
    """list_sessions 方法测试。"""

    @pytest.mark.asyncio
    @patch(AUTH_REPO)
    async def test_list_sessions_success(
        self, mock_auth, service
    ):
        """正常列出多个会话。"""
        tokens = [
            _make_token(
                id="t1", token_hash="current-hash"
            ),
            _make_token(id="t2", token_hash="other-hash"),
        ]
        mock_auth.list_user_refresh_tokens = AsyncMock(
            return_value=tokens
        )

        result = await service.list_sessions(
            "user-001", "current-hash"
        )

        assert len(result) == 2
        assert result[0].id == "t1"
        assert result[0].is_current is True
        assert result[1].id == "t2"
        assert result[1].is_current is False

    @pytest.mark.asyncio
    @patch(AUTH_REPO)
    async def test_list_sessions_empty(
        self, mock_auth, service
    ):
        """无活跃会话返回空列表。"""
        mock_auth.list_user_refresh_tokens = AsyncMock(
            return_value=[]
        )

        result = await service.list_sessions(
            "user-001", "any-hash"
        )

        assert result == []


# ---- revoke_session ----


class TestRevokeSession:
    """revoke_session 方法测试。"""

    @pytest.mark.asyncio
    @patch(AUTH_REPO)
    async def test_revoke_session_success(
        self, mock_auth, service
    ):
        """成功撤销会话。"""
        mock_auth.revoke_refresh_token_by_id = AsyncMock(
            return_value=True
        )

        await service.revoke_session("token-001", "user-001")

        mock_auth.revoke_refresh_token_by_id.assert_awaited_once_with(
            service.session, "token-001", "user-001"
        )

    @pytest.mark.asyncio
    @patch(AUTH_REPO)
    async def test_revoke_session_not_found(
        self, mock_auth, service
    ):
        """会话不存在时抛出 NotFoundException。"""
        mock_auth.revoke_refresh_token_by_id = AsyncMock(
            return_value=False
        )

        with pytest.raises(NotFoundException):
            await service.revoke_session(
                "nonexistent", "user-001"
            )


# ---- revoke_all_sessions ----


class TestRevokeAllSessions:
    """revoke_all_sessions 方法测试。"""

    @pytest.mark.asyncio
    @patch(AUTH_REPO)
    async def test_revoke_all_sessions_success(
        self, mock_auth, service
    ):
        """成功撤销所有其他会话。"""
        mock_auth.revoke_other_refresh_tokens = AsyncMock()

        await service.revoke_all_sessions(
            "user-001", "keep-hash"
        )

        mock_auth.revoke_other_refresh_tokens.assert_awaited_once_with(
            service.session, "user-001", "keep-hash"
        )
