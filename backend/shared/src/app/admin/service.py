"""管理员领域业务逻辑层。

提供用户管理、密码重置、权限分配、强制下线等管理员专用操作。
"""

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import repository as auth_repo
from app.core.exceptions import ForbiddenException, NotFoundException
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
        """构建包含权限和权限组的用户响应。"""
        permissions = await rbac_repo.get_user_permissions(
            self.session, user.id
        )
        group_name = await rbac_repo.get_user_group_name(
            self.session, user.id
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
            group_id=user.group_id,
            group_name=group_name,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    async def list_users(
        self,
        user_type_filter: str | None,
        search: str | None,
        offset: int,
        limit: int,
    ) -> tuple[list[UserResponse], int]:
        """分页查询用户列表，支持按类型和关键词筛选。"""
        base_query = select(User)
        count_query = select(func.count()).select_from(User)

        # 按用户类型筛选
        if user_type_filter:
            base_query = base_query.where(
                User.user_type == user_type_filter
            )
            count_query = count_query.where(
                User.user_type == user_type_filter
            )

        # 按手机号或用户名模糊搜索
        if search:
            like_pattern = f"%{search}%"
            search_filter = or_(
                User.phone.like(like_pattern),
                User.username.like(like_pattern),
            )
            base_query = base_query.where(search_filter)
            count_query = count_query.where(search_filter)

        # 查询总数
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # 查询分页数据
        stmt = (
            base_query.order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        users = list(result.scalars().all())

        # 构建包含权限信息的响应
        user_responses = [
            await self._build_user_response(u) for u in users
        ]
        return user_responses, total

    async def get_user(self, user_id: str) -> UserResponse:
        """获取用户详情，包含权限和权限组信息。"""
        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在")
        return await self._build_user_response(user)

    async def update_user(
        self, user_id: str, data: UserAdminUpdate
    ) -> UserResponse:
        """管理员更新用户信息（激活状态、存储配额）。"""
        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在")

        if data.is_active is not None:
            user.is_active = data.is_active
        if data.storage_quota is not None:
            user.storage_quota = data.storage_quota

        await user_repo.update(self.session, user)
        return await self._build_user_response(user)

    async def change_user_type(
        self, user_id: str, new_type: str
    ) -> UserResponse:
        """修改用户类型。"""
        if new_type not in ("guest", "member", "staff"):
            raise ForbiddenException(
                message="用户类型只能是 guest、member 或 staff"
            )

        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在")

        user.user_type = new_type
        await user_repo.update(self.session, user)
        return await self._build_user_response(user)

    async def reset_password(
        self, user_id: str, new_password: str
    ) -> None:
        """重置用户密码。"""
        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在")

        user.password_hash = hash_password(new_password)
        await user_repo.update(self.session, user)

    async def assign_group(
        self,
        user_id: str,
        group_id: str | None,
        operator_permissions: list[str],
        is_superuser: bool,
    ) -> UserResponse:
        """分配用户权限组（单个），委托 RbacService 做约束检查。"""
        rbac_svc = RbacService(self.session)
        await rbac_svc.assign_user_group(
            user_id, group_id, operator_permissions, is_superuser
        )

        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在")
        return await self._build_user_response(user)

    async def force_logout(self, user_id: str) -> None:
        """强制下线用户，撤销所有刷新令牌。"""
        await auth_repo.revoke_user_refresh_tokens(
            self.session, user_id
        )

    async def check_target_permission(
        self,
        target_user: User,
        operator_permissions: list[str],
        is_superuser: bool,
    ) -> None:
        """检查操作者是否有权管理目标用户。"""
        if is_superuser:
            return

        if target_user.is_superuser:
            raise ForbiddenException(
                message="不能管理超级管理员"
            )

        if target_user.user_type in ("member", "guest"):
            if "member:manage" not in operator_permissions:
                raise ForbiddenException(
                    message="没有管理会员的权限"
                )
        elif target_user.user_type == "staff":
            if "staff:manage" not in operator_permissions:
                raise ForbiddenException(
                    message="没有管理员工的权限"
                )

    async def get_user_model(
        self, user_id: str
    ) -> User:
        """获取用户 ORM 对象，不存在则抛出异常。"""
        user = await user_repo.get_by_id(
            self.session, user_id
        )
        if not user:
            raise NotFoundException(message="用户不存在")
        return user
