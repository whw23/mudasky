"""初始化 RBAC 角色。"""

import logging

from sqlalchemy import select

from app.db.rbac.models import Role

logger = logging.getLogger(__name__)

# 系统角色定义：(name, description, permissions, sort_order)
ROLES = [
    ("superuser", "超级管理员", ["*"], 0),
    ("content_admin", "内容运营", [
        "admin/dashboard",
        "admin/web-settings/*",
        "admin/general-settings/*",
        "portal/profile/*",
    ], 1),
    ("advisor", "留学顾问", [
        "admin/dashboard",
        "admin/students/*",
        "admin/contacts/*",
        "portal/profile/*",
    ], 2),
    ("support", "客服", [
        "admin/dashboard",
        "admin/contacts/*",
        "portal/profile/*",
    ], 3),
    ("student", "学员", [
        "portal/*",
    ], 4),
    ("visitor", "访客", [
        "portal/profile/*",
    ], 5),
]


async def init_roles(session) -> None:
    """初始化系统角色。已存在的角色跳过。"""
    for name, description, perm_list, sort_order in ROLES:
        stmt = select(Role).where(Role.name == name)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug("角色已存在，跳过: %s", name)
            continue

        role = Role(
            name=name,
            description=description,
            permissions=perm_list,
            is_builtin=True,
            sort_order=sort_order,
        )
        session.add(role)
        logger.info("创建角色: %s", name)
