"""RBAC 权限管理业务逻辑层。

处理角色管理、用户权限分配等业务。
用户与角色为一对多关系，权限以 JSON 列表存储在角色中。
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.db.auth import repository as auth_repo
from app.db.rbac import repository
from app.db.rbac.models import Role
from app.db.user import repository as user_repo

from .schemas import (
    RoleCreate,
    RoleReorder,
    RoleResponse,
    RoleUpdate,
)

# 受保护的角色名称，不允许删除
PROTECTED_ROLE_NAMES = {"superuser", "visitor"}


class RbacService:
    """RBAC 权限业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def list_roles(self) -> list[RoleResponse]:
        """查询所有角色，包含权限和用户数量。"""
        roles = await repository.list_roles(self.session)
        counts = await user_repo.count_by_role(self.session)
        result: list[RoleResponse] = []
        for role in roles:
            resp = RoleResponse.model_validate(role)
            resp.user_count = counts.get(role.id, 0)
            result.append(resp)
        return result

    async def get_role(self, role_id: str) -> RoleResponse:
        """查询角色详情，不存在则抛出异常。"""
        role = await repository.get_role_by_id(
            self.session, role_id
        )
        if not role:
            raise NotFoundException(message="角色不存在", code="ROLE_NOT_FOUND")
        return RoleResponse.model_validate(role)

    async def create_role(
        self, data: RoleCreate
    ) -> RoleResponse:
        """创建角色。

        检查名称唯一性，设置权限列表。
        如果指定 merge_from，合并这些角色的权限（去重）；
        如果同时传了 permissions，以 permissions 为准。
        """
        existing = await repository.get_role_by_name(
            self.session, data.name
        )
        if existing:
            raise ConflictException(message="角色名称已存在", code="ROLE_NAME_EXISTS")

        permissions = data.permissions
        if data.merge_from and not data.permissions:
            merged: set[str] = set()
            for role_name in data.merge_from:
                source = await repository.get_role_by_name(
                    self.session, role_name
                )
                if source and source.permissions:
                    merged.update(source.permissions)
            permissions = sorted(merged)

        max_order = await repository.get_max_sort_order(self.session)

        role = Role(
            name=data.name,
            description=data.description,
            permissions=permissions,
            is_builtin=False,
            sort_order=max_order + 1,
        )
        await repository.create_role(self.session, role)
        return RoleResponse.model_validate(role)

    async def update_role(
        self, role_id: str, data: RoleUpdate
    ) -> RoleResponse:
        """更新角色。

        如果权限变更，踢下线该角色下的所有用户（删除 refresh_token）。
        """
        role = await repository.get_role_by_id(
            self.session, role_id
        )
        if not role:
            raise NotFoundException(message="角色不存在", code="ROLE_NOT_FOUND")

        if data.name is not None:
            if role.name in PROTECTED_ROLE_NAMES:
                raise ForbiddenException(
                    message="受保护角色不允许修改名称", code="PROTECTED_ROLE_NO_RENAME"
                )
            existing = await repository.get_role_by_name(
                self.session, data.name
            )
            if existing and existing.id != role_id:
                raise ConflictException(
                    message="角色名称已存在", code="ROLE_NAME_EXISTS"
                )
            role.name = data.name

        if data.description is not None:
            role.description = data.description

        permissions_changed = False
        if data.permissions is not None:
            if role.name == "superuser":
                raise ForbiddenException(
                    message="超级管理员角色不允许修改权限", code="PROTECTED_ROLE_NO_EDIT_PERMS"
                )
            if set(role.permissions or []) != set(data.permissions):
                permissions_changed = True
            role.permissions = data.permissions

        await repository.update_role(self.session, role)

        # 权限变更时踢下线该角色下的所有用户
        if permissions_changed:
            users = await user_repo.list_by_role_id(
                self.session, role.id
            )
            for user in users:
                await auth_repo.delete_refresh_tokens_by_user(
                    self.session, user.id
                )

        return RoleResponse.model_validate(role)

    async def delete_role(self, role_id: str) -> None:
        """删除角色。

        受保护角色（superuser、visitor）不允许删除。
        """
        role = await repository.get_role_by_id(
            self.session, role_id
        )
        if not role:
            raise NotFoundException(message="角色不存在", code="ROLE_NOT_FOUND")
        if role.name in PROTECTED_ROLE_NAMES:
            raise ForbiddenException(
                message="受保护角色不允许删除", code="PROTECTED_ROLE_NO_DELETE"
            )
        # 删除角色前，踢下线该角色下的所有用户
        users = await user_repo.list_by_role_id(self.session, role.id)
        for user in users:
            await auth_repo.revoke_user_refresh_tokens(
                self.session, user.id
            )
        await repository.delete_role(self.session, role_id)

    async def reorder_roles(self, data: RoleReorder) -> None:
        """批量更新角色排序。"""
        items = [(item.id, item.sort_order) for item in data.items]
        await repository.bulk_update_sort_order(self.session, items)

    async def get_user_permissions(
        self, user_id: str
    ) -> list[str]:
        """查询用户的所有权限码。"""
        role_id = await user_repo.get_role_id(
            self.session, user_id
        )
        if not role_id:
            return []
        return await repository.get_permissions_by_role(
            self.session, role_id
        )

    async def get_user_role_id(
        self, user_id: str
    ) -> str | None:
        """查询用户所属角色 ID。"""
        return await user_repo.get_role_id(
            self.session, user_id
        )

    async def assign_user_role(
        self,
        user_id: str,
        role_id: str | None,
    ) -> None:
        """分配用户角色（单个）。"""
        if role_id:
            role = await repository.get_role_by_id(
                self.session, role_id
            )
            if not role:
                raise NotFoundException(
                    message="角色不存在", code="ROLE_NOT_FOUND"
                )

        await user_repo.set_role_id(
            self.session, user_id, role_id
        )
