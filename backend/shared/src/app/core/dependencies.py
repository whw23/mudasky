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


# 类型别名
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
