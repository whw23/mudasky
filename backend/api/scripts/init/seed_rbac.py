"""初始化 RBAC 权限和角色。"""

import logging

from sqlalchemy import select

from app.rbac.models import Permission, Role
from app.rbac.tables import role_permission

logger = logging.getLogger(__name__)

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
