"""公共依赖注入。

用户信息从 OpenResty 网关注入的请求头中获取。
"""

from typing import Annotated

from fastapi import Depends, Header

from app.core.database import AsyncSession, get_db
from app.core.exceptions import ForbiddenException


async def get_current_user_id(
    x_user_id: Annotated[str | None, Header()] = None,
) -> str:
    """从网关注入的请求头获取当前用户 ID。"""
    if not x_user_id:
        raise ForbiddenException(message="未获取到用户信息")
    return x_user_id


async def get_current_permissions(
    x_user_permissions: str = Header(""),
) -> list[str]:
    """从网关注入的请求头获取当前用户权限列表。"""
    return [p for p in x_user_permissions.split(",") if p]


async def get_current_user_type(
    x_user_type: str = Header("guest"),
) -> str:
    """从网关注入的请求头获取当前用户类型。"""
    return x_user_type


async def get_is_superuser(
    x_is_superuser: str = Header("false"),
) -> bool:
    """从网关注入的请求头获取当前用户是否为超级管理员。"""
    return x_is_superuser.lower() == "true"


def require_permission(*perms: str):
    """创建权限校验依赖，要求用户拥有全部指定权限。

    超级管理员跳过校验。
    """

    async def check_permissions(
        permissions: Annotated[
            list[str], Depends(get_current_permissions)
        ],
        is_superuser: Annotated[
            bool, Depends(get_is_superuser)
        ],
    ) -> list[str]:
        """校验当前用户是否拥有全部指定权限。"""
        if is_superuser:
            return permissions
        if not all(p in permissions for p in perms):
            raise ForbiddenException(message="权限不足")
        return permissions

    return check_permissions


def require_any_permission(*perms: str):
    """创建权限校验依赖，要求用户拥有任一指定权限。

    超级管理员跳过校验。
    """

    async def check_any_permission(
        permissions: Annotated[
            list[str], Depends(get_current_permissions)
        ],
        is_superuser: Annotated[
            bool, Depends(get_is_superuser)
        ],
    ) -> list[str]:
        """校验当前用户是否拥有任一指定权限。"""
        if is_superuser:
            return permissions
        if not any(p in permissions for p in perms):
            raise ForbiddenException(message="权限不足")
        return permissions

    return check_any_permission


# 类型别名
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
CurrentPermissions = Annotated[
    list[str], Depends(get_current_permissions)
]
CurrentUserType = Annotated[
    str, Depends(get_current_user_type)
]
IsSuperuser = Annotated[bool, Depends(get_is_superuser)]
