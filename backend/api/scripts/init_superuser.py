"""初始化系统基础数据。

首次启动时自动创建权限、角色和超级管理员，如已存在则跳过。
"""

import asyncio
import logging

from sqlalchemy import select

from app.content.models import Category
from app.core.database import async_session_factory
from app.core.security import hash_password
from app.rbac.models import Permission, Role
from app.rbac.tables import role_permission
from app.user.models import User

logger = logging.getLogger(__name__)

SUPERUSER_USERNAME = "mudasky"
SUPERUSER_PASSWORD = "mudasky@12321."

# 系统权限定义：(code, name_key, description)
PERMISSIONS = [
    # 用户中心 - 个人资料
    ("user_center.profile.view", "permission.user_center.profile.view", "查看个人资料"),
    ("user_center.profile.edit", "permission.user_center.profile.edit", "编辑个人资料"),
    ("user_center.profile.password", "permission.user_center.profile.password", "修改密码"),
    ("user_center.profile.phone", "permission.user_center.profile.phone", "修改手机号"),
    # 用户中心 - 双因素认证
    ("user_center.two_factor.totp", "permission.user_center.two_factor.totp", "TOTP 双因素认证"),
    ("user_center.two_factor.sms", "permission.user_center.two_factor.sms", "短信双因素认证"),
    ("user_center.two_factor.disable", "permission.user_center.two_factor.disable", "关闭双因素认证"),
    # 用户中心 - 文档
    ("user_center.document.upload", "permission.user_center.document.upload", "上传文档"),
    ("user_center.document.list", "permission.user_center.document.list", "查看文档列表"),
    ("user_center.document.delete", "permission.user_center.document.delete", "删除文档"),
    # 用户中心 - 文章
    ("user_center.article.create", "permission.user_center.article.create", "创建文章"),
    ("user_center.article.edit", "permission.user_center.article.edit", "编辑文章"),
    ("user_center.article.delete", "permission.user_center.article.delete", "删除文章"),
    # 管理后台 - 用户管理
    ("admin.user.list", "permission.admin.user.list", "查看用户列表"),
    ("admin.user.edit", "permission.admin.user.edit", "编辑用户"),
    ("admin.user.toggle_active", "permission.admin.user.toggle_active", "启用/禁用用户"),
    ("admin.user.reset_password", "permission.admin.user.reset_password", "重置用户密码"),
    ("admin.user.assign_role", "permission.admin.user.assign_role", "分配用户角色"),
    # 管理后台 - 内容管理
    ("admin.content.list", "permission.admin.content.list", "查看内容列表"),
    ("admin.content.edit", "permission.admin.content.edit", "编辑内容"),
    ("admin.content.delete", "permission.admin.content.delete", "删除内容"),
    # 管理后台 - 分类管理
    ("admin.category.create", "permission.admin.category.create", "创建分类"),
    ("admin.category.edit", "permission.admin.category.edit", "编辑分类"),
    ("admin.category.delete", "permission.admin.category.delete", "删除分类"),
    # 管理后台 - 案例管理
    ("admin.case.create", "permission.admin.case.create", "创建成功案例"),
    ("admin.case.edit", "permission.admin.case.edit", "编辑成功案例"),
    ("admin.case.delete", "permission.admin.case.delete", "删除成功案例"),
    # 管理后台 - 院校管理
    ("admin.university.create", "permission.admin.university.create", "创建合作院校"),
    ("admin.university.edit", "permission.admin.university.edit", "编辑合作院校"),
    ("admin.university.delete", "permission.admin.university.delete", "删除合作院校"),
    # 管理后台 - 角色管理
    ("admin.role.list", "permission.admin.role.list", "查看角色列表"),
    ("admin.role.create", "permission.admin.role.create", "创建角色"),
    ("admin.role.edit", "permission.admin.role.edit", "编辑角色"),
    ("admin.role.delete", "permission.admin.role.delete", "删除角色"),
    # 管理后台 - 系统设置
    ("admin.settings.view", "permission.admin.settings.view", "查看系统设置"),
    ("admin.settings.edit", "permission.admin.settings.edit", "编辑系统设置"),
    # 通配符权限
    ("*", "permission.all", "所有权限"),
    ("admin.*", "permission.admin.all", "所有管理后台权限"),
    ("user_center.*", "permission.user_center.all", "所有用户中心权限"),
    ("admin.user.*", "permission.admin.user.all", "所有用户管理权限"),
    ("admin.content.*", "permission.admin.content.all", "所有内容管理权限"),
    ("admin.category.*", "permission.admin.category.all", "所有分类管理权限"),
    ("admin.case.*", "permission.admin.case.all", "所有案例管理权限"),
    ("admin.university.*", "permission.admin.university.all", "所有院校管理权限"),
    ("admin.role.*", "permission.admin.role.all", "所有角色管理权限"),
    ("admin.settings.*", "permission.admin.settings.all", "所有系统设置权限"),
    ("user_center.profile.*", "permission.user_center.profile.all", "所有个人资料权限"),
    ("user_center.two_factor.*", "permission.user_center.two_factor.all", "所有双因素认证权限"),
    ("user_center.document.*", "permission.user_center.document.all", "所有文档权限"),
    ("user_center.article.*", "permission.user_center.article.all", "所有文章权限"),
]

