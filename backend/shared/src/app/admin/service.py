"""管理员领域业务逻辑层。

提供用户管理、密码重置、权限分配、强制下线等管理员专用操作。
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import repository as auth_repo
from app.core.crypto import decrypt_password
from app.core.exceptions import NotFoundException
from app.core.security import hash_password
from app.rbac import repository as rbac_repo
from app.rbac.service import RbacService
from app.user import repository as user_repo
from app.user.models import User
from app.user.schemas import UserAdminUpdate, UserResponse


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
        """分配用户角色（单个），委托 RbacService 做约束检查。"""
        rbac_svc = RbacService(self.session)
        await rbac_svc.assign_user_role(user_id, role_id)

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
