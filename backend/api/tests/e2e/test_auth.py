"""认证模块 E2E 测试。"""

import httpx
import pytest

from tests.e2e.conftest import (
    SUPERUSER_PASSWORD,
    SUPERUSER_USERNAME,
    encrypt_password,
)


@pytest.mark.e2e
class TestPublicKey:
    """公钥端点测试。"""

    async def test_get_public_key(self, anon_client):
        """获取公钥和 nonce。"""
        resp = await anon_client.get("/api/auth/public-key")
        assert resp.status_code == 200
        data = resp.json()
        assert "public_key" in data
        assert "nonce" in data
        assert data["public_key"].startswith("-----BEGIN PUBLIC KEY-----")


@pytest.mark.e2e
class TestSmsCode:
    """短信验证码测试。"""

    async def test_send_sms_code(self, e2e_client):
        """发送验证码成功（DEBUG 模式返回 code）。"""
        resp = await e2e_client.post(
            "/api/auth/sms-code",
            json={"phone": "+8613800000001"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "code" in data  # DEBUG 模式返回验证码

    async def test_send_sms_code_invalid_phone(self, e2e_client):
        """无效手机号返回 422。"""
        resp = await e2e_client.post(
            "/api/auth/sms-code",
            json={"phone": "invalid"},
        )
        assert resp.status_code == 422


@pytest.mark.e2e
class TestRegister:
    """注册测试。"""

    async def test_register_and_login(self, e2e_client, superuser_client):
        """注册新用户 -> 登录 -> 验证 -> 清理。"""
        import random
        phone = f"+86139{random.randint(10000000, 99999999)}"

        # 1. 发送验证码
        sms_resp = await e2e_client.post(
            "/api/auth/sms-code",
            json={"phone": phone},
        )
        assert sms_resp.status_code == 200
        code = sms_resp.json()["code"]

        # 2. 注册（带加密密码）
        encrypted = await encrypt_password(e2e_client, "testpass123")
        reg_resp = await e2e_client.post(
            "/api/auth/register",
            json={
                "phone": phone,
                "code": code,
                "username": f"e2e_user_{phone[-6:]}",
                **encrypted,
            },
        )
        assert reg_resp.status_code == 200
        user_data = reg_resp.json()
        assert user_data["user"]["username"] == f"e2e_user_{phone[-6:]}"
        user_id = user_data["user"]["id"]

        # 3. 注册后 cookie 已设置，可以访问 /portal/profile/view
        me_resp = await e2e_client.get(
            "/api/portal/profile/view"
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["username"] == f"e2e_user_{phone[-6:]}"

        # 4. 用新用户密码登录（新 client）
        async with httpx.AsyncClient(
            base_url="http://localhost",
            headers={"X-Requested-With": "XMLHttpRequest"},
        ) as login_client:
            encrypted2 = await encrypt_password(
                login_client, "testpass123"
            )
            login_resp = await login_client.post(
                "/api/auth/login",
                json={
                    "username": f"e2e_user_{phone[-6:]}",
                    **encrypted2,
                },
            )
            assert login_resp.status_code == 200

        # 5. 清理：管理员强制下线测试用户
        await superuser_client.post(
            f"/api/admin/user/force-logout/{user_id}"
        )


@pytest.mark.e2e
class TestLogin:
    """登录测试。"""

    async def test_superuser_login(self, e2e_client):
        """超级管理员账号密码登录。"""
        encrypted = await encrypt_password(e2e_client, SUPERUSER_PASSWORD)
        resp = await e2e_client.post(
            "/api/auth/login",
            json={
                "username": SUPERUSER_USERNAME,
                **encrypted,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["username"] == SUPERUSER_USERNAME

    async def test_login_wrong_password(self, e2e_client):
        """错误密码返回 401。"""
        encrypted = await encrypt_password(e2e_client, "wrongpassword")
        resp = await e2e_client.post(
            "/api/auth/login",
            json={
                "username": SUPERUSER_USERNAME,
                **encrypted,
            },
        )
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, e2e_client):
        """不存在的用户返回 404。"""
        encrypted = await encrypt_password(e2e_client, "whatever")
        resp = await e2e_client.post(
            "/api/auth/login",
            json={
                "username": "nonexistent_user_xyz",
                **encrypted,
            },
        )
        assert resp.status_code == 404


@pytest.mark.e2e
class TestCsrf:
    """CSRF 防护测试。"""

    async def test_mutation_without_csrf_rejected(self, anon_client):
        """不带 X-Requested-With 的 mutation 请求被拒绝。"""
        resp = await anon_client.post(
            "/api/portal/profile/2fa-enable-totp"
        )
        assert resp.status_code == 403


@pytest.mark.e2e
class TestUnauthenticated:
    """未认证访问测试。"""

    async def test_protected_endpoint_returns_401(self, e2e_client):
        """未登录访问受保护端点返回 401。"""
        resp = await e2e_client.get(
            "/api/portal/profile/view"
        )
        assert resp.status_code == 401
