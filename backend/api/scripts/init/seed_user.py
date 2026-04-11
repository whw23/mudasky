"""初始化超级管理员账号。"""

import logging

from sqlalchemy import select

from app.core.security import hash_password
from app.rbac.models import Role
from app.user.models import User

logger = logging.getLogger(__name__)

SUPERUSER_USERNAME = "mudasky"
SUPERUSER_PASSWORD = "mudasky@12321."


async def init_superuser(session) -> None:
    """检查并创建超级管理员，分配 superuser 角色。"""
    stmt = select(User).where(User.username == SUPERUSER_USERNAME)
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        # 确保密码与配置一致（Docker/本地环境切换时 hash 可能不兼容）
        existing.password_hash = hash_password(SUPERUSER_PASSWORD)
        await session.flush()
        logger.info("超级管理员已存在，密码已同步")
        return

    # 查找 superuser 角色
    role_stmt = select(Role).where(Role.name == "superuser")
    role_result = await session.execute(role_stmt)
    admin_role = role_result.scalar_one_or_none()

    superuser = User(
        username=SUPERUSER_USERNAME,
        password_hash=hash_password(SUPERUSER_PASSWORD),
        is_active=True,
        role_id=admin_role.id if admin_role else None,
    )
    session.add(superuser)
    await session.flush()

    logger.info("超级管理员创建成功: %s", SUPERUSER_USERNAME)
