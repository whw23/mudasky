/**
 * W6 support 任务声明。
 * 权限：admin 联系人 + dashboard + portal 资料。
 */

import type { Task } from "../framework/types"
import register from "../fns/register"
import { verifyPermissionAllowed, verifyPermissionDenied } from "../fns/permission"
import { viewContactList, expandContact, markContactStatus, addContactNote } from "../fns/contacts"
import { verifyAdminSidebar, verifyDashboard } from "../fns/sidebar-nav"
import { viewProfile, editUsername } from "../fns/profile"

import setCookie from "../fns/set-cookie"
import reloadAuth from "../fns/reload-auth"
import { PHONES, TS } from "../constants"

export const tasks: Task[] = [
  // ── 设置 cookie ──
  {
    id: "w6_set_cookie",
    worker: "w6",
    name: "设置 internal_secret cookie",
    requires: [],
    fn: setCookie,
    fnArgs: {},
    coverage: { routes: [], api: [], components: [], security: [] },
  },

  // ── 注册 ──
  {
    id: "w6_register",
    worker: "w6",
    name: "support 注册",
    requires: ["w6_set_cookie"],
    fn: register,
    fnArgs: { phone: PHONES.w6, worker: "w6" },
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

  // ── 重新加载认证 ──
  {
    id: "w6_reload_auth",
    worker: "w6",
    name: "重新加载认证状态",
    requires: ["w6_register", "w1_assign_w6", "w1_refresh_w6"],
    fn: reloadAuth,
    fnArgs: { worker: "w6", phone: PHONES.w6 },
    coverage: { routes: [], api: [], components: [], security: [] },
  },

  // ── 正向：联系人管理 ──
  {
    id: "w6_view_contacts",
    worker: "w6",
    name: "查看联系人列表",
    requires: ["w6_reload_auth"],
    fn: viewContactList,
    coverage: {
      routes: ["/admin/contacts"],
      api: ["/api/admin/contacts/list"],
      components: [["ContactsPage", "contact-table"]],
    },
  },
  {
    id: "w6_expand_contact",
    worker: "w6",
    name: "展开联系人详情",
    requires: ["w6_view_contacts"],
    fn: expandContact,
    backupWorkers: ["w1", "w3"],
    coverage: {
      api: ["/api/admin/contacts/list/detail"],
      components: [
        ["ContactPanel", "basic-info"],
        ["ContactPanel", "mark-status"],
        ["ContactPanel", "add-note"],
      ],
    },
  },
  {
    id: "w6_mark_status",
    worker: "w6",
    name: "标记联系状态",
    requires: ["w6_expand_contact"],
    fn: markContactStatus,
    fnArgs: { status: "contacted" },
    backupWorkers: ["w1", "w3"],
    coverage: {
      api: ["/api/admin/contacts/list/detail/mark"],
      components: [["ContactPanel", "status-select"]],
    },
  },
  {
    id: "w6_add_note",
    worker: "w6",
    name: "添加联系备注",
    requires: ["w6_expand_contact"],
    fn: addContactNote,
    fnArgs: { note: `E2E-support-note-${TS}` },
    backupWorkers: ["w1", "w3"],
    coverage: {
      api: ["/api/admin/contacts/list/detail/note"],
      components: [["ContactPanel", "note-textarea"]],
    },
  },

  // ── 正向：仪表盘 ──
  {
    id: "w6_verify_dashboard",
    worker: "w6",
    name: "查看仪表盘",
    requires: ["w6_reload_auth"],
    fn: verifyDashboard,
    coverage: {
      routes: ["/admin/dashboard"],
      api: ["/api/admin/dashboard"],
      components: [
        ["Dashboard", "stats-cards"],
        ["Dashboard", "recent-records"],
        ["Dashboard", "quick-actions"],
      ],
    },
  },

  // ── 正向：侧边栏导航 ──
  {
    id: "w6_verify_sidebar",
    worker: "w6",
    name: "验证侧边栏菜单",
    requires: ["w6_reload_auth"],
    fn: verifyAdminSidebar,
    fnArgs: { role: "support" },
    coverage: {
      components: [["AdminSidebar", "nav-menu"]],
    },
  },

  // ── 正向：Portal 资料 ──
  {
    id: "w6_view_profile",
    worker: "w6",
    name: "查看个人资料",
    requires: ["w6_reload_auth"],
    fn: viewProfile,
    coverage: {
      routes: ["/portal/profile"],
      api: ["/api/portal/profile"],
      components: [["ProfilePage", "basic-info"]],
    },
  },
  {
    id: "w6_edit_username",
    worker: "w6",
    name: "修改用户名",
    requires: ["w6_view_profile"],
    fn: editUsername,
    fnArgs: { username: `E2E-Support-${TS}` },
    coverage: {
      api: ["/api/portal/profile/edit"],
      components: [["ProfilePage", "edit-button"]],
    },
  },

  // ── 反向：无权限页面被拒 ──
  {
    id: "w6_denied_articles",
    worker: "w6",
    name: "无权限访问文章管理",
    requires: ["w6_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/web-settings"],
    },
    coverage: {
      security: [["permission", "route-denied-articles"]],
    },
  },
  {
    id: "w6_denied_categories",
    worker: "w6",
    name: "无权限访问分类管理",
    requires: ["w6_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/web-settings"],
    },
    coverage: {
      security: [["permission", "route-denied-categories"]],
    },
  },
  {
    id: "w6_denied_cases",
    worker: "w6",
    name: "无权限访问案例管理",
    requires: ["w6_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/web-settings"],
    },
    coverage: {
      security: [["permission", "route-denied-cases"]],
    },
  },
  {
    id: "w6_denied_universities",
    worker: "w6",
    name: "无权限访问院校管理",
    requires: ["w6_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/web-settings"],
    },
    coverage: {
      security: [["permission", "route-denied-universities"]],
    },
  },
  {
    id: "w6_denied_users",
    worker: "w6",
    name: "无权限访问用户管理",
    requires: ["w6_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/users"],
    },
    coverage: {
      security: [["permission", "route-denied-users"]],
    },
  },
  {
    id: "w6_denied_roles",
    worker: "w6",
    name: "无权限访问角色管理",
    requires: ["w6_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/roles"],
    },
    coverage: {
      security: [["permission", "route-denied-roles"]],
    },
  },
  {
    id: "w6_denied_students",
    worker: "w6",
    name: "无权限访问学生管理",
    requires: ["w6_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/students"],
    },
    coverage: {
      security: [["permission", "route-denied-students"]],
    },
  },
  {
    id: "w6_denied_general_settings",
    worker: "w6",
    name: "无权限访问通用配置",
    requires: ["w6_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/general-settings"],
    },
    coverage: {
      security: [["permission", "route-denied-general-settings"]],
    },
  },
  {
    id: "w6_denied_web_settings",
    worker: "w6",
    name: "无权限访问网页设置",
    requires: ["w6_reload_auth"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/web-settings"],
    },
    coverage: {
      security: [["permission", "route-denied-web-settings"]],
    },
  },
]
