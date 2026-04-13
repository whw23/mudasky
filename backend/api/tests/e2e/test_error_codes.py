"""API 错误码 E2E 测试。验证通过网关的错误响应包含具体错误码。"""

import random

import pytest

from tests.e2e.conftest import encrypt_password

pytestmark = pytest.mark.e2e


class TestErrorCodes:
    """验证 API 错误响应返回具体错误码而非通用码。"""

    async def test_register_duplicate_phone(self, e2e_client):
        """注册已存在的手机号返回 PHONE_ALREADY_REGISTERED。"""
        phone = f"+86139{random.randint(10000000, 99999999)}"

        # 1. 发送验证码
        sms_resp = await e2e_client.post(
            "/api/auth/sms-code",
            json={"phone": phone},
        )
        assert sms_resp.status_code == 200
        code = sms_resp.json()["code"]

        # 2. 首次注册成功
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

        # 3. 再次发送验证码给同一个手机号
        sms_resp2 = await e2e_client.post(
            "/api/auth/sms-code",
            json={"phone": phone},
        )
        assert sms_resp2.status_code == 200
        code2 = sms_resp2.json()["code"]

        # 4. 尝试再次注册同一手机号 → 应返回 PHONE_ALREADY_REGISTERED
        encrypted2 = await encrypt_password(e2e_client, "testpass456")
        dup_resp = await e2e_client.post(
            "/api/auth/register",
            json={
                "phone": phone,
                "code": code2,
                "username": f"e2e_user_{phone[-6:]}_2",
                **encrypted2,
            },
        )
        assert dup_resp.status_code == 409
        error_data = dup_resp.json()
        assert error_data["code"] == "PHONE_ALREADY_REGISTERED"
        assert "手机号已注册" in error_data["message"]

    async def test_login_wrong_password(self, e2e_client):
        """错误密码登录返回 PASSWORD_INCORRECT。"""
        phone = f"+86139{random.randint(10000000, 99999999)}"

        # 1. 先注册一个用户
        sms_resp = await e2e_client.post(
            "/api/auth/sms-code",
            json={"phone": phone},
        )
        code = sms_resp.json()["code"]

        encrypted = await encrypt_password(e2e_client, "correctpass123")
        username = f"e2e_user_{phone[-6:]}"
        reg_resp = await e2e_client.post(
            "/api/auth/register",
            json={
                "phone": phone,
                "code": code,
                "username": username,
                **encrypted,
            },
        )
        assert reg_resp.status_code == 200

        # 2. 用错误密码登录 → 应返回 PASSWORD_INCORRECT
        encrypted_wrong = await encrypt_password(e2e_client, "wrongpassword")
        login_resp = await e2e_client.post(
            "/api/auth/login",
            json={
                "username": username,
                **encrypted_wrong,
            },
        )
        assert login_resp.status_code == 401
        error_data = login_resp.json()
        assert error_data["code"] == "PASSWORD_INCORRECT"
        assert "密码不正确" in error_data["message"]

    async def test_login_nonexistent_user(self, e2e_client):
        """不存在的用户登录返回 USER_NOT_FOUND。"""
        encrypted = await encrypt_password(e2e_client, "whatever")
        login_resp = await e2e_client.post(
            "/api/auth/login",
            json={
                "username": f"nonexistent_user_{random.randint(100000, 999999)}",
                **encrypted,
            },
        )
        assert login_resp.status_code == 404
        error_data = login_resp.json()
        assert error_data["code"] == "USER_NOT_FOUND"
        assert "用户不存在" in error_data["message"]

    async def test_sms_code_incorrect(self, e2e_client):
        """错误的短信验证码返回 SMS_CODE_INCORRECT。"""
        phone = f"+86139{random.randint(10000000, 99999999)}"

        # 1. 发送验证码
        sms_resp = await e2e_client.post(
            "/api/auth/sms-code",
            json={"phone": phone},
        )
        assert sms_resp.status_code == 200

        # 2. 用错误的验证码注册 → 应返回 SMS_CODE_INCORRECT
        encrypted = await encrypt_password(e2e_client, "testpass123")
        reg_resp = await e2e_client.post(
            "/api/auth/register",
            json={
                "phone": phone,
                "code": "000000",  # 错误的验证码
                "username": f"e2e_user_{phone[-6:]}",
                **encrypted,
            },
        )
        assert reg_resp.status_code == 401
        error_data = reg_resp.json()
        assert error_data["code"] == "SMS_CODE_INCORRECT"
        assert "验证码不正确" in error_data["message"]

    async def test_username_already_used(self, e2e_client):
        """用户名已被使用返回 USERNAME_ALREADY_USED。"""
        username = f"e2e_user_{random.randint(100000, 999999)}"

        # 1. 注册第一个用户
        phone1 = f"+86139{random.randint(10000000, 99999999)}"
        sms_resp1 = await e2e_client.post(
            "/api/auth/sms-code",
            json={"phone": phone1},
        )
        code1 = sms_resp1.json()["code"]

        encrypted1 = await encrypt_password(e2e_client, "testpass123")
        reg_resp1 = await e2e_client.post(
            "/api/auth/register",
            json={
                "phone": phone1,
                "code": code1,
                "username": username,
                **encrypted1,
            },
        )
        assert reg_resp1.status_code == 200

        # 2. 用不同手机号但相同用户名注册第二个用户 → 应返回 USERNAME_ALREADY_USED
        phone2 = f"+86139{random.randint(10000000, 99999999)}"
        sms_resp2 = await e2e_client.post(
            "/api/auth/sms-code",
            json={"phone": phone2},
        )
        code2 = sms_resp2.json()["code"]

        encrypted2 = await encrypt_password(e2e_client, "testpass456")
        reg_resp2 = await e2e_client.post(
            "/api/auth/register",
            json={
                "phone": phone2,
                "code": code2,
                "username": username,  # 重复的用户名
                **encrypted2,
            },
        )
        assert reg_resp2.status_code == 409
        error_data = reg_resp2.json()
        assert error_data["code"] == "USERNAME_ALREADY_USED"
        assert "用户名已被使用" in error_data["message"]
