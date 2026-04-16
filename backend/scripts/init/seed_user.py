"""初始化种子用户。

从环境变量读取用户名/密码/手机号，不硬编码敏感信息。
"""

import logging
import os

from sqlalchemy import select

from app.db.rbac.models import Role
from app.db.user.models import User
from app.utils.security import hash_password

logger = logging.getLogger(__name__)


def _get_seed_users() -> list[dict]:
    """从环境变量读取种子用户配置。"""
    users = []
    for i in range(1, 4):
        username = os.environ.get(f"SEED_USER_{i}_USERNAME")
        password = os.environ.get(f"SEED_USER_{i}_PASSWORD")
        if not username or not password:
            continue
        users.append({
            "username": username,
            "password": password,
            "phone": os.environ.get(f"SEED_USER_{i}_PHONE"),
        })

    e2e_user = os.environ.get("SEED_USER_E2E_USERNAME")
    e2e_pass = os.environ.get("SEED_USER_E2E_PASSWORD")
    if e2e_user and e2e_pass:
        users.append({
            "username": e2e_user,
            "password": e2e_pass,
            "phone": None,
        })

    return users


async def init_superuser(session) -> None:
    """初始化种子用户。已存在的用户跳过。"""
    stmt = select(Role).where(Role.name == "superuser")
    result = await session.execute(stmt)
    superuser_role = result.scalar_one_or_none()

    if not superuser_role:
        logger.error("未找到 superuser 角色，请先初始化角色")
        return

    users = _get_seed_users()
    if not users:
        logger.warning("未配置种子用户环境变量，跳过用户初始化")
        return

    for user_data in users:
        stmt = select(User).where(User.username == user_data["username"])
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug("用户已存在，跳过: %s", user_data["username"])
            continue

        user = User(
            username=user_data["username"],
            password_hash=hash_password(user_data["password"]),
            phone=user_data["phone"],
            role_id=superuser_role.id,
            is_active=True,
        )
        session.add(user)
        logger.info("创建种子用户: %s", user_data["username"])

    await session.flush()
    print("  + 种子用户已初始化")
