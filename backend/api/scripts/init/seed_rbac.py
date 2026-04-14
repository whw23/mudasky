"""初始化 RBAC 权限和角色。"""

import logging

from sqlalchemy import select

from app.rbac.models import Permission, Role
from app.rbac.tables import role_permission

logger = logging.getLogger(__name__)

# 系统权限定义：(code, name_key, description)
PERMISSIONS = [
    # 用户面板 - 个人资料
    ("portal/profile/view", "permission.portal.profile.view", "查看个人资料"),
    ("portal/profile/edit", "permission.portal.profile.edit", "编辑个人资料"),
    ("portal/profile/password", "permission.portal.profile.password", "修改密码"),
    ("portal/profile/phone", "permission.portal.profile.phone", "修改手机号"),
    # 用户面板 - 双因素认证
    ("portal/profile/2fa-enable-totp", "permission.portal.profile.2fa-enable-totp", "TOTP 双因素认证"),
    ("portal/profile/2fa-enable-sms", "permission.portal.profile.2fa-enable-sms", "短信双因素认证"),
    ("portal/profile/2fa-disable", "permission.portal.profile.2fa-disable", "关闭双因素认证"),
    # 用户面板 - 文档
    ("portal/documents/upload", "permission.portal.documents.upload", "上传文档"),
    ("portal/documents/list", "permission.portal.documents.list", "查看文档列表"),
    ("portal/documents/delete", "permission.portal.documents.delete", "删除文档"),
    # 用户面板 - 文章
    ("portal/articles/create", "permission.portal.articles.create", "创建文章"),
    ("portal/articles/edit", "permission.portal.articles.edit", "编辑文章"),
    ("portal/articles/delete", "permission.portal.articles.delete", "删除文章"),
    # 管理后台 - 用户管理
    ("admin/users/list", "permission.admin.users.list", "查看用户列表"),
    ("admin/users/edit", "permission.admin.users.edit", "编辑用户"),
    ("admin/users/reset-password", "permission.admin.users.reset-password", "重置用户密码"),
    ("admin/users/assign-role", "permission.admin.users.assign-role", "分配用户角色"),
    ("admin/users/force-logout", "permission.admin.users.force-logout", "强制下线用户"),
    # 管理后台 - 内容管理
    ("admin/content/list", "permission.admin.content.list", "查看内容列表"),
    ("admin/content/create", "permission.admin.content.create", "创建内容"),
    ("admin/content/edit", "permission.admin.content.edit", "编辑内容"),
    ("admin/content/delete", "permission.admin.content.delete", "删除内容"),
    # 管理后台 - 分类管理
    ("admin/categories/list", "permission.admin.categories.list", "查看分类列表"),
    ("admin/categories/create", "permission.admin.categories.create", "创建分类"),
    ("admin/categories/edit", "permission.admin.categories.edit", "编辑分类"),
    ("admin/categories/delete", "permission.admin.categories.delete", "删除分类"),
    # 管理后台 - 案例管理
    ("admin/cases/list", "permission.admin.cases.list", "查看成功案例列表"),
    ("admin/cases/create", "permission.admin.cases.create", "创建成功案例"),
    ("admin/cases/edit", "permission.admin.cases.edit", "编辑成功案例"),
    ("admin/cases/delete", "permission.admin.cases.delete", "删除成功案例"),
    # 管理后台 - 院校管理
    ("admin/universities/list", "permission.admin.universities.list", "查看院校列表"),
    ("admin/universities/create", "permission.admin.universities.create", "创建合作院校"),
    ("admin/universities/edit", "permission.admin.universities.edit", "编辑合作院校"),
    ("admin/universities/delete", "permission.admin.universities.delete", "删除合作院校"),
    # 管理后台 - 角色管理
    ("admin/roles/list", "permission.admin.roles.list", "查看角色列表"),
    ("admin/roles/create", "permission.admin.roles.create", "创建角色"),
    ("admin/roles/edit", "permission.admin.roles.edit", "编辑角色"),
    ("admin/roles/delete", "permission.admin.roles.delete", "删除角色"),
    # 管理后台 - 系统设置
    ("admin/general-settings/list", "permission.admin.general-settings.list", "查看通用设置"),
    ("admin/general-settings/edit", "permission.admin.general-settings.edit", "编辑通用设置"),
    ("admin/web-settings/list", "permission.admin.web-settings.list", "查看网站设置"),
    ("admin/web-settings/edit", "permission.admin.web-settings.edit", "编辑网站设置"),
    # 管理后台 - 仪表盘
    ("admin/dashboard/stats", "permission.admin.dashboard.stats", "查看管理仪表盘"),
    # 用户面板 - 概览
    ("portal/overview/stats", "permission.portal.overview.stats", "查看个人概览"),
    # 管理后台 - 面板配置
    ("admin/panel-settings/view", "permission.admin.panel-settings.view", "查看面板配置"),
    ("admin/panel-settings/edit", "permission.admin.panel-settings.edit", "编辑面板配置"),
    # 通配符权限
    ("*", "permission.all", "所有权限"),
    ("admin/*", "permission.admin.all", "所有管理后台权限"),
    ("portal/*", "permission.portal.all", "所有用户面板权限"),
    ("admin/users/*", "permission.admin.users.all", "所有用户管理权限"),
    ("admin/content/*", "permission.admin.content.all", "所有内容管理权限"),
    ("admin/categories/*", "permission.admin.categories.all", "所有分类管理权限"),
    ("admin/cases/*", "permission.admin.cases.all", "所有案例管理权限"),
    ("admin/universities/*", "permission.admin.universities.all", "所有院校管理权限"),
    ("admin/roles/*", "permission.admin.roles.all", "所有角色管理权限"),
    ("admin/general-settings/*", "permission.admin.general-settings.all", "所有通用设置权限"),
    ("admin/web-settings/*", "permission.admin.web-settings.all", "所有网站设置权限"),
    ("admin/dashboard/*", "permission.admin.dashboard.all", "所有仪表盘权限"),
    ("admin/panel-settings/*", "permission.admin.panel-settings.all", "所有面板配置权限"),
    ("portal/overview/*", "permission.portal.overview.all", "所有概览权限"),
    ("portal/profile/*", "permission.portal.profile.all", "所有个人资料权限"),
    ("portal/documents/*", "permission.portal.documents.all", "所有文档权限"),
    ("portal/articles/*", "permission.portal.articles.all", "所有文章权限"),
]

# 系统角色定义：(name, description, [permission_codes], sort_order)
ROLES = [
    ("superuser", "超级管理员", ["*"], 0),
    ("website_admin", "网站管理员", ["admin/*", "portal/*"], 1),
    ("student_advisor", "留学顾问", ["admin/users/*", "admin/content/*", "admin/cases/*", "portal/*"], 2),
    ("student", "学员", ["portal/*"], 3),
    ("visitor", "访客", ["portal/profile/view"], 4),
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