# 系统角色定义：(name, description, [permission_codes], sort_order)
ROLES = [
    ("superuser", "超级管理员", ["*"], 0),
    ("website_admin", "网站管理员", ["admin.*", "user_center.*"], 1),
    ("student_advisor", "留学顾问", ["admin.user.*", "admin.content.*", "admin.case.*", "user_center.*"], 2),
    ("student", "学员", ["user_center.*"], 3),
    ("visitor", "访客", ["user_center.profile.view"], 4),
]


async def init_permissions(session) -> None:
    """初始化系统权限。已存在的权限跳过。"""
    for code, name_key, description in PERMISSIONS:
        stmt = select(Permission).where(Permission.code == code)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            # 更新 name_key（迁移时可能缺少）
            if existing.name_key != name_key:
                existing.name_key = name_key
            logger.debug("权限已存在，跳过: %s", code)
            continue

        permission = Permission(
            code=code, name_key=name_key, description=description
        )
        session.add(permission)
        logger.info("创建权限: %s", code)


async def init_roles(session) -> None:
    """初始化系统角色。已存在的角色跳过。"""
    for name, description, perm_codes, sort_order in ROLES:
        stmt = select(Role).where(Role.name == name)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug("角色已存在，跳过: %s", name)
            continue

        role = Role(
            name=name,
            description=description,
            is_builtin=True,
            sort_order=sort_order,
        )
        session.add(role)

        # 先 flush 以获取 role.id
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
                    role_permission.insert().values(
                        role_id=role.id,
                        permission_id=perm.id,
                    )
                )

        logger.info("创建角色: %s", name)


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


