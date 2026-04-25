/**
 * W3 任务声明：advisor (顾问)
 *
 * 职责：
 * - 手机号验证码注册
 * - 学生管理（列表、筛选、展开、编辑备注）
 * - 学生文档查看（依赖 W2 上传文档）
 * - 联系人管理（列表、展开、标记状态、添加备注）
 * - 权限测试（正向：admin/students+contacts；反向：admin/users+articles+roles）
 * - Advisor 侧边栏导航
 */

import type { Task } from "../framework/types"
import setCookie from "../fns/set-cookie"
import register from "../fns/register"
import logout from "../fns/logout"
import {
  viewStudentList,
  toggleMyStudentsFilter,
  editStudentNote,
  viewStudentDocumentDetail,
  downloadStudentDocument,
} from "../fns/students"
import {
  viewStudentDocuments,
} from "../fns/student-docs"
import {
  viewContactList,
  expandContact,
  markContactStatus,
  addContactNote,
  upgradeContactToStudent,
} from "../fns/contacts"
import {
  verifyPermissionAllowed,
  verifyPermissionDenied,
  verifyApiDenied,
} from "../fns/permission"
import {
  verifyAdminSidebar,
} from "../fns/sidebar-nav"

import reloadAuth from "../fns/reload-auth"
import { PHONES, TS } from "../constants"
const W3_PHONE = PHONES.w3

