"""RBAC 权限领域业务逻辑层。

处理权限查询、权限组管理、用户权限分配等业务。
用户与权限组为一对多关系。
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.rbac import repository
from app.rbac.models import PermissionGroup
from app.rbac.schemas import (
    GroupCreate,
    GroupResponse,
    GroupUpdate,
    PermissionResponse,
)


class RbacService:
    """RBAC 权限业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def list_permissions(self) -> list[PermissionResponse]:
        """查询所有权限列表。"""
        perms = await repository.list_permissions(self.session)
        return [
            PermissionResponse.model_validate(p) for p in perms
        ]

    async def list_groups(self) -> list[GroupResponse]:
        """查询所有权限组，包含权限和用户数量。"""
        rows = await repository.list_groups(self.session)
        result: list[GroupResponse] = []
        for group, user_count in rows:
            resp = GroupResponse.model_validate(group)
            resp.user_count = user_count
            result.append(resp)
        return result

    async def get_group(self, group_id: str) -> GroupResponse:
        """查询权限组详情，不存在则抛出异常。"""
        group = await repository.get_group_by_id(
            self.session, group_id
        )
        if not group:
            raise NotFoundException(message="权限组不存在")
        return GroupResponse.model_validate(group)

    async def create_group(
        self, data: GroupCreate
    ) -> GroupResponse:
        """创建权限组。

        检查名称唯一性，关联指定权限。
        """
        existing = await repository.get_group_by_name(
            self.session, data.name
        )
        if existing:
            raise ConflictException(message="权限组名称已存在")

        permissions = await repository.get_permissions_by_ids(
            self.session, data.permission_ids
        )

        group = PermissionGroup(
            name=data.name,
            description=data.description,
            permissions=permissions,
        )
        await repository.create_group(self.session, group)
        return GroupResponse.model_validate(group)

    async def update_group(
        self, group_id: str, data: GroupUpdate
    ) -> GroupResponse:
        """更新权限组。

        系统权限组不允许修改名称。
        """
        group = await repository.get_group_by_id(
            self.session, group_id
        )
        if not group:
            raise NotFoundException(message="权限组不存在")

        if data.name is not None:
            if group.is_system:
                raise ForbiddenException(
                    message="系统权限组不允许修改名称"
                )
            existing = await repository.get_group_by_name(
                self.session, data.name
            )
            if existing and existing.id != group_id:
                raise ConflictException(
                    message="权限组名称已存在"
                )
            group.name = data.name

        if data.description is not None:
            group.description = data.description

        if data.permission_ids is not None:
            permissions = (
                await repository.get_permissions_by_ids(
                    self.session, data.permission_ids
                )
            )
            group.permissions = permissions

        await repository.update_group(self.session, group)
        return GroupResponse.model_validate(group)

    async def delete_group(self, group_id: str) -> None:
        """删除权限组。

        系统权限组不允许删除。
        """
        group = await repository.get_group_by_id(
            self.session, group_id
        )
        if not group:
            raise NotFoundException(message="权限组不存在")
        if group.is_system:
            raise ForbiddenException(
                message="系统权限组不允许删除"
            )
        await repository.delete_group(self.session, group_id)

    async def get_user_permissions(
        self, user_id: str
    ) -> list[str]:
        """查询用户的所有权限码。"""
        return await repository.get_user_permissions(
            self.session, user_id
        )

    async def get_user_group_id(
        self, user_id: str
    ) -> str | None:
        """查询用户所属权限组 ID。"""
        return await repository.get_user_group_id(
            self.session, user_id
        )

    async def assign_user_group(
        self,
        user_id: str,
        group_id: str | None,
        operator_permissions: list[str],
        is_superuser: bool,
    ) -> None:
        """分配用户权限组（单个）。

        非超级管理员且没有 group:manage 权限时，
        只能分配自己也拥有的权限对应的权限组。
        """
        if group_id and not is_superuser and (
            "group:manage" not in operator_permissions
        ):
            group = await repository.get_group_by_id(
                self.session, group_id
            )
            if not group:
                raise NotFoundException(
                    message="权限组不存在"
                )
            for perm in group.permissions:
                if perm.code not in operator_permissions:
                    raise ForbiddenException(
                        message="不能分配超出自身权限的权限组"
                    )

        await repository.set_user_group(
            self.session, user_id, group_id
        )
