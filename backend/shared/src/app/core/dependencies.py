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


def has_permission(
    user_perms: list[str], required: str
) -> bool:
    """检查用户权限列表是否满足所需权限，支持通配符。

    通配符规则：
    - "*" 匹配所有权限
    - "admin.*" 匹配 admin 下所有权限
    - 精确匹配
    """
    for perm in user_perms:
        if perm == "*":
            return True
        if perm.endswith(".*"):
            prefix = perm[:-1]
            if required.startswith(prefix):
                return True
        if perm == required:
            return True
    return False


def require_permission(*perms: str):
    """创建权限校验依赖，要求用户拥有全部指定权限。

    支持通配符匹配。
    """

    async def check_permissions(
        permissions: Annotated[
            list[str], Depends(get_current_permissions)
        ],
    ) -> list[str]:
        """校验当前用户是否拥有全部指定权限。"""
        if not all(
            has_permission(permissions, p) for p in perms
        ):
            raise ForbiddenException(message="权限不足")
        return permissions

    return check_permissions


def require_any_permission(*perms: str):
    """创建权限校验依赖，要求用户拥有任一指定权限。

    支持通配符匹配。
    """

    async def check_any_permission(
        permissions: Annotated[
            list[str], Depends(get_current_permissions)
        ],
    ) -> list[str]:
        """校验当前用户是否拥有任一指定权限。"""
        if not any(
            has_permission(permissions, p) for p in perms
        ):
            raise ForbiddenException(message="权限不足")
        return permissions

    return check_any_permission


# 类型别名
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
CurrentPermissions = Annotated[
    list[str], Depends(get_current_permissions)
]
