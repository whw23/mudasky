"""Portal 用户资料业务逻辑层。

处理用户资料查看、更新、密码修改、手机号修改、账号注销等业务。
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.db.auth import repository as auth_repo
from app.db.document import repository as doc_repo
from app.db.rbac import repository as rbac_repo
from app.db.user import repository
from app.db.user.models import User
from app.utils.crypto import decrypt_password
from app.utils.security import hash_password

from .schemas import (
    PasswordChange,
    PhoneChange,
    UserResponse,
    UserUpdate,
)

logger = logging.getLogger(__name__)


class ProfileService:
    """用户资料业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def get_user(self, user_id: str) -> User:
        """获取用户 ORM 对象，不存在则抛出异常。"""
        user = await repository.get_by_id(self.session, user_id)
        if not user:
            raise NotFoundException(
                message="用户不存在", code="USER_NOT_FOUND"
            )
        return user

    async def get_user_response(self, user_id: str) -> UserResponse:
        """获取用户信息响应，包含权限和角色。"""
        user = await self.get_user(user_id)
        permissions = (
            await rbac_repo.get_permissions_by_role(
                self.session, user.role_id
            )
            if user.role_id
            else []
        )
        role = (
            await rbac_repo.get_role_by_id(
                self.session, user.role_id
            )
            if user.role_id
            else None
        )
        role_name = role.name if role else None
        return UserResponse(
            id=user.id,
            phone=user.phone,
            username=user.username,
            is_active=user.is_active,
            two_factor_enabled=user.two_factor_enabled,
            storage_quota=user.storage_quota,
            permissions=permissions,
            role_id=user.role_id,
            role_name=role_name,
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
                raise ConflictException(
                    message="用户名已被使用",
                    code="USERNAME_ALREADY_USED",
                )
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
            raise ConflictException(
                message="手机号与当前账号不匹配",
                code="PHONE_MISMATCH",
            )
        await auth_repo.verify_sms_code(
            self.session, data.phone, data.code
        )
        password = decrypt_password(
            data.encrypted_password, data.nonce
        )
        user.password_hash = hash_password(password)
        await repository.update(self.session, user)

    async def change_phone(
        self, user_id: str, data: PhoneChange
    ) -> User:
        """修改用户手机号。

        通过短信验证码验证新手机号后修改。
        """
        user = await self.get_user(user_id)
        existing = await repository.get_by_phone(
            self.session, data.new_phone
        )
        if existing and existing.id != user_id:
            raise ConflictException(
                message="手机号已被使用",
                code="PHONE_ALREADY_USED",
            )
        await auth_repo.verify_sms_code(
            self.session, data.new_phone, data.code
        )
        user.phone = data.new_phone
        return await repository.update(self.session, user)

    async def delete_user(self, user_id: str) -> None:
        """删除用户及其所有关联数据。

        清理顺序：RefreshToken -> SmsCode -> Document -> User。
        磁盘文件在事务提交后删除。
        """
        user = await self.get_user(user_id)

        # superuser 不可删除
        if user.role_id:
            role = await rbac_repo.get_role_by_id(
                self.session, user.role_id
            )
            if role and role.name == "superuser":
                raise ForbiddenException(
                    message="超级管理员不可删除",
                    code="SUPERUSER_CANNOT_BE_DELETED",
                )

        # 事务内按依赖顺序删除数据库记录
        await auth_repo.delete_refresh_tokens_by_user(
            self.session, user_id
        )
        if user.phone:
            await auth_repo.delete_sms_codes_by_phone(
                self.session, user.phone
            )
        await doc_repo.delete_by_user(self.session, user_id)
        await repository.delete(self.session, user)
        await self.session.commit()
