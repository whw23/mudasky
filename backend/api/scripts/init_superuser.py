"""初始化超级管理员账号。

首次启动时自动创建，如已存在则跳过。
"""

import asyncio
import logging

from app.core.database import async_session_factory
from app.core.security import hash_password
from app.user.models import User

logger = logging.getLogger(__name__)

SUPERUSER_USERNAME = "mudasky"
SUPERUSER_PASSWORD = "mudasky@12321."


async def init_superuser() -> None:
    """检查并创建超级管理员。"""
    async with async_session_factory() as session:
        from sqlalchemy import select

        stmt = select(User).where(User.is_superuser.is_(True))
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.info("超级管理员已存在，跳过创建")
            return

        superuser = User(
            username=SUPERUSER_USERNAME,
            password_hash=hash_password(SUPERUSER_PASSWORD),
            is_superuser=True,
            is_active=True,
        )
        session.add(superuser)
        await session.commit()
        logger.info("超级管理员创建成功: %s", SUPERUSER_USERNAME)


if __name__ == "__main__":
    from app.core.logging import setup_logging

    setup_logging()
    asyncio.run(init_superuser())
