"""管理员用户管理业务逻辑层。

提供用户管理、密码重置、权限分配、强制下线等管理员专用操作。
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.db.auth import repository as auth_repo
from app.db.document import repository as doc_repo
from app.db.rbac import repository as rbac_repo
from app.db.user import repository as user_repo
from app.db.user.models import User
from app.utils.crypto import decrypt_password
from app.utils.security import hash_password

from .schemas import UserAdminUpdate, UserResponse

logger = logging.getLogger(__name__)


class AdminService:
    """管理员业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def _build_user_response(
        self, user: User
    ) -> UserResponse:
        """构建包含权限和角色的用户响应。"""
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

    async def list_users(
        self,
        search: str | None,
        offset: int,
        limit: int,
    ) -> tuple[list[UserResponse], int]:
        """分页查询用户列表，支持按关键词筛选。"""
        users, total = await user_repo.list_users(
            self.session, offset, limit, search
        )
        user_responses = [
            await self._build_user_response(u) for u in users
        ]
        return user_responses, total

    async def get_user(self, user_id: str) -> UserResponse:
        """获取用户详情，包含权限和角色信息。"""
        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在", code="USER_NOT_FOUND")
        return await self._build_user_response(user)

    async def update_user(
        self, user_id: str, data: UserAdminUpdate
    ) -> UserResponse:
        """管理员更新用户信息（激活状态、存储配额）。"""
        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在", code="USER_NOT_FOUND")

        if data.is_active is not None:
            user.is_active = data.is_active
        if data.storage_quota is not None:
            user.storage_quota = data.storage_quota

        await user_repo.update(self.session, user)
        return await self._build_user_response(user)

    async def reset_password(
        self,
        user_id: str,
        encrypted_password: str,
        nonce: str,
    ) -> None:
        """重置用户密码。"""
        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在", code="USER_NOT_FOUND")

        password = decrypt_password(encrypted_password, nonce)
        user.password_hash = hash_password(password)
        await user_repo.update(self.session, user)

    async def assign_role(
        self,
        user_id: str,
        role_id: str | None,
    ) -> UserResponse:
        """分配用户角色（单个），直接调用 repository 做约束检查。"""
        if role_id:
            role = await rbac_repo.get_role_by_id(
                self.session, role_id
            )
            if not role:
                raise NotFoundException(
                    message="角色不存在", code="ROLE_NOT_FOUND"
                )

        await user_repo.set_role_id(
            self.session, user_id, role_id
        )

        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在", code="USER_NOT_FOUND")
        return await self._build_user_response(user)

    async def force_logout(self, user_id: str) -> None:
        """强制下线用户，撤销所有刷新令牌。"""
        await auth_repo.revoke_user_refresh_tokens(
            self.session, user_id
        )

    async def delete_user(self, user_id: str) -> None:
        """管理员删除用户及其所有关联数据。

        清理顺序：RefreshToken → SmsCode → Document → User。
        磁盘文件在事务提交后删除。
        """
        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在", code="USER_NOT_FOUND")

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
        await user_repo.delete(self.session, user)
        await self.session.commit()

    async def get_user_model(
        self, user_id: str
    ) -> User:
        """获取用户 ORM 对象，不存在则抛出异常。"""
        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在", code="USER_NOT_FOUND")
        return user
