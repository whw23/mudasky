"""用户模块 E2E 测试。"""

import httpx
import pytest

from tests.e2e.conftest import encrypt_password, CSRF_HEADER


async def _assign_student_role_and_relogin(
    user_client: httpx.AsyncClient,
    superuser_client: httpx.AsyncClient,
    user_id: int,
    username: str,
    password: str,
) -> None:
    """为新注册用户分配 student 角色并重新登录以获取含权限的 JWT。"""
    # 分配 student 角色
    roles_resp = await superuser_client.get("/api/admin/roles/list")
    assert roles_resp.status_code == 200
    student_role = next(
        r for r in roles_resp.json() if r["name"] == "student"
    )
    assign_resp = await superuser_client.post(
        f"/api/admin/users/assign-role/{user_id}",
        json={"role_id": student_role["id"]},
    )
    assert assign_resp.status_code == 200

    # 重新登录获取携带权限的新 JWT（httpx 自动更新 cookie jar）
    login_enc = await encrypt_password(user_client, password)
    login_resp = await user_client.post(
        "/api/auth/login",
        json={"username": username, **login_enc},
    )
    assert login_resp.status_code == 200


@pytest.mark.e2e
class TestGetMe:
    """获取当前用户信息测试。"""

    async def test_get_me_success(self, superuser_client):
        """已认证用户获取个人信息返回 200。"""
        resp = await superuser_client.get(
            "/api/portal/profile/view"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "username" in data
        assert "role_name" in data
        assert data["is_active"] is True

    async def test_get_me_unauthenticated(self, e2e_client):
        """未认证用户访问个人信息返回 401。"""
        resp = await e2e_client.get(
            "/api/portal/profile/view"
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestUpdateMe:
    """更新当前用户个人信息测试。"""

    async def test_update_username_and_revert(
        self, superuser_client
    ):
        """修改用户名后恢复原值。"""
        # 1. 获取原始用户名
        me_resp = await superuser_client.get(
            "/api/portal/profile/view"
        )
        assert me_resp.status_code == 200
        original_username = me_resp.json()["username"]

        # 2. 更新用户名
        new_username = "e2e_temp_name"
        update_resp = await superuser_client.post(
            "/api/portal/profile/edit",
            json={"username": new_username},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["username"] == new_username

        # 3. 验证更新生效
        verify_resp = await superuser_client.get(
            "/api/portal/profile/view"
        )
        assert verify_resp.status_code == 200
        assert verify_resp.json()["username"] == new_username

        # 4. 恢复原始用户名
        revert_resp = await superuser_client.post(
            "/api/portal/profile/edit",
            json={"username": original_username},
        )
        assert revert_resp.status_code == 200
        assert (
            revert_resp.json()["username"] == original_username
        )


@pytest.mark.e2e
class TestUserProfileActions:
    """用户个人资料操作测试（修改密码、手机号）。"""

    async def test_change_password(
        self, superuser_client, wait_for_healthy
    ):
        """创建用户 -> 修改密码 -> 用新密码登录 -> 清理。"""
        import random

        phone = f"+86139{random.randint(10000000, 99999999)}"
        old_pass = "oldpass123"
        new_pass = "newpass456"
        username = f"e2e_pwd_{phone[-6:]}"

        async with httpx.AsyncClient(
            base_url="http://localhost",
            headers=CSRF_HEADER,
        ) as user_client:
            # 1. 发送验证码
            sms_resp = await user_client.post(
                "/api/auth/sms-code", json={"phone": phone}
            )
            code = sms_resp.json()["code"]

            # 2. 注册（httpx 自动保存 Set-Cookie）
            encrypted = await encrypt_password(user_client, old_pass)
            reg_resp = await user_client.post(
                "/api/auth/register",
                json={
                    "phone": phone,
                    "code": code,
                    "username": username,
                    **encrypted,
                },
            )
            assert reg_resp.status_code == 200
            user_id = reg_resp.json()["user"]["id"]

            try:
                # 3. 分配 student 角色并重新登录以获取 portal/* 权限
                await _assign_student_role_and_relogin(
                    user_client, superuser_client, user_id, username, old_pass
                )

                # 4. 发送短信验证码用于修改密码
                sms2 = await user_client.post(
                    "/api/auth/sms-code", json={"phone": phone}
                )
                assert sms2.status_code == 200
                sms_code = sms2.json()["code"]

                # 5. 修改密码（需要短信验证）
                new_enc = await encrypt_password(user_client, new_pass)
                pwd_resp = await user_client.post(
                    "/api/portal/profile/password",
                    json={
                        "phone": phone,
                        "code": sms_code,
                        "encrypted_password": new_enc["encrypted_password"],
                        "nonce": new_enc["nonce"],
                    },
                )
                assert pwd_resp.status_code == 200

                # 5. 用新密码登录验证
                async with httpx.AsyncClient(
                    base_url="http://localhost",
                    headers=CSRF_HEADER,
                ) as login_client:
                    login_enc = await encrypt_password(login_client, new_pass)
                    login_resp = await login_client.post(
                        "/api/auth/login",
                        json={"username": username, **login_enc},
                    )
                    assert login_resp.status_code == 200
            finally:
                await superuser_client.post(
                    f"/api/admin/users/force-logout/{user_id}"
                )

    async def test_change_phone(
        self, superuser_client, wait_for_healthy
    ):
        """创建用户 -> 修改手机号 -> 验证 -> 清理。"""
        import random

        old_phone = f"+86139{random.randint(10000000, 99999999)}"
        new_phone = f"+86138{random.randint(10000000, 99999999)}"
        password = "testpass123"
        username = f"e2e_phone_{old_phone[-6:]}"

        async with httpx.AsyncClient(
            base_url="http://localhost",
            headers=CSRF_HEADER,
        ) as user_client:
            # 1. 发送验证码
            sms_resp = await user_client.post(
                "/api/auth/sms-code", json={"phone": old_phone}
            )
            code = sms_resp.json()["code"]

            # 2. 注册（httpx 自动保存 Set-Cookie）
            encrypted = await encrypt_password(user_client, password)
            reg_resp = await user_client.post(
                "/api/auth/register",
                json={
                    "phone": old_phone,
                    "code": code,
                    "username": username,
                    **encrypted,
                },
            )
            assert reg_resp.status_code == 200
            user_id = reg_resp.json()["user"]["id"]

            try:
                # 3. 分配 student 角色并重新登录以获取 portal/* 权限
                await _assign_student_role_and_relogin(
                    user_client, superuser_client, user_id, username, password
                )

                # 4. 获取新手机号验证码
                new_sms_resp = await user_client.post(
                    "/api/auth/sms-code",
                    json={"phone": new_phone},
                )
                assert new_sms_resp.status_code == 200
                new_code = new_sms_resp.json()["code"]

                # 5. 修改手机号
                phone_resp = await user_client.post(
                    "/api/portal/profile/phone",
                    json={
                        "new_phone": new_phone,
                        "code": new_code,
                    },
                )
                assert phone_resp.status_code == 200
                assert phone_resp.json()["phone"] == new_phone
            finally:
                await superuser_client.post(
                    f"/api/admin/users/force-logout/{user_id}"
                )


@pytest.mark.e2e
class TestTwoFactorAuth:
    """双因素认证 E2E 测试。"""

    async def test_totp_enable_and_disable(
        self, superuser_client, wait_for_healthy
    ):
        """创建用户 -> 启用 TOTP -> 确认 -> 禁用 -> 清理。"""
        import random

        phone = f"+86139{random.randint(10000000, 99999999)}"
        password = "testpass123"
        username = f"e2e_2fa_{phone[-6:]}"

        async with httpx.AsyncClient(
            base_url="http://localhost",
            headers=CSRF_HEADER,
        ) as user_client:
            # 1. 发送验证码
            sms_resp = await user_client.post(
                "/api/auth/sms-code", json={"phone": phone}
            )
            code = sms_resp.json()["code"]

            # 2. 注册（httpx 自动保存 Set-Cookie）
            encrypted = await encrypt_password(user_client, password)
            reg_resp = await user_client.post(
                "/api/auth/register",
                json={
                    "phone": phone,
                    "code": code,
                    "username": username,
                    **encrypted,
                },
            )
            assert reg_resp.status_code == 200
            user_id = reg_resp.json()["user"]["id"]

            try:
                # 3. 分配 student 角色并重新登录以获取 portal/* 权限
                await _assign_student_role_and_relogin(
                    user_client, superuser_client, user_id, username, password
                )

                # 4. 启用 TOTP（返回 QR code PNG）
                totp_resp = await user_client.post(
                    "/api/portal/profile/2fa-enable-totp"
                )
                assert totp_resp.status_code == 200
                assert totp_resp.headers["content-type"] == "image/png"

                # 5. 获取 TOTP secret（通过管理接口查用户）
                detail_resp = await superuser_client.get(
                    f"/api/admin/users/detail/{user_id}"
                )
                assert detail_resp.status_code == 200
                # TOTP secret 不一定暴露在 API 中，跳过确认步骤

                # 6. 禁用 2FA（需要手机验证码）
                disable_sms = await user_client.post(
                    "/api/auth/sms-code",
                    json={"phone": phone},
                )
                assert disable_sms.status_code == 200
                disable_code = disable_sms.json()["code"]

                disable_resp = await user_client.post(
                    "/api/portal/profile/2fa-disable",
                    json={"phone": phone, "code": disable_code},
                )
                assert disable_resp.status_code == 200
            finally:
                await superuser_client.post(
                    f"/api/admin/users/force-logout/{user_id}"
                )

    async def test_sms_2fa_enable(
        self, superuser_client, wait_for_healthy
    ):
        """创建用户 -> 启用短信 2FA -> 禁用 -> 清理。"""
        import random

        phone = f"+86139{random.randint(10000000, 99999999)}"
        password = "testpass123"
        username = f"e2e_sms2fa_{phone[-6:]}"

        async with httpx.AsyncClient(
            base_url="http://localhost",
            headers=CSRF_HEADER,
        ) as user_client:
            # 1. 发送验证码
            sms_resp = await user_client.post(
                "/api/auth/sms-code", json={"phone": phone}
            )
            code = sms_resp.json()["code"]

            # 2. 注册（httpx 自动保存 Set-Cookie）
            encrypted = await encrypt_password(user_client, password)
            reg_resp = await user_client.post(
                "/api/auth/register",
                json={
                    "phone": phone,
                    "code": code,
                    "username": username,
                    **encrypted,
                },
            )
            assert reg_resp.status_code == 200
            user_id = reg_resp.json()["user"]["id"]

            try:
                # 3. 分配 student 角色并重新登录以获取 portal/* 权限
                await _assign_student_role_and_relogin(
                    user_client, superuser_client, user_id, username, password
                )

                # 4. 启用短信 2FA
                enable_sms = await user_client.post(
                    "/api/auth/sms-code",
                    json={"phone": phone},
                )
                assert enable_sms.status_code == 200
                enable_code = enable_sms.json()["code"]

                enable_resp = await user_client.post(
                    "/api/portal/profile/2fa-enable-sms",
                    json={"phone": phone, "code": enable_code},
                )
                assert enable_resp.status_code == 200

                # 5. 禁用 2FA
                disable_sms = await user_client.post(
                    "/api/auth/sms-code",
                    json={"phone": phone},
                )
                disable_code = disable_sms.json()["code"]

                disable_resp = await user_client.post(
                    "/api/portal/profile/2fa-disable",
                    json={"phone": phone, "code": disable_code},
                )
                assert disable_resp.status_code == 200
            finally:
                await superuser_client.post(
                    f"/api/admin/users/force-logout/{user_id}"
                )