export const tasks: Task[] = [
  /* ── 初始化 ── */
  {
    id: "w3_set_cookie",
    worker: "w3",
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
    id: "w3_register",
    worker: "w3",
    name: "顾问用户注册",
    requires: ["w3_set_cookie"],
    fn: register,
    fnArgs: {
      phone: W3_PHONE,
      worker: "w3",
    },
    coverage: {
      routes: ["/"],
      api: ["/api/auth/sms-code", "/api/auth/register"],
      components: ["LoginDialog", "SmsLoginForm"],
      security: ["sms-registration"],
    },
  },

  /* ── 重新加载认证 ── */
  {
    id: "w3_reload_auth",
    worker: "w3",
    name: "重新加载认证状态",
    requires: ["w3_register", "w1_assign_role_w3", "w1_refresh_token_w3"],
    fn: reloadAuth,
    fnArgs: { worker: "w3", phone: PHONES.w3 },
    coverage: { routes: [], api: [], components: [], security: [] },
  },

  /* ── 学生管理 ── */
  {
    id: "w3_students_view",
    worker: "w3",
    name: "查看学生列表",
    requires: ["w3_reload_auth"],
    fn: viewStudentList,
    fnArgs: {},
    coverage: {
      routes: ["/admin/students"],
      api: ["/admin/students/list"],
      components: ["StudentList"],
      security: [],
    },
  },
  {
    id: "w3_students_filter_toggle",
    worker: "w3",
    name: "切换仅我的学生筛选",
    requires: ["w3_students_view"],
    fn: toggleMyStudentsFilter,
    fnArgs: {},
    backupWorkers: ["w1"],
    coverage: {
      routes: ["/admin/students"],
      api: ["/admin/students/list"],
      components: ["StudentFilter"],
      security: [],
    },
  },
  {
    id: "w3_students_edit_note",
    worker: "w3",
    name: "编辑学生备注",
    requires: ["w3_students_view"],
    fn: editStudentNote,
    fnArgs: {
      note: `E2E-advisor-note-${TS}`,
    },
    backupWorkers: ["w1"],
    coverage: {
      routes: ["/admin/students"],
      api: ["/admin/students/list/detail", "/admin/students/list/detail/edit"],
      components: ["StudentDetailPanel"],
      security: [],
    },
  },

  /* ── 学生文档查看（依赖 W2 上传文档） ── */
  {
    id: "w3_student_docs_view",
    worker: "w3",
    name: "查看学生文档",
    requires: ["w3_students_view", "w2_documents_upload"],
    fn: viewStudentDocuments,
    fnArgs: {
      studentIndex: 0,
    },
    backupWorkers: ["w1"],
    coverage: {
      routes: ["/admin/students"],
      api: ["/admin/students/list/detail/documents"],
      components: ["StudentDocumentList"],
      security: [],
    },
  },

  {
    id: "w3_view_student_doc_detail",
    worker: "w3",
    name: "查看学生文档详情",
    requires: ["w3_student_docs_view"],
    fn: viewStudentDocumentDetail,
    fnArgs: {},
    backupWorkers: ["w1"],
    coverage: {
      routes: ["/admin/students"],
      api: ["/api/admin/students/list/detail/documents/list/detail"],
      components: [["StudentExpandPanel", "文档列表"]],
      security: [],
    },
  },
  {
    id: "w3_download_student_doc",
    worker: "w3",
    name: "下载学生文档",
    requires: ["w3_view_student_doc_detail"],
    fn: downloadStudentDocument,
    fnArgs: {},
    backupWorkers: ["w1"],
    coverage: {
      routes: ["/admin/students"],
      api: ["/api/admin/students/list/detail/documents/list/detail/download"],
      components: [["StudentExpandPanel", "文档列表"]],
      security: [],
    },
  },

  /* ── 联系人管理 ── */
  {
    id: "w3_contacts_view",
    worker: "w3",
    name: "查看联系人列表",
    requires: ["w3_reload_auth"],
    fn: viewContactList,
    fnArgs: {},
    coverage: {
      routes: ["/admin/contacts"],
      api: ["/admin/contacts/list"],
      components: ["ContactList"],
      security: [],
    },
  },
  {
    id: "w3_contacts_expand",
    worker: "w3",
    name: "展开联系人面板",
    requires: ["w3_contacts_view"],
    fn: expandContact,
    fnArgs: {},
    backupWorkers: ["w1", "w6"],
    coverage: {
      routes: ["/admin/contacts"],
      api: ["/admin/contacts/list/detail"],
      components: ["ContactDetailPanel"],
      security: [],
    },
  },
  {
    id: "w3_contacts_mark_status",
    worker: "w3",
    name: "标记联系状态",
    requires: ["w3_contacts_expand"],
    fn: markContactStatus,
    fnArgs: {
      status: "contacted",
    },
    backupWorkers: ["w1", "w6"],
    coverage: {
      routes: ["/admin/contacts"],
      api: ["/admin/contacts/list/detail/mark"],
      components: ["ContactDetailPanel"],
      security: [],
    },
  },
  {
    id: "w3_contacts_add_note",
    worker: "w3",
    name: "添加联系人备注",
    requires: ["w3_contacts_expand"],
    fn: addContactNote,
    fnArgs: {
      note: `E2E-advisor-contact-note-${TS}`,
    },
    backupWorkers: ["w1", "w6"],
    coverage: {
      routes: ["/admin/contacts"],
      api: ["/admin/contacts/list/detail/note"],
      components: ["ContactDetailPanel"],
      security: [],
    },
  },

  {
    id: "w3_upgrade_contact",
    worker: "w3",
    name: "升级联系人为学生",
    requires: ["w3_contacts_add_note"],
    fn: upgradeContactToStudent,
    fnArgs: {},
    coverage: {
      routes: ["/admin/contacts"],
      api: ["/api/admin/contacts/list/detail/upgrade"],
      components: [["ContactExpandPanel", "升级取消"]],
      security: [],
    },
  },

  /* ── 权限测试 ── */
  {
    id: "w3_permission_students_allowed",
    worker: "w3",
    name: "验证学生管理访问权限",
    requires: ["w3_reload_auth"],
    fn: verifyPermissionAllowed,
    fnArgs: {
      routes: ["/admin/students", "/admin/contacts"],
    },
    coverage: {
      routes: ["/admin/students", "/admin/contacts"],
      api: [],
      components: [],
      security: ["advisor-access"],
    },
  },
  {
    id: "w3_permission_admin_denied",
    worker: "w3",
    name: "验证用户/文章/角色管理拒绝",
    requires: ["w3_register"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/users", "/admin/web-settings", "/admin/roles"],
    },
    coverage: {
      routes: [],
      api: [],
      components: [],
      security: ["admin-denied"],
    },
  },
  {
    id: "w3_permission_api_denied",
    worker: "w3",
    name: "验证 admin API 拒绝",
    requires: ["w3_register"],
    fn: verifyApiDenied,
    fnArgs: {
      endpoints: ["/api/admin/users/list", "/api/admin/web-settings/articles/list", "/api/admin/roles/list"],
    },
    coverage: {
      routes: [],
      api: ["/api/admin/users/list", "/api/admin/web-settings/articles/list", "/api/admin/roles/list"],
      components: [],
      security: ["api-denied"],
    },
  },

  /* ── 侧边栏导航 ── */
  {
    id: "w3_sidebar_verify",
    worker: "w3",
    name: "验证顾问侧边栏",
    requires: ["w3_reload_auth"],
    fn: verifyAdminSidebar,
    fnArgs: {
      role: "advisor",
    },
    coverage: {
      routes: ["/admin/dashboard"],
      api: [],
      components: ["AdminSidebar"],
      security: [],
    },
  },

  /* ── 登出 ── */
  {
    id: "w3_logout",
    worker: "w3",
    name: "顾问用户登出",
    requires: ["w3_register"],
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
