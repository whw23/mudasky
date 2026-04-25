/**
 * W1 任务声明：superuser (管理员)
 *
 * 职责：
 * - 使用账号密码登录（环境变量中的种子用户）
 * - 为其他 worker 分配角色并刷新 token
 * - 创建 CRUD 种子数据（分类、文章、案例、院校）
 * - 角色管理（创建/编辑/删除自定义角色）
 * - 用户管理（搜索、禁用/启用、配额、密码重置、强制登出、删除）
 * - 设置管理（通用配置、网页设置）
 * - 安全测试（CSRF、XSS、SQL 注入、输入验证）
 * - 侧边栏导航和仪表盘验证
 * - 协调 W7 临时账号的禁用/启用测试
 */

import type { Task } from "../framework/types"
import setCookie from "../fns/set-cookie"
import register from "../fns/register"
import reloadAuth from "../fns/reload-auth"
import logout from "../fns/logout"
import assignRole from "../fns/assign-role"
import refreshToken from "../fns/refresh-token"
import {
  createCategory,
  editCategory,
  deleteCategory,
  createArticle,
  editArticle,
  deleteArticle,
  createCase,
  editCase,
  deleteCase,
  createUniversity,
  editUniversity,
  deleteUniversity,
} from "../fns/admin-crud"
import {
  createRole,
  editRole,
  deleteRole,
  verifyRoleList,
  viewRoleDetail,
} from "../fns/role-management"
import {
  searchUser,
  toggleUserStatus,
  editUserQuota,
  resetPassword,
  forceLogout,
  deleteUser,
} from "../fns/user-management"
import {
  verifyGeneralSettings,
  editGeneralSettings,
  verifyWebSettings,
  editWebSettings,
} from "../fns/settings"
import {
  checkHealth,
  fetchMetaRoutes,
  fetchVersion,
} from "../fns/health-meta"
import {
  assignAdvisor,
  downgradeStudent,
} from "../fns/students"
import {
  testCsrf,
  testXss,
  testSqlInjection,
  testInputValidation,
} from "../fns/security"
import {
  verifyAdminSidebar,
  testAdminNavigation,
  verifyDashboard,
  verifyMenuHighlight,
} from "../fns/sidebar-nav"

import { PHONES, TS } from "../constants"

