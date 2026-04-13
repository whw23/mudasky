"""会话管理路由集成测试。

覆盖会话列表查询、撤销指定会话、撤销所有其他会话等端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.auth.models import RefreshToken


def _make_token(**kwargs) -> MagicMock:
    """创建模拟 RefreshToken 对象。"""
    token = MagicMock(spec=RefreshToken)
    token.id = kwargs.get("id", "token-001")
    token.user_id = kwargs.get("user_id", "user-001")
    token.token_hash = kwargs.get("token_hash", "hash-aaa")
    token.user_agent = kwargs.get("user_agent", "Mozilla/5.0")
    token.ip_address = kwargs.get("ip_address", "192.168.1.1")
    token.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    token.expires_at = kwargs.get(
        "expires_at", datetime.now(timezone.utc)
    )
    return token


class TestListSessions:
    """查看所有活跃会话端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_repo(self):
        """模拟 auth_repo。"""
        with patch("app.user.router.auth_repo") as mock_repo:
            self.mock_repo = mock_repo
            yield

    async def test_list_sessions_success(
        self, client, user_headers
    ):
        """成功列出会话，正确标记当前会话。"""
        token1 = _make_token(
            id="token-1",
            token_hash="current-hash",
            user_agent="Chrome/120.0",
            ip_address="192.168.1.1",
        )
        token2 = _make_token(
            id="token-2",
            token_hash="other-hash",
            user_agent="Firefox/120.0",
            ip_address="192.168.1.2",
        )
        self.mock_repo.list_user_refresh_tokens = AsyncMock(
            return_value=[token1, token2]
        )

        resp = await client.get(
            "/portal/profile/sessions",
            headers={
                **user_headers,
                "X-Refresh-Token-Hash": "current-hash",
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["id"] == "token-1"
        assert data[0]["is_current"] is True
        assert data[1]["id"] == "token-2"
        assert data[1]["is_current"] is False

    async def test_list_sessions_empty(
        self, client, user_headers
    ):
        """空会话列表返回空数组。"""
        self.mock_repo.list_user_refresh_tokens = AsyncMock(
            return_value=[]
        )

        resp = await client.get(
            "/portal/profile/sessions",
            headers=user_headers,
        )

        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_sessions_no_auth(self, client):
        """未认证请求返回 403。"""
        resp = await client.get("/portal/profile/sessions")
        assert resp.status_code == 403


class TestRevokeSession:
    """撤销指定会话端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_repo(self):
        """模拟 auth_repo。"""
        with patch("app.user.router.auth_repo") as mock_repo:
            self.mock_repo = mock_repo
            yield

    async def test_revoke_session_success(
        self, client, user_headers
    ):
        """撤销会话成功返回 200。"""
        self.mock_repo.revoke_refresh_token_by_id = AsyncMock(
            return_value=True
        )

        resp = await client.post(
            "/portal/profile/sessions/revoke/token-123",
            headers=user_headers,
        )

        assert resp.status_code == 200
        assert resp.json()["message"] == "会话已撤销"
        self.mock_repo.revoke_refresh_token_by_id.assert_awaited_once()

    async def test_revoke_session_not_found(
        self, client, user_headers
    ):
        """会话不存在或已被撤销返回 404。"""
        self.mock_repo.revoke_refresh_token_by_id = AsyncMock(
            return_value=False
        )

        resp = await client.post(
            "/portal/profile/sessions/revoke/token-999",
            headers=user_headers,
        )

        assert resp.status_code == 404

    async def test_revoke_session_no_auth(self, client):
        """未认证请求返回 403。"""
        resp = await client.post(
            "/portal/profile/sessions/revoke/token-123"
        )
        assert resp.status_code == 403


class TestRevokeAllOtherSessions:
    """撤销所有其他会话端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_repo(self):
        """模拟 auth_repo。"""
        with patch("app.user.router.auth_repo") as mock_repo:
            self.mock_repo = mock_repo
            yield

    async def test_revoke_all_success(
        self, client, user_headers
    ):
        """撤销所有其他会话成功返回 200。"""
        self.mock_repo.revoke_other_refresh_tokens = AsyncMock()

        resp = await client.post(
            "/portal/profile/sessions/revoke-all",
            headers={
                **user_headers,
                "X-Refresh-Token-Hash": "keep-this-hash",
            },
        )

        assert resp.status_code == 200
        assert resp.json()["message"] == "已撤销所有其他会话"
        self.mock_repo.revoke_other_refresh_tokens.assert_awaited_once()

    async def test_revoke_all_no_auth(self, client):
        """未认证请求返回 403。"""
        resp = await client.post(
            "/portal/profile/sessions/revoke-all"
        )
        assert resp.status_code == 403