async def init_system_config(session) -> None:
    """初始化系统配置。"""
    from app.config.models import SystemConfig

    # phone_country_codes
    existing = await session.execute(
        select(SystemConfig).where(SystemConfig.key == "phone_country_codes")
    )
    if not existing.scalar_one_or_none():
        session.add(SystemConfig(
            key="phone_country_codes",
            value=[
                {"code": "+86", "country": "🇨🇳", "label": "中国", "digits": 11, "enabled": True},
                {"code": "+81", "country": "🇯🇵", "label": "日本", "digits": 10, "enabled": False},
                {"code": "+49", "country": "🇩🇪", "label": "德国", "digits": 10, "enabled": False},
                {"code": "+65", "country": "🇸🇬", "label": "新加坡", "digits": 8, "enabled": False},
                {"code": "+1", "country": "🇺🇸", "label": "US/CA", "digits": 10, "enabled": False},
                {"code": "+44", "country": "🇬🇧", "label": "英国", "digits": 10, "enabled": False},
                {"code": "+82", "country": "🇰🇷", "label": "韩国", "digits": 10, "enabled": False},
                {"code": "+33", "country": "🇫🇷", "label": "法国", "digits": 9, "enabled": False},
            ],
            description="启用的手机号国家码列表",
        ))
        await session.flush()
        print("  + phone_country_codes 已初始化")
    else:
        print("  - phone_country_codes 已存在，跳过")

    # contact_info
    existing_contact = await session.execute(
        select(SystemConfig).where(SystemConfig.key == "contact_info")
    )
    if not existing_contact.scalar_one_or_none():
        session.add(SystemConfig(
            key="contact_info",
            value={
                "address": "江苏省南京市xx区xx路xx号",
                "phone": "189-1268-6656",
                "email": "info@mutu-edu.com",
                "wechat": "mutu_edu",
                "office_hours": "周一至周五 9:00-18:00",
            },
            description="联系方式配置",
        ))
        await session.flush()
        print("  + contact_info 已初始化")
    else:
        print("  - contact_info 已存在，跳过")

    # site_info
    existing_site = await session.execute(
        select(SystemConfig).where(SystemConfig.key == "site_info")
    )
    if not existing_site.scalar_one_or_none():
        session.add(SystemConfig(
            key="site_info",
            value={
                "brand_name": "慕大国际教育",
                "brand_name_en": "MUTU International Education",
                "tagline": "慕大国际教育 · 专注国际教育 专注出国服务",
                "hotline": "189-1268-6656",
                "hotline_contact": "吴老师",
                "logo_url": "",
                "favicon_url": "",
                "wechat_qr_url": "",
                "icp_filing": "",
            },
            description="品牌信息配置",
        ))
        await session.flush()
        print("  + site_info 已初始化")
    else:
        print("  - site_info 已存在，跳过")

    # homepage_stats
    existing_stats = await session.execute(
        select(SystemConfig).where(SystemConfig.key == "homepage_stats")
    )
    if not existing_stats.scalar_one_or_none():
        session.add(SystemConfig(
            key="homepage_stats",
            value=[
                {"value": "15+", "label": "年办学经验"},
                {"value": "500+", "label": "成功案例"},
                {"value": "50+", "label": "合作院校"},
                {"value": "98%", "label": "签证通过率"},
            ],
            description="首页统计数字",
        ))
        await session.flush()
        print("  + homepage_stats 已初始化")
    else:
        print("  - homepage_stats 已存在，跳过")

    # about_info
    existing_about = await session.execute(
        select(SystemConfig).where(SystemConfig.key == "about_info")
    )
    if not existing_about.scalar_one_or_none():
        session.add(SystemConfig(
            key="about_info",
            value={
                "history": "慕大国际教育成立于2011年，专注于小语种留学项目运营已15年。作为慕尼黑大学语言中心江苏省唯一指定招生考点，我们始终秉承\"专业、诚信、高效\"的服务理念，为数百位学子成功圆梦海外名校。从最初的德语培训到如今涵盖德语、日语、法语、韩语等多语种留学服务，我们不断拓展业务版图，致力于成为中国领先的国际教育服务机构。",
                "mission": "让每一位有留学梦想的学子都能获得专业、贴心的一站式留学服务，帮助学生找到最适合自己的海外学府，实现人生价值的飞跃。",
                "vision": "成为中国最值得信赖的国际教育服务品牌，打通中国学子与世界名校之间的桥梁，推动中外教育文化交流与融合。",
                "partnership": "慕大国际是慕尼黑大学语言中心（Sprachenzentrum der LMU München）在江苏省的唯一官方指定招生考点。慕尼黑大学语言中心是德国最权威的德语培训机构之一，其德语课程受到全球认可。通过与慕尼黑大学语言中心的深度合作，我们为学生提供原汁原味的德语教学、考试认证以及直通德国名校的绿色通道。",
            },
            description="关于我们页面内容",
        ))
        await session.flush()
        print("  + about_info 已初始化")
    else:
        print("  - about_info 已存在，跳过")


CATEGORIES = [
    ("新闻政策", "news", "新闻和政策动态"),
    ("留学项目", "study-abroad", "留学项目介绍"),
    ("申请条件", "requirements", "申请条件和材料"),
    ("签证办理", "visa", "签证申请指南"),
    ("留学生活", "life", "海外生活指南"),
]


async def init_categories(session) -> None:
    """初始化内容分类。已存在的分类跳过。"""
    for idx, (name, slug, description) in enumerate(CATEGORIES):
        stmt = select(Category).where(Category.slug == slug)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug("分类已存在，跳过: %s", slug)
            continue

        category = Category(
            name=name,
            slug=slug,
            description=description,
            sort_order=idx,
        )
        session.add(category)
        logger.info("创建分类: %s (%s)", name, slug)

    await session.flush()
    print("  + 内容分类已初始化")


async def main() -> None:
    """执行全部初始化任务。"""
    async with async_session_factory() as session:
        await init_permissions(session)
        await init_roles(session)
        await init_superuser(session)
        print("初始化系统配置...")
        await init_system_config(session)
        print("初始化内容分类...")
        await init_categories(session)
        await session.commit()
        logger.info("系统初始化完成")


if __name__ == "__main__":
    from app.core.logging import setup_logging

    setup_logging()
    asyncio.run(main())
