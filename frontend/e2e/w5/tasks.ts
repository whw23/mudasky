/**
 * W5 content_admin 任务声明。
 * 权限：admin 文章/分类/案例/院校/设置 + portal 资料。
 */

import type { Task } from "../framework/types"
import register from "../fns/register"
import { verifyPermissionAllowed, verifyPermissionDenied } from "../fns/permission"
import { createCategory, editCategory, deleteCategory } from "../fns/admin-crud"
import { createArticle, editArticle, deleteArticle } from "../fns/admin-crud"
import { createCase, editCase, deleteCase } from "../fns/admin-crud"
import { createUniversity, editUniversity, deleteUniversity } from "../fns/admin-crud"
import { verifyGeneralSettings, editGeneralSettings } from "../fns/settings"
import { verifyWebSettings, editWebSettings } from "../fns/settings"
import { verifyAdminSidebar, testAdminNavigation, verifyDashboard } from "../fns/sidebar-nav"
import { viewProfile, editUsername } from "../fns/profile"
import setCookie from "../fns/set-cookie"
import reloadAuth from "../fns/reload-auth"

import { PHONES, TS } from "../constants"

export const tasks: Task[] = [
  // ── 设置 cookie ──
  {
    id: "w5_set_cookie",
    worker: "w5",
    name: "设置 internal_secret cookie",
    requires: [],
    fn: setCookie,
    fnArgs: {},
    coverage: { routes: [], api: [], components: [], security: [] },
  },

  // ── 注册 ──
  {
    id: "w5_register",
    worker: "w5",
    name: "content_admin 注册",
    requires: ["w5_set_cookie"],
    fn: register,
    fnArgs: { phone: PHONES.w5, worker: "w5" },
    coverage: {
      routes: ["/"],
      api: ["/api/auth/sms-code", "/api/auth/login"],
      components: [
        ["AuthDialog", "dialog"],
        ["AuthDialog", "tab-sms"],
        ["AuthDialog", "tel-input"],
        ["AuthDialog", "code-input"],
      ],
      security: [["auth", "sms-register"]],
    },
  },

  // ── 重新加载认证（W1 赋权后 JWT 更新） ──
  {
    id: "w5_reload_auth",
    worker: "w5",
    name: "重新加载认证状态",
    requires: ["w5_register", "w1_assign_w5", "w1_refresh_w5"],
    fn: reloadAuth,
    fnArgs: { worker: "w5" },
    coverage: { routes: [], api: [], components: [], security: [] },
  },

  // ── 正向：分类管理 ──
  {
    id: "w5_create_category",
    worker: "w5",
    name: "创建分类",
    requires: ["w5_reload_auth"],
    fn: createCategory,
    fnArgs: {
      name: `E2E-分类-${TS}`,
      slug: `e2e-cat-${TS}`,
      description: "E2E测试分类",
      sortOrder: 100,
    },
    coverage: {
      routes: ["/admin/categories"],
      api: ["/api/admin/categories/list", "/api/admin/categories/list/create"],
      components: [
        ["CategoriesPage", "create-button"],
        ["CategoryDialog", "name-input"],
        ["CategoryDialog", "slug-input"],
      ],
    },
  },
  {
    id: "w5_edit_category",
    worker: "w5",
    name: "编辑分类",
    requires: ["w5_create_category"],
    fn: editCategory,
    fnArgs: {
      oldName: `E2E-分类-${TS}`,
      newName: `E2E-分类-${TS}-edited`,
    },
    coverage: {
      api: ["/api/admin/categories/list/detail/edit"],
      components: [["CategoryDialog", "edit-button"]],
    },
  },
  {
    id: "w5_delete_category",
    worker: "w5",
    name: "删除分类",
    requires: ["w5_edit_category"],
    fn: deleteCategory,
    fnArgs: { name: `E2E-分类-${TS}-edited` },
    coverage: {
      api: ["/api/admin/categories/list/detail/delete"],
      components: [["CategoryDialog", "delete-button"]],
    },
  },

  // ── 正向：文章管理 ──
  {
    id: "w5_create_article",
    worker: "w5",
    name: "创建文章",
    requires: ["w5_reload_auth"],
    fn: createArticle,
    fnArgs: {
      title: `E2E-文章-${TS}`,
      slug: `e2e-article-${TS}`,
      content: "E2E测试文章内容",
    },
    coverage: {
      routes: ["/admin/articles"],
      api: ["/api/admin/articles/list", "/api/admin/articles/list/create"],
      components: [
        ["ArticlesPage", "create-button"],
        ["ArticleDialog", "title-input"],
        ["ArticleDialog", "slug-input"],
        ["ArticleDialog", "content-input"],
      ],
    },
  },
  {
    id: "w5_edit_article",
    worker: "w5",
    name: "编辑文章",
    requires: ["w5_create_article"],
    fn: editArticle,
    fnArgs: {
      oldTitle: `E2E-文章-${TS}`,
      newTitle: `E2E-文章-${TS}-edited`,
    },
    coverage: {
      api: ["/api/admin/articles/list/detail/edit"],
      components: [["ArticleDialog", "edit-button"]],
    },
  },
  {
    id: "w5_delete_article",
    worker: "w5",
    name: "删除文章",
    requires: ["w5_edit_article"],
    fn: deleteArticle,
    fnArgs: { title: `E2E-文章-${TS}-edited` },
    coverage: {
      api: ["/api/admin/articles/list/detail/delete"],
      components: [["ArticleDialog", "delete-button"]],
    },
  },

  // ── 正向：案例管理 ──
  {
    id: "w5_create_case",
    worker: "w5",
    name: "创建案例",
    requires: ["w5_reload_auth"],
    fn: createCase,
    fnArgs: {
      studentName: `E2E-学生-${TS}`,
      university: "E2E大学",
      program: "计算机科学",
      year: 2026,
    },
    coverage: {
      routes: ["/admin/cases"],
      api: ["/api/admin/cases/list", "/api/admin/cases/list/create"],
      components: [
        ["CasesPage", "create-button"],
        ["CaseDialog", "student-name-input"],
        ["CaseDialog", "university-input"],
      ],
    },
  },
  {
    id: "w5_edit_case",
    worker: "w5",
    name: "编辑案例",
    requires: ["w5_create_case"],
    fn: editCase,
    fnArgs: {
      studentName: `E2E-学生-${TS}`,
      newUniversity: "E2E大学-edited",
    },
    coverage: {
      api: ["/api/admin/cases/list/detail/edit"],
      components: [["CaseDialog", "edit-button"]],
    },
  },
  {
    id: "w5_delete_case",
    worker: "w5",
    name: "删除案例",
    requires: ["w5_edit_case"],
    fn: deleteCase,
    fnArgs: { studentName: `E2E-学生-${TS}` },
    coverage: {
      api: ["/api/admin/cases/list/detail/delete"],
      components: [["CaseDialog", "delete-button"]],
    },
  },

  // ── 正向：院校管理 ──
  {
    id: "w5_create_university",
    worker: "w5",
    name: "创建院校",
    requires: ["w5_reload_auth"],
    fn: createUniversity,
    fnArgs: {
      name: `E2E-院校-${TS}`,
      nameEn: `E2E-University-${TS}`,
      country: "中国",
      city: "北京",
    },
    coverage: {
      routes: ["/admin/universities"],
      api: ["/api/admin/universities/list", "/api/admin/universities/list/create"],
      components: [
        ["UniversitiesPage", "create-button"],
        ["UniversityDialog", "name-input"],
        ["UniversityDialog", "name-en-input"],
      ],
    },
  },
  {
    id: "w5_edit_university",
    worker: "w5",
    name: "编辑院校",
    requires: ["w5_create_university"],
    fn: editUniversity,
    fnArgs: {
      name: `E2E-院校-${TS}`,
      newCity: "上海",
    },
    coverage: {
      api: ["/api/admin/universities/list/detail/edit"],
      components: [["UniversityDialog", "edit-button"]],
    },
  },
  {
    id: "w5_delete_university",
    worker: "w5",
    name: "删除院校",
    requires: ["w5_edit_university"],
    fn: deleteUniversity,
    fnArgs: { name: `E2E-院校-${TS}` },
    coverage: {
      api: ["/api/admin/universities/list/detail/delete"],
      components: [["UniversityDialog", "delete-button"]],
    },
  },

  // ── 正向：通用配置 ──
  {
    id: "w5_verify_general_settings",
    worker: "w5",
    name: "查看通用配置",
    requires: ["w5_reload_auth"],
    fn: verifyGeneralSettings,
    coverage: {
      routes: ["/admin/general-settings"],
      api: ["/api/admin/general-settings/list"],
      components: [["GeneralSettingsPage", "config-section"]],
    },
  },
  {
    id: "w5_edit_general_settings",
    worker: "w5",
    name: "编辑通用配置并回滚",
    requires: ["w5_verify_general_settings"],
    fn: editGeneralSettings,
    fnArgs: {
      configKey: "site_info",
      field: "hotline",
      newValue: `400-TEST-${TS}`,
    },
    coverage: {
      api: ["/api/admin/general-settings/list/detail/edit"],
      components: [["EditableOverlay", "edit-button"]],
    },
  },

  // ── 正向：网页设置 ──
  {
    id: "w5_verify_web_settings",
    worker: "w5",
    name: "查看网页设置",
    requires: ["w5_reload_auth"],
    fn: verifyWebSettings,
    coverage: {
      routes: ["/admin/web-settings"],
      api: ["/api/admin/web-settings/list"],
      components: [["WebSettingsPage", "config-section"]],
    },
  },
  {
    id: "w5_edit_web_settings",
    worker: "w5",
    name: "编辑网页设置并回滚",
    requires: ["w5_verify_web_settings"],
    fn: editWebSettings,
    fnArgs: {
      configKey: "site_info",
      field: "tagline",
      newValue: `E2E-标语-${TS}`,
    },
    coverage: {
      api: ["/api/admin/web-settings/list/detail/edit"],
      components: [["EditableOverlay", "save-button"]],
    },
  },

  // ── 正向：Portal 资料 ──
  {
    id: "w5_view_profile",
    worker: "w5",
    name: "查看个人资料",
    requires: ["w5_reload_auth"],
    fn: viewProfile,
    coverage: {
      routes: ["/portal/profile"],
      api: ["/api/portal/profile"],
      components: [["ProfilePage", "basic-info"]],
    },
  },
  {
    id: "w5_edit_username",
    worker: "w5",
    name: "修改用户名",
    requires: ["w5_view_profile"],
    fn: editUsername,
    fnArgs: { username: `E2E-Content-${TS}` },
    coverage: {
      api: ["/api/portal/profile/edit"],
      components: [["ProfilePage", "edit-button"]],
    },
  },

  // ── 正向：侧边栏导航 ──
  {
    id: "w5_verify_sidebar",
    worker: "w5",
    name: "验证侧边栏菜单",
    requires: ["w5_reload_auth"],
    fn: verifyAdminSidebar,
    fnArgs: { role: "content_admin" },
    coverage: {
      routes: ["/admin/dashboard"],
      api: ["/api/admin/dashboard"],
      components: [["AdminSidebar", "nav-menu"]],
    },
  },
  {
    id: "w5_test_navigation",
    worker: "w5",
    name: "测试侧边栏导航",
    requires: ["w5_verify_sidebar"],
    fn: testAdminNavigation,
    coverage: {
      routes: [
        "/admin/articles",
        "/admin/categories",
        "/admin/cases",
        "/admin/universities",
        "/admin/general-settings",
        "/admin/web-settings",
      ],
      components: [["AdminSidebar", "nav-links"]],
    },
  },
  {
    id: "w5_verify_dashboard",
    worker: "w5",
    name: "验证仪表盘",
    requires: ["w5_verify_sidebar"],
    fn: verifyDashboard,
    coverage: {
      components: [
        ["Dashboard", "stats-cards"],
        ["Dashboard", "recent-records"],
        ["Dashboard", "quick-actions"],
      ],
    },
  },

  // ── 反向：无权限页面被拒 ──
  {
    id: "w5_denied_users",
    worker: "w5",
    name: "无权限访问用户管理",
    requires: ["w5_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/users"],
    },
    coverage: {
      security: [["permission", "route-denied-users"]],
    },
  },
  {
    id: "w5_denied_roles",
    worker: "w5",
    name: "无权限访问角色管理",
    requires: ["w5_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/roles"],
    },
    coverage: {
      security: [["permission", "route-denied-roles"]],
    },
  },
  {
    id: "w5_denied_students",
    worker: "w5",
    name: "无权限访问学生管理",
    requires: ["w5_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/students"],
    },
    coverage: {
      security: [["permission", "route-denied-students"]],
    },
  },
  {
    id: "w5_denied_contacts",
    worker: "w5",
    name: "无权限访问联系人管理",
    requires: ["w5_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/contacts"],
    },
    coverage: {
      security: [["permission", "route-denied-contacts"]],
    },
  },
]
