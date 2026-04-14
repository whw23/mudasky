"""Portal 会话管理路由集成测试。

覆盖会话列表查询、撤销指定会话、撤销所有其他会话等端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.portal.profile.sessions.schemas import SessionResponse


def _make_session_response(**kwargs) -> SessionResponse:
    """创建模拟会话响应。"""
    return SessionResponse(
        id=kwargs.get("id", "token-001"),
        user_agent=kwargs.get("user_agent", "Mozilla/5.0"),
        ip_address=kwargs.get("ip_address", "192.168.1.1"),
        created_at=kwargs.get(
            "created_at", datetime.now(timezone.utc)
        ),
        is_current=kwargs.get("is_current", False),
    )


class TestListSessions:
    """查看所有活跃会话端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 SessionService。"""
        with patch(
            "api.portal.profile.sessions.router.SessionService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_sessions_success(
        self, client, user_headers
    ):
        """成功列出会话。"""
        self.mock_svc.list_sessions.return_value = [
            _make_session_response(
                id="token-1", is_current=True
            ),
            _make_session_response(
                id="token-2", is_current=False
            ),
        ]

        resp = await client.get(
            "/portal/profile/sessions/list",
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

    async def test_list_sessions_empty(
        self, client, user_headers
    ):
        """空会话列表返回空数组。"""
        self.mock_svc.list_sessions.return_value = []

        resp = await client.get(
            "/portal/profile/sessions/list",
            headers=user_headers,
        )

        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_sessions_no_auth(self, client):
        """未认证请求返回 403。"""
        resp = await client.get(
            "/portal/profile/sessions/list"
        )
        assert resp.status_code == 403


class TestRevokeSession:
    """撤销指定会话端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 SessionService。"""
        with patch(
            "api.portal.profile.sessions.router.SessionService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_revoke_session_success(
        self, client, user_headers
    ):
        """撤销会话成功返回 200。"""
        self.mock_svc.revoke_session.return_value = None

        resp = await client.post(
            "/portal/profile/sessions/list/revoke",
            json={"token_id": "token-123"},
            headers=user_headers,
        )

        assert resp.status_code == 200
        assert resp.json()["message"] == "会话已撤销"

    async def test_revoke_session_not_found(
        self, client, user_headers
    ):
        """会话不存在返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.revoke_session.side_effect = (
            NotFoundException(message="会话不存在或已被撤销")
        )

        resp = await client.post(
            "/portal/profile/sessions/list/revoke",
            json={"token_id": "token-999"},
            headers=user_headers,
        )

        assert resp.status_code == 404

    async def test_revoke_session_no_auth(self, client):
        """未认证请求返回 403。"""
        resp = await client.post(
            "/portal/profile/sessions/list/revoke",
            json={"token_id": "token-123"},
        )
        assert resp.status_code == 403


class TestRevokeAllOtherSessions:
    """撤销所有其他会话端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 SessionService。"""
        with patch(
            "api.portal.profile.sessions.router.SessionService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_revoke_all_success(
        self, client, user_headers
    ):
        """撤销所有其他会话成功返回 200。"""
        self.mock_svc.revoke_all_sessions.return_value = None

        resp = await client.post(
            "/portal/profile/sessions/list/revoke-all",
            headers={
                **user_headers,
                "X-Refresh-Token-Hash": "keep-this-hash",
            },
        )

        assert resp.status_code == 200
        assert resp.json()["message"] == "已撤销所有其他会话"

    async def test_revoke_all_no_auth(self, client):
        """未认证请求返回 403。"""
        resp = await client.post(
            "/portal/profile/sessions/list/revoke-all"
        )
        assert resp.status_code == 403
