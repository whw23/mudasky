"""初始化系统基础数据。

首次启动时自动创建权限、权限组和超级管理员，如已存在则跳过。
"""

import asyncio
import logging

from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.security import hash_password
from app.rbac.models import Permission, PermissionGroup
from app.rbac.tables import group_permission, user_group
from app.user.models import User

logger = logging.getLogger(__name__)

SUPERUSER_USERNAME = "mudasky"
SUPERUSER_PASSWORD = "mudasky@12321."

# 系统权限定义
PERMISSIONS = [
    ("member:manage", "管理会员"),
    ("staff:manage", "管理内部员工"),
    ("group:manage", "管理权限组"),
    ("post:manage", "管理机构推文"),
    ("blog:manage", "管理学生博客"),
    ("blog:write", "发布个人博客"),
    ("category:manage", "管理分类"),
    ("document:manage", "管理用户文档"),
    ("document:upload", "上传个人文档"),
]

# 系统权限组定义：(name, description, is_system, auto_include_all, [permission_codes])
GROUPS = [
    (
        "global_admin",
        "全局管理员",
        True,
        True,
        [],  # auto_include_all=True，无需显式关联
    ),
    (
        "content_editor",
        "内容编辑",
        True,
        False,
        ["post:manage", "blog:manage", "category:manage"],
    ),
    (
        "student_advisor",
        "留学顾问",
        True,
        False,
        ["member:manage", "blog:manage", "document:manage"],
    ),
    (
        "member",
        "会员",
        True,
        False,
        ["blog:write", "document:upload"],
    ),
]


async def init_permissions(session) -> None:
    """初始化系统权限。已存在的权限跳过。"""
    for code, description in PERMISSIONS:
        stmt = select(Permission).where(Permission.code == code)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug("权限已存在，跳过: %s", code)
            continue

        permission = Permission(code=code, description=description)
        session.add(permission)
        logger.info("创建权限: %s", code)


async def init_groups(session) -> None:
    """初始化系统权限组。已存在的权限组跳过。"""
    for name, description, is_system, auto_include_all, perm_codes in GROUPS:
        stmt = select(PermissionGroup).where(
            PermissionGroup.name == name
        )
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug("权限组已存在，跳过: %s", name)
            continue

        group = PermissionGroup(
            name=name,
            description=description,
            is_system=is_system,
            auto_include_all=auto_include_all,
        )
        session.add(group)

        # 先 flush 以获取 group.id
        await session.flush()

        # 关联权限
        if perm_codes:
            perm_stmt = select(Permission).where(
                Permission.code.in_(perm_codes)
            )
            perm_result = await session.execute(perm_stmt)
            permissions = perm_result.scalars().all()

            for perm in permissions:
                await session.execute(
                    group_permission.insert().values(
                        group_id=group.id,
                        permission_id=perm.id,
                    )
                )

        logger.info("创建权限组: %s", name)


async def init_superuser(session) -> None:
    """检查并创建超级管理员，分配 global_admin 权限组。"""
    stmt = select(User).where(User.is_superuser.is_(True))
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        logger.info("超级管理员已存在，跳过创建")
        return

    superuser = User(
        username=SUPERUSER_USERNAME,
        password_hash=hash_password(SUPERUSER_PASSWORD),
        user_type="staff",
        is_superuser=True,
        is_active=True,
    )
    session.add(superuser)
    await session.flush()

    # 分配 global_admin 权限组
    group_stmt = select(PermissionGroup).where(
        PermissionGroup.name == "global_admin"
    )
    group_result = await session.execute(group_stmt)
    admin_group = group_result.scalar_one_or_none()

    if admin_group:
        await session.execute(
            user_group.insert().values(
                user_id=superuser.id,
                group_id=admin_group.id,
            )
        )

    logger.info("超级管理员创建成功: %s", SUPERUSER_USERNAME)


async def init_system_config(session) -> None:
    """初始化系统配置。"""
    from app.config.models import SystemConfig

    existing = await session.execute(
        select(SystemConfig).where(SystemConfig.key == "phone_country_codes")
    )
    if not existing.scalar_one_or_none():
        session.add(SystemConfig(
            key="phone_country_codes",
            value=[
                {"code": "+86", "country": "🇨🇳", "label": "中国", "digits": 11},
                {"code": "+81", "country": "🇯🇵", "label": "日本", "digits": 10},
                {"code": "+49", "country": "🇩🇪", "label": "德国", "digits": 10},
                {"code": "+65", "country": "🇸🇬", "label": "新加坡", "digits": 8},
                {"code": "+1", "country": "🇺🇸", "label": "US/CA", "digits": 10},
                {"code": "+44", "country": "🇬🇧", "label": "英国", "digits": 10},
                {"code": "+82", "country": "🇰🇷", "label": "韩国", "digits": 10},
                {"code": "+33", "country": "🇫🇷", "label": "法国", "digits": 9},
            ],
            description="启用的手机号国家码列表",
        ))
        await session.flush()
        print("  ✓ phone_country_codes 已初始化")
    else:
        print("  - phone_country_codes 已存在，跳过")


async def main() -> None:
    """执行全部初始化任务。"""
    async with async_session_factory() as session:
        await init_permissions(session)
        await init_groups(session)
        await init_superuser(session)
        print("初始化系统配置...")
        await init_system_config(session)
        await session.commit()
        logger.info("系统初始化完成")


if __name__ == "__main__":
    from app.core.logging import setup_logging

    setup_logging()
    asyncio.run(main())