export const tasks: Task[] = [
  /* ── 初始化 ── */
  {
    id: "w1_set_cookie",
    worker: "w1",
    name: "设置 internal_secret cookie",
    requires: [],
    fn: setCookie,
    fnArgs: {},
    coverage: {
      routes: [],
      api: [],
      components: [],
      security: [],
    },
  },
  {
    id: "w1_register",
    worker: "w1",
    name: "W1 注册 E2E 账号",
    requires: ["w1_set_cookie"],
    fn: register,
    fnArgs: {
      phone: PHONES.w1,
      worker: "w1",
    },
    coverage: {
      routes: ["/"],
      api: ["/api/auth/sms-code", "/api/auth/register"],
      components: ["RegisterForm"],
      security: ["sms-registration"],
    },
  },
  {
    id: "w1_refresh_superuser",
    worker: "w1",
    name: "W1 刷新 token 获取 superuser 权限",
    requires: ["w7_assign_superuser_w1"],
    fn: reloadAuth,
    fnArgs: { phone: PHONES.w1, worker: "w1" },
    coverage: {
      routes: [],
      api: ["/api/auth/sms-code", "/api/auth/login"],
      components: [],
      security: ["role-upgrade-refresh"],
    },
  },

  /* ── 角色分配（为其他 worker 赋权） ── */
  {
    id: "w1_assign_role_w2",
    worker: "w1",
    name: "为 W2 分配 student 角色",
    requires: ["w1_refresh_superuser", "w2_register"],
    fn: assignRole,
    fnArgs: {
      phone: PHONES.w2,
      roleName: "student",
    },
    coverage: {
      routes: ["/admin/users"],
      api: ["/admin/users/list", "/admin/users/list/detail", "/admin/users/list/detail/role"],
      components: ["UserList", "UserDetailPanel"],
      security: ["role-assignment"],
    },
  },
  {
    id: "w1_refresh_token_w2",
    worker: "w1",
    name: "刷新 W2 token",
    requires: ["w1_assign_role_w2"],
    fn: refreshToken,
    fnArgs: { worker: "w2" },
    coverage: {
      routes: [],
      api: ["/api/auth/refresh"],
      components: [],
      security: ["token-refresh"],
    },
  },
  {
    id: "w1_assign_role_w3",
    worker: "w1",
    name: "为 W3 分配 advisor 角色",
    requires: ["w1_refresh_superuser", "w3_register"],
    fn: assignRole,
    fnArgs: {
      phone: PHONES.w3,
      roleName: "advisor",
    },
    coverage: {
      routes: ["/admin/users"],
      api: ["/admin/users/list", "/admin/users/list/detail", "/admin/users/list/detail/role"],
      components: ["UserList", "UserDetailPanel"],
      security: ["role-assignment"],
    },
  },
  {
    id: "w1_refresh_token_w3",
    worker: "w1",
    name: "刷新 W3 token",
    requires: ["w1_assign_role_w3"],
    fn: refreshToken,
    fnArgs: { worker: "w3" },
    coverage: {
      routes: [],
      api: ["/api/auth/refresh"],
      components: [],
      security: ["token-refresh"],
    },
  },

  /* ── W5 content_admin 角色分配 ── */
  {
    id: "w1_assign_w5",
    worker: "w1",
    name: "为 W5 分配 content_admin 角色",
    requires: ["w1_refresh_superuser", "w5_register"],
    fn: assignRole,
    fnArgs: {
      phone: PHONES.w5,
      roleName: "content_admin",
    },
    coverage: {
      routes: ["/admin/users"],
      api: ["/admin/users/list", "/admin/users/list/detail/role"],
      components: ["UserDetailPanel"],
      security: ["role-assignment"],
    },
  },
  {
    id: "w1_refresh_w5",
    worker: "w1",
    name: "刷新 W5 token",
    requires: ["w1_assign_w5"],
    fn: refreshToken,
    fnArgs: { worker: "w5" },
    coverage: {
      routes: [],
      api: ["/api/auth/refresh"],
      components: [],
      security: ["token-refresh"],
    },
  },

  /* ── W6 support 角色分配 ── */
  {
    id: "w1_assign_w6",
    worker: "w1",
    name: "为 W6 分配 support 角色",
    requires: ["w1_refresh_superuser", "w6_register"],
    fn: assignRole,
    fnArgs: {
      phone: PHONES.w6,
      roleName: "support",
    },
    coverage: {
      routes: ["/admin/users"],
      api: ["/admin/users/list", "/admin/users/list/detail/role"],
      components: ["UserDetailPanel"],
      security: ["role-assignment"],
    },
  },
  {
    id: "w1_refresh_w6",
    worker: "w1",
    name: "刷新 W6 token",
    requires: ["w1_assign_w6"],
    fn: refreshToken,
    fnArgs: { worker: "w6" },
    coverage: {
      routes: [],
      api: ["/api/auth/refresh"],
      components: [],
      security: ["token-refresh"],
    },
  },

  /* ── CRUD 业务操作 ── */
  {
    id: "w1_crud_category_create",
    worker: "w1",
    name: "创建分类",
    requires: ["w1_refresh_superuser"],
    fn: createCategory,
    fnArgs: {
      name: `E2E_239_分类W1-${TS}`,
      slug: `e2e-239-cat-w1-${TS}`,
      description: "E2E_239_测试分类",
      sortOrder: 10,
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/nav/list", "/admin/web-settings/nav/add-item"],
      components: [["NavEditor", "add-button"], ["AddNavItemDialog", "name-input"]],
      security: [],
    },
  },
  {
    id: "w1_crud_category_delete",
    worker: "w1",
    name: "删除分类",
    requires: ["w1_crud_category_create"],
    fn: deleteCategory,
    fnArgs: {
      name: `E2E_239_分类W1-${TS}`,
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/nav/remove-item"],
      components: [["NavEditor", "remove-button"]],
      security: [],
    },
  },

  {
    id: "w1_crud_article_create",
    worker: "w1",
    name: "创建文章",
    requires: ["w1_refresh_superuser"],
    fn: createArticle,
    fnArgs: {
      title: `E2E_239_文章-${TS}`,
      slug: `e2e-239-article-${TS}`,
      content: "E2E_239_测试文章内容",
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/articles/list", "/admin/web-settings/articles/list/create"],
      components: ["ArticleList", "ArticleDialog"],
      security: [],
    },
  },
  {
    id: "w1_crud_article_edit",
    worker: "w1",
    name: "编辑文章",
    requires: ["w1_crud_article_create"],
    fn: editArticle,
    fnArgs: {
      oldTitle: `E2E_239_文章-${TS}`,
      newTitle: `E2E_239_文章-${TS}-edited`,
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/articles/list/detail/edit"],
      components: ["ArticleDialog"],
      security: [],
    },
  },
  {
    id: "w1_crud_article_delete",
    worker: "w1",
    name: "删除文章",
    requires: ["w1_crud_article_edit"],
    fn: deleteArticle,
    fnArgs: {
      title: `E2E_239_文章-${TS}-edited`,
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/articles/list/detail/delete"],
      components: ["ArticleList"],
      security: [],
    },
  },

  {
    id: "w1_crud_case_create",
    worker: "w1",
    name: "创建案例",
    requires: ["w1_refresh_superuser"],
    fn: createCase,
    fnArgs: {
      studentName: `E2E_239_学生-${TS}`,
      university: "E2E_239_大学",
      program: "E2E_239_专业",
      year: 2026,
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/cases/list", "/admin/web-settings/cases/list/create"],
      components: ["CaseList", "CaseDialog"],
      security: [],
    },
  },
  {
    id: "w1_crud_case_edit",
    worker: "w1",
    name: "编辑案例",
    requires: ["w1_crud_case_create"],
    fn: editCase,
    fnArgs: {
      studentName: `E2E_239_学生-${TS}`,
      newUniversity: "E2E_239_大学-edited",
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/cases/list/detail/edit"],
      components: ["CaseDialog"],
      security: [],
    },
  },
  {
    id: "w1_crud_case_delete",
    worker: "w1",
    name: "删除案例",
    requires: ["w1_crud_case_edit"],
    fn: deleteCase,
    fnArgs: {
      studentName: `E2E_239_学生-${TS}`,
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/cases/list/detail/delete"],
      components: ["CaseList"],
      security: [],
    },
  },

  {
    id: "w1_crud_university_create",
    worker: "w1",
    name: "创建院校",
    requires: ["w1_refresh_superuser"],
    fn: createUniversity,
    fnArgs: {
      name: `E2E_239_院校-${TS}`,
      nameEn: `E2E_239_University-${TS}`,
      country: "E2E_239_国家",
      city: "E2E_239_城市",
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/universities/list", "/admin/web-settings/universities/list/create"],
      components: ["UniversityList", "UniversityDialog"],
      security: [],
    },
  },
  {
    id: "w1_crud_university_edit",
    worker: "w1",
    name: "编辑院校",
    requires: ["w1_crud_university_create"],
    fn: editUniversity,
    fnArgs: {
      name: `E2E_239_院校-${TS}`,
      newCity: "E2E_239_城市-edited",
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/universities/list/detail/edit"],
      components: ["UniversityDialog"],
      security: [],
    },
  },
  {
    id: "w1_crud_university_delete",
    worker: "w1",
    name: "删除院校",
    requires: ["w1_crud_university_edit"],
    fn: deleteUniversity,
    fnArgs: {
      name: `E2E_239_院校-${TS}`,
    },
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/universities/list/detail/delete"],
      components: ["UniversityList"],
      security: [],
    },
  },

  /* ── 基础设施端点 ── */
  {
    id: "w1_health_check",
    worker: "w1",
    name: "健康检查",
    requires: ["w1_refresh_superuser"],
    fn: checkHealth,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/api/health"],
      components: [],
      security: [],
    },
  },
  {
    id: "w1_version",
    worker: "w1",
    name: "获取版本信息",
    requires: ["w1_refresh_superuser"],
    fn: fetchVersion,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/api/version"],
      components: [],
      security: [],
    },
  },

  /* ── 角色管理 ── */
  {
    id: "w1_role_list",
    worker: "w1",
    name: "验证角色列表",
    requires: ["w1_refresh_superuser"],
    fn: verifyRoleList,
    fnArgs: {},
    coverage: {
      routes: ["/admin/roles"],
      api: ["/admin/roles/list"],
      components: ["RoleList"],
      security: [],
    },
  },
  {
    id: "w1_role_create",
    worker: "w1",
    name: "创建自定义角色",
    requires: ["w1_role_list"],
    fn: createRole,
    fnArgs: {
      name: `E2E_239_role-${TS}`,
      description: "E2E_239_测试角色",
      permissions: ["public/*"],
    },
    coverage: {
      routes: ["/admin/roles"],
      api: ["/admin/roles/list/create"],
      components: ["RoleDialog", "PermissionTree"],
      security: [],
    },
  },
  {
    id: "w1_role_edit",
    worker: "w1",
    name: "编辑角色",
    requires: ["w1_role_create"],
    fn: editRole,
    fnArgs: {
      oldName: `E2E_239_role-${TS}`,
      newName: `E2E_239_role-${TS}-edited`,
      newDescription: "E2E_239_测试角色-edited",
    },
    coverage: {
      routes: ["/admin/roles"],
      api: ["/admin/roles/list/detail/edit"],
      components: ["RoleDialog"],
      security: [],
    },
  },
  {
    id: "w1_role_delete",
    worker: "w1",
    name: "删除自定义角色",
    requires: ["w1_role_edit"],
    fn: deleteRole,
    fnArgs: {
      name: `E2E_239_role-${TS}-edited`,
      expectFail: false,
    },
    coverage: {
      routes: ["/admin/roles"],
      api: ["/admin/roles/list/detail/delete"],
      components: ["RoleList"],
      security: [],
    },
  },
  {
    id: "w1_role_detail",
    worker: "w1",
    name: "查看角色详情",
    requires: ["w1_role_list"],
    fn: viewRoleDetail,
    fnArgs: { name: "visitor" },
    coverage: {
      routes: ["/admin/roles"],
      api: ["/admin/roles/meta"],
      components: ["RoleDialog"],
      security: [],
    },
  },
  {
    id: "w1_role_delete_protected",
    worker: "w1",
    name: "删除受保护角色（应失败）",
    requires: ["w1_role_list"],
    fn: deleteRole,
    fnArgs: {
      name: "superuser",
      expectFail: true,
    },
    coverage: {
      routes: ["/admin/roles"],
      api: ["/admin/roles/list/detail/delete"],
      components: ["RoleList"],
      security: ["protected-role-delete"],
    },
  },

  /* ── 用户管理 ── */
  {
    id: "w1_user_search",
    worker: "w1",
    name: "搜索用户",
    requires: ["w1_refresh_superuser", "w2_register"],
    fn: searchUser,
    fnArgs: {
      keyword: "13900002002",
      expectFound: true,
    },
    coverage: {
      routes: ["/admin/users"],
      api: ["/admin/users/list"],
      components: ["UserList", "SearchInput"],
      security: [],
    },
  },
  {
    id: "w1_user_quota",
    worker: "w1",
    name: "编辑用户配额",
    requires: ["w1_user_search"],
    fn: editUserQuota,
    fnArgs: {
      phone: PHONES.w2,
      quota: 200,
    },
    coverage: {
      routes: ["/admin/users"],
      api: ["/admin/users/list/detail/quota"],
      components: ["UserDetailPanel"],
      security: [],
    },
  },

  /* ── 用户管理：高级操作 ── */
  {
    id: "w1_delete_temp_user",
    worker: "w1",
    name: "删除临时账号",
    requires: ["w1_enable_temp"],
    fn: deleteUser,
    fnArgs: { keyword: PHONES.w7_disabled },
    coverage: {
      routes: ["/admin/users"],
      api: ["/api/admin/users/list/detail/delete"],
      components: [["UserExpandPanel", "删除确认"]],
      security: [],
    },
  },
  {
    id: "w1_user_reset_password",
    worker: "w1",
    name: "重置用户密码",
    requires: ["w1_enable_temp"],
    fn: resetPassword,
    fnArgs: {
      phone: PHONES.w7_disabled,
      newPassword: "E2E_TempReset123!",
    },
    coverage: {
      routes: ["/admin/users"],
      api: ["/admin/users/list/detail/reset-password"],
      components: ["UserDetailPanel"],
      security: ["admin-reset-password"],
    },
  },
  {
    id: "w1_user_force_logout",
    worker: "w1",
    name: "强制登出用户",
    requires: ["w1_enable_temp"],
    fn: forceLogout,
    fnArgs: { phone: PHONES.w7_disabled },
    coverage: {
      routes: ["/admin/users"],
      api: ["/admin/users/list/detail/force-logout"],
      components: ["UserDetailPanel"],
      security: ["admin-force-logout"],
    },
  },

  /* ── 学生管理（superuser） ── */
  {
    id: "w1_student_assign_advisor",
    worker: "w1",
    name: "分配顾问给学生",
    requires: ["w1_refresh_superuser", "w1_assign_role_w2", "w1_assign_role_w3"],
    fn: assignAdvisor,
    fnArgs: {},
    coverage: {
      routes: ["/admin/students"],
      api: ["/admin/students/list/detail/assign-advisor"],
      components: ["StudentDetailPanel"],
      security: [],
    },
  },
  {
    id: "w1_student_downgrade",
    worker: "w1",
    name: "降级学生为访客",
    requires: ["w1_student_assign_advisor", "w2_logout"],
    fn: downgradeStudent,
    fnArgs: {},
    coverage: {
      routes: ["/admin/students"],
      api: ["/admin/students/list/detail/downgrade"],
      components: ["StudentDetailPanel"],
      security: ["student-downgrade"],
    },
  },

  /* ── 设置管理 ── */
  {
    id: "w1_general_settings",
    worker: "w1",
    name: "验证通用配置",
    requires: ["w1_refresh_superuser"],
    fn: verifyGeneralSettings,
    fnArgs: {},
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/list"],
      components: ["GeneralSettings"],
      security: [],
    },
  },
  {
    id: "w1_general_settings_edit",
    worker: "w1",
    name: "编辑通用配置",
    requires: ["w1_general_settings"],
    fn: editGeneralSettings,
    fnArgs: {},
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/list/edit"],
      components: ["GeneralSettings"],
      security: [],
    },
  },
  {
    id: "w1_web_settings",
    worker: "w1",
    name: "验证网页设置",
    requires: ["w1_refresh_superuser"],
    fn: verifyWebSettings,
    fnArgs: {},
    backupWorkers: ["w5"],
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/admin/web-settings/list"],
      components: ["WebSettings"],
      security: [],
    },
  },

  /* ── 安全测试 ── */
  {
    id: "w1_security_csrf",
    worker: "w1",
    name: "CSRF 防护测试",
    requires: ["w1_refresh_superuser"],
    fn: testCsrf,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/admin/web-settings/categories/list"],
      components: [],
      security: ["csrf-protection"],
    },
  },
  {
    id: "w1_security_xss",
    worker: "w1",
    name: "XSS 防护测试",
    requires: ["w1_refresh_superuser"],
    fn: testXss,
    fnArgs: {
      payload: '<script>alert("xss")</script>',
    },
    coverage: {
      routes: [],
      api: ["/admin/users/list"],
      components: [],
      security: ["xss-protection"],
    },
  },
  {
    id: "w1_security_sql_injection",
    worker: "w1",
    name: "SQL 注入防护测试",
    requires: ["w1_refresh_superuser"],
    fn: testSqlInjection,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/api/auth/sms-code", "/admin/users/list"],
      components: [],
      security: ["sql-injection-protection"],
    },
  },
  {
    id: "w1_security_input_validation",
    worker: "w1",
    name: "输入验证测试",
    requires: ["w1_refresh_superuser"],
    fn: testInputValidation,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/admin/web-settings/categories/list/create", "/admin/users/list/detail"],
      components: [],
      security: ["input-validation"],
    },
  },

  /* ── 侧边栏和导航 ── */
  {
    id: "w1_sidebar_verify",
    worker: "w1",
    name: "验证管理员侧边栏",
    requires: ["w1_refresh_superuser"],
    fn: verifyAdminSidebar,
    fnArgs: {
      role: "superuser",
    },
    coverage: {
      routes: ["/admin/dashboard"],
      api: [],
      components: ["AdminSidebar"],
      security: [],
    },
  },
  {
    id: "w1_navigation_test",
    worker: "w1",
    name: "测试管理员导航",
    requires: ["w1_sidebar_verify"],
    fn: testAdminNavigation,
    fnArgs: {},
    coverage: {
      routes: [
        "/admin/users",
        "/admin/roles",
        "/admin/web-settings",
      ],
      api: [],
      components: ["AdminSidebar"],
      security: [],
    },
  },
  {
    id: "w1_dashboard_verify",
    worker: "w1",
    name: "验证仪表盘",
    requires: ["w1_refresh_superuser"],
    fn: verifyDashboard,
    fnArgs: {},
    coverage: {
      routes: ["/admin/dashboard"],
      api: ["/admin/dashboard/stats"],
      components: ["Dashboard", "StatCard"],
      security: [],
    },
  },
  {
    id: "w1_menu_highlight",
    worker: "w1",
    name: "验证菜单高亮",
    requires: ["w1_sidebar_verify"],
    fn: verifyMenuHighlight,
    fnArgs: {
      menuName: "用户管理",
      path: "/admin/users",
    },
    coverage: {
      routes: ["/admin/users"],
      api: [],
      components: ["AdminSidebar"],
      security: [],
    },
  },

  /* ── W7 协调：禁用/启用临时账号 ── */
  {
    id: "w1_disable_temp",
    worker: "w1",
    name: "禁用 W7 临时账号",
    requires: ["w1_refresh_superuser", "w7_reg_disable"],
    fn: toggleUserStatus,
    fnArgs: { phone: PHONES.w7_disabled, disable: true },
    coverage: {
      routes: ["/admin/users"],
      api: ["/admin/users/list/detail/edit"],
      components: ["UserDetailPanel"],
      security: ["disable-user"],
    },
  },
  {
    id: "w1_enable_temp",
    worker: "w1",
    name: "启用 W7 临时账号",
    requires: ["w7_verify_disabled"],
    fn: toggleUserStatus,
    fnArgs: { phone: PHONES.w7_disabled, disable: false },
    coverage: {
      routes: ["/admin/users"],
      api: ["/admin/users/list/detail/edit"],
      components: ["UserDetailPanel"],
      security: ["enable-user"],
    },
  },

  /* ── 登出 ── */
  {
    id: "w1_logout",
    worker: "w1",
    name: "超级管理员登出",
    requires: ["w1_refresh_superuser"],
    fn: logout,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/api/auth/logout"],
      components: ["Header"],
      security: ["logout"],
    },
  },
]
