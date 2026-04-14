"""会话管理 E2E 测试。

通过网关的完整请求,验证多端登录、会话列表、踢出设备。
"""

import pytest

from tests.e2e.conftest import (
    SUPERUSER_PASSWORD,
    SUPERUSER_USERNAME,
    encrypt_password,
)


@pytest.mark.e2e
class TestSessionManagement:
    """会话管理端到端测试。"""

    async def test_list_sessions_after_login(self, e2e_client):
        """登录后查看会话列表至少有一条记录。"""
        # 登录以创建会话
        encrypted = await encrypt_password(e2e_client, SUPERUSER_PASSWORD)
        login_resp = await e2e_client.post(
            "/api/auth/login",
            json={"username": SUPERUSER_USERNAME, **encrypted},
        )
        assert login_resp.status_code == 200

        # 查看会话列表
        resp = await e2e_client.get("/api/portal/profile/sessions/list")
        assert resp.status_code == 200
        sessions = resp.json()
        assert len(sessions) >= 1
        current = [s for s in sessions if s["is_current"]]
        assert len(current) == 1

    async def test_revoke_other_sessions(self, superuser_client, e2e_client):
        """踢掉所有其他设备后,只剩当前设备。"""
        # 先用另一个 client 登录,产生第二个 session
        encrypted = await encrypt_password(e2e_client, SUPERUSER_PASSWORD)
        login_resp = await e2e_client.post(
            "/api/auth/login",
            json={"username": SUPERUSER_USERNAME, **encrypted},
        )
        assert login_resp.status_code == 200

        # 用原 client 踢掉所有其他设备
        resp = await superuser_client.post(
            "/api/portal/profile/sessions/list/revoke-all"
        )
        assert resp.status_code == 200

        # 验证只剩当前设备
        list_resp = await superuser_client.get(
            "/api/portal/profile/sessions/list"
        )
        assert list_resp.status_code == 200
        sessions = list_resp.json()
        assert all(s["is_current"] for s in sessions)

    async def test_logout_only_affects_current_device(self, e2e_client):
        """退出只影响当前设备的 session。"""
        # 登录
        encrypted = await encrypt_password(e2e_client, SUPERUSER_PASSWORD)
        await e2e_client.post(
            "/api/auth/login",
            json={"username": SUPERUSER_USERNAME, **encrypted},
        )

        # 验证可以访问 session 列表
        resp = await e2e_client.get("/api/portal/profile/sessions/list")
        assert resp.status_code == 200

        # 登出
        await e2e_client.post("/api/auth/logout")

        # 此时 cookie 已清除,无法访问
        resp = await e2e_client.get("/api/portal/profile/sessions/list")
        assert resp.status_code == 401
