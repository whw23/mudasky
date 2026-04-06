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


async def get_current_user_role(
    x_user_role: Annotated[str | None, Header()] = None,
) -> str:
    """从网关注入的请求头获取当前用户角色。"""
    if not x_user_role:
        raise ForbiddenException(message="未获取到用户角色")
    return x_user_role


def require_role(*roles: str):
    """创建角色校验依赖。"""

    async def check_role(
        current_role: Annotated[str, Depends(get_current_user_role)],
    ) -> str:
        """校验当前用户角色是否在允许列表中。"""
        if current_role not in roles:
            raise ForbiddenException(message="角色权限不足")
        return current_role

    return check_role


# 类型别名
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
CurrentUserRole = Annotated[str, Depends(get_current_user_role)]
