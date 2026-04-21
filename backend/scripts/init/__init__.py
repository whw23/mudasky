"""系统初始化入口。

启动时建表并初始化种子数据，已存在则跳过。
"""

import asyncio
import logging

from app.db import Base, async_session_factory, engine
from app.db.auth.models import RefreshToken, SmsCode  # noqa: F401
from app.db.case.models import SuccessCase  # noqa: F401
from app.db.config.models import SystemConfig  # noqa: F401
from app.db.contact.models import ContactRecord  # noqa: F401
from app.db.content.models import Article, Category  # noqa: F401
from app.db.discipline.models import (  # noqa: F401
    Discipline,
    DisciplineCategory,
)
from app.db.university.program_models import UniversityProgram  # noqa: F401
from app.db.document.models import Document  # noqa: F401
from app.db.image.models import Image  # noqa: F401
from app.db.rbac.models import Role  # noqa: F401
from app.db.university.image_models import UniversityImage  # noqa: F401
from app.db.university.models import University  # noqa: F401
from app.db.user.models import User  # noqa: F401
from app.db.worker.models import Task  # noqa: F401

from .seed_config import init_system_config
from .seed_content import init_categories
from .seed_images import init_seed_images
from .seed_rbac import init_roles
from .seed_user import init_superuser

logger = logging.getLogger(__name__)


async def create_tables() -> None:
    """根据 ORM 模型创建所有数据库表（已存在则跳过）。"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("数据库表已就绪")


async def main() -> None:
    """执行全部初始化任务。"""
    await create_tables()
    async with async_session_factory() as session:
        await init_roles(session)
        await init_superuser(session)
        print("初始化系统配置...")
        await init_system_config(session)
        print("初始化种子图片...")
        await init_seed_images(session)
        print("初始化内容分类...")
        await init_categories(session)
        await session.commit()
        logger.info("系统初始化完成")


if __name__ == "__main__":
    from app.core.logging import setup_logging

    setup_logging()
    asyncio.run(main())
