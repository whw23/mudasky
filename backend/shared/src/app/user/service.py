"""用户领域业务逻辑层。

处理用户资料更新、密码修改、双因素认证等业务。
"""

import pyotp
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import repository as auth_repo
from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    UnauthorizedException,
)
from app.core.security import hash_password, verify_password
from app.rbac import repository as rbac_repo
from app.user import repository
from app.user.models import User
from app.user.schemas import PasswordChange, PhoneChange, UserResponse, UserUpdate


class UserService:
    """用户业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def get_user(self, user_id: str) -> User:
        """获取用户 ORM 对象，不存在则抛出异常。"""
        user = await repository.get_by_id(self.session, user_id)
        if not user:
            raise NotFoundException(message="用户不存在")
        return user

    async def get_user_response(self, user_id: str) -> UserResponse:
        """获取用户信息响应，包含权限和权限组。"""
        user = await self.get_user(user_id)
        permissions = await rbac_repo.get_user_permissions(
            self.session, user_id
        )
        group_ids = await rbac_repo.get_user_group_ids(
            self.session, user_id
        )
        return UserResponse(
            id=user.id,
            phone=user.phone,
            username=user.username,
            user_type=user.user_type,
            is_superuser=user.is_superuser,
            is_active=user.is_active,
            two_factor_enabled=user.two_factor_enabled,
            storage_quota=user.storage_quota,
            permissions=permissions,
            group_ids=group_ids,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    async def update_profile(
        self, user_id: str, data: UserUpdate
    ) -> User:
        """更新用户个人信息。

        如果修改用户名，检查唯一性。
        """
        user = await self.get_user(user_id)
        if data.username is not None:
            existing = await repository.get_by_username(
                self.session, data.username
            )
            if existing and existing.id != user_id:
                raise ConflictException(message="用户名已被使用")
            user.username = data.username
        return await repository.update(self.session, user)

    async def change_password(
        self, user_id: str, data: PasswordChange
    ) -> None:
        """修改用户密码。

        通过短信验证码验证身份后设置新密码。
        """
        user = await self.get_user(user_id)
        if user.phone != data.phone:
            raise ConflictException(message="手机号与当前账号不匹配")
        sms_code = await auth_repo.get_latest_sms_code(
            self.session, data.phone
        )
        if not sms_code:
            raise UnauthorizedException(message="验证码无效或已过期")
        sms_code.attempts += 1
        if sms_code.code != data.code:
            await self.session.commit()
            raise UnauthorizedException(message="验证码不正确")
        sms_code.is_used = True
        user.password_hash = hash_password(data.new_password)
        await repository.update(self.session, user)

    async def change_phone(
        self, user_id: str, data: PhoneChange
    ) -> User:
        """修改用户手机号。

        检查新手机号唯一性。验证码校验由上层处理。
        """
        user = await self.get_user(user_id)
        existing = await repository.get_by_phone(
            self.session, data.new_phone
        )
        if existing and existing.id != user_id:
            raise ConflictException(message="手机号已被使用")
        user.phone = data.new_phone
        return await repository.update(self.session, user)

    async def enable_2fa(self, user_id: str) -> str:
        """启用双因素认证，生成 TOTP 密钥。

        返回 TOTP 密钥字符串，供生成二维码使用。
        """
        user = await self.get_user(user_id)
        secret = pyotp.random_base32()
        user.totp_secret = secret
        await repository.update(self.session, user)
        return secret

    async def confirm_2fa(
        self, user_id: str, totp_code: str
    ) -> None:
        """确认启用双因素认证。

        验证 TOTP 代码正确后，设置 two_factor_enabled 为 True。
        """
        user = await self.get_user(user_id)
        if not user.totp_secret:
            raise ConflictException(message="请先启用双因素认证")
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(totp_code):
            raise ConflictException(message="验证码不正确")
        user.two_factor_enabled = True
        await repository.update(self.session, user)

    async def disable_2fa(
        self, user_id: str, password: str
    ) -> None:
        """关闭双因素认证。

        需验证用户密码。
        """
        user = await self.get_user(user_id)
        if not user.password_hash:
            raise ConflictException(message="用户未设置密码")
        if not verify_password(password, user.password_hash):
            raise ConflictException(message="密码不正确")
        user.two_factor_enabled = False
        user.totp_secret = None
        await repository.update(self.session, user)

    async def list_users(
        self, offset: int, limit: int
    ) -> tuple[list[User], int]:
        """分页查询用户列表。"""
        return await repository.list_users(
            self.session, offset, limit
        )
