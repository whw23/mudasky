/**
 * W2 任务声明：student (学生用户)
 *
 * 职责：
 * - 手机号验证码注册
 * - 个人资料管理（查看、编辑用户名、修改密码、两步验证）
 * - 文档上传和管理（上传、查看、删除、分类切换、存储用量）
 * - 登录设备管理（查看会话、踢出其他设备）
 * - 权限测试（正向：portal 访问；反向：admin 拒绝）
 * - Portal 侧边栏导航
 * - 安全测试（token 轮换、文件上传安全、路径穿越）
 */

import type { Task } from "../framework/types"
import setCookie from "../fns/set-cookie"
import register from "../fns/register"
import logout from "../fns/logout"
import {
  viewProfile,
  editUsername,
  changePassword,
  viewPhoneSection,
  view2faSection,
  changePhoneAndRollback,
  viewProfileMeta,
} from "../fns/profile"
import {
  viewDocuments,
  uploadDocument,
  verifyDocumentInList,
  deleteDocument,
  switchDocumentTab,
  viewStorageUsage,
  viewDocumentDetail,
  downloadDocument,
} from "../fns/documents"
import {
  enableSms2fa,
  disableSms2fa,
  verify2faStatus,
  viewTotpSetup,
} from "../fns/two-factor"
import {
  viewSessions,
  verifyCurrentDevice,
  revokeAllOthers,
  revokeSingleSession,
} from "../fns/sessions"
import {
  verifyPermissionAllowed,
  verifyPermissionDenied,
  verifyApiDenied,
} from "../fns/permission"

import reloadAuth from "../fns/reload-auth"
import { PHONES, TS } from "../constants"
const W2_PHONE = PHONES.w2

export const tasks: Task[] = [
  /* ── 初始化 ── */
  {
    id: "w2_set_cookie",
    worker: "w2",
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
    id: "w2_register",
    worker: "w2",
    name: "学生用户注册",
    requires: ["w2_set_cookie"],
    fn: register,
    fnArgs: {
      phone: W2_PHONE,
      worker: "w2",
    },
    coverage: {
      routes: ["/"],
      api: ["/api/auth/sms-code", "/api/auth/register"],
      components: ["LoginDialog", "SmsLoginForm"],
      security: ["sms-registration"],
    },
  },

  /* ── 重新加载认证（W1 赋权后 JWT 更新） ── */
  {
    id: "w2_reload_auth",
    worker: "w2",
    name: "重新加载认证状态",
    requires: ["w2_register", "w1_assign_role_w2", "w1_refresh_token_w2"],
    fn: reloadAuth,
    fnArgs: { worker: "w2", phone: PHONES.w2 },
    coverage: { routes: [], api: [], components: [], security: [] },
  },

  /* ── 个人资料管理 ── */
  {
    id: "w2_profile_view",
    worker: "w2",
    name: "查看个人资料",
    requires: ["w2_reload_auth"],
    fn: viewProfile,
    fnArgs: {},
    coverage: {
      routes: ["/portal/profile"],
      api: ["/portal/profile/detail"],
      components: ["ProfilePage", "BasicInfo"],
      security: [],
    },
  },
  {
    id: "w2_profile_edit_username",
    worker: "w2",
    name: "修改用户名",
    requires: ["w2_profile_view"],
    fn: editUsername,
    fnArgs: {
      username: `E2E-student-${TS}`,
    },
    coverage: {
      routes: ["/portal/profile"],
      api: ["/portal/profile/detail/username"],
      components: ["EditableField"],
      security: [],
    },
  },
  {
    id: "w2_profile_change_password",
    worker: "w2",
    name: "修改密码",
    requires: ["w2_profile_view"],
    fn: changePassword,
    fnArgs: {
      phone: W2_PHONE,
      password: "NewTest@12345",
    },
    coverage: {
      routes: ["/portal/profile"],
      api: ["/api/auth/sms-code", "/portal/profile/detail/password"],
      components: ["PasswordSection"],
      security: ["password-change"],
    },
  },
  {
    id: "w2_profile_phone_section",
    worker: "w2",
    name: "查看手机号修改区域",
    requires: ["w2_profile_view"],
    fn: viewPhoneSection,
    fnArgs: {},
    coverage: {
      routes: ["/portal/profile"],
      api: [],
      components: ["PhoneSection"],
      security: [],
    },
  },
  {
    id: "w2_profile_2fa_section",
    worker: "w2",
    name: "查看两步验证区域",
    requires: ["w2_profile_view"],
    fn: view2faSection,
    fnArgs: {},
    coverage: {
      routes: ["/portal/profile"],
      api: [],
      components: ["TwoFactorSection"],
      security: [],
    },
  },

  /* ── 个人资料：高级操作 ── */
  {
    id: "w2_profile_meta",
    worker: "w2",
    name: "验证账号删除选项",
    requires: ["w2_profile_view"],
    fn: viewProfileMeta,
    fnArgs: {},
    coverage: {
      routes: ["/portal/profile"],
      api: ["/portal/profile/meta"],
      components: ["DeleteAccountSection"],
      security: [],
    },
  },
  /* ── 两步验证 ── */
  {
    id: "w2_2fa_enable",
    worker: "w2",
    name: "启用两步验证",
    requires: ["w2_profile_2fa_section"],
    fn: enableSms2fa,
    fnArgs: {
      phone: W2_PHONE,
    },
    coverage: {
      routes: ["/portal/profile"],
      api: ["/api/auth/sms-code", "/portal/profile/two-factor/enable"],
      components: ["TwoFactorDialog"],
      security: ["two-factor-enable"],
    },
  },
  {
    id: "w2_2fa_verify_enabled",
    worker: "w2",
    name: "验证两步验证已启用",
    requires: ["w2_2fa_enable"],
    fn: verify2faStatus,
    fnArgs: {
      enabled: true,
    },
    coverage: {
      routes: ["/portal/profile"],
      api: [],
      components: ["TwoFactorSection"],
      security: [],
    },
  },
  {
    id: "w2_2fa_disable",
    worker: "w2",
    name: "禁用两步验证",
    requires: ["w2_2fa_verify_enabled"],
    fn: disableSms2fa,
    fnArgs: {
      phone: W2_PHONE,
    },
    coverage: {
      routes: ["/portal/profile"],
      api: ["/api/auth/sms-code", "/portal/profile/two-factor/disable"],
      components: ["TwoFactorDialog"],
      security: ["two-factor-disable"],
    },
  },
  {
    id: "w2_2fa_verify_disabled",
    worker: "w2",
    name: "验证两步验证已禁用",
    requires: ["w2_2fa_disable"],
    fn: verify2faStatus,
    fnArgs: {
      enabled: false,
    },
    coverage: {
      routes: ["/portal/profile"],
      api: [],
      components: ["TwoFactorSection"],
      security: [],
    },
  },

  {
    id: "w2_2fa_totp_setup",
    worker: "w2",
    name: "查看 TOTP 设置",
    requires: ["w2_2fa_verify_disabled"],
    fn: viewTotpSetup,
    fnArgs: {},
    coverage: {
      routes: ["/portal/profile"],
      api: ["/portal/profile/two-factor/enable-totp"],
      components: ["TotpSetupDialog"],
      security: ["totp-setup"],
    },
  },

  /* ── 文档管理 ── */
  {
    id: "w2_documents_view",
    worker: "w2",
    name: "查看文档页面",
    requires: ["w2_reload_auth"],
    fn: viewDocuments,
    fnArgs: {},
    coverage: {
      routes: ["/portal/documents"],
      api: ["/portal/documents/list"],
      components: ["DocumentsPage", "DocumentList"],
      security: [],
    },
  },
  {
    id: "w2_documents_upload",
    worker: "w2",
    name: "上传文档",
    requires: ["w2_documents_view"],
    fn: uploadDocument,
    fnArgs: {
      fileName: `E2E_239_student-doc-${TS}.txt`,
      category: "other",
      content: "E2E_239_student test document",
    },
    backupWorkers: ["w1"],
    coverage: {
      routes: ["/portal/documents"],
      api: ["/portal/documents/list/upload"],
      components: ["UploadDialog"],
      security: ["file-upload"],
    },
  },
  {
    id: "w2_documents_verify_list",
    worker: "w2",
    name: "验证文档在列表中",
    requires: ["w2_documents_upload"],
    fn: verifyDocumentInList,
    fnArgs: {
      fileName: `E2E_239_student-doc-${TS}.txt`,
    },
    coverage: {
      routes: ["/portal/documents"],
      api: [],
      components: ["DocumentList"],
      security: [],
    },
  },
  {
    id: "w2_documents_tab_switch",
    worker: "w2",
    name: "切换文档分类 Tab",
    requires: ["w2_documents_view"],
    fn: switchDocumentTab,
    fnArgs: {},
    backupWorkers: ["w1"],
    coverage: {
      routes: ["/portal/documents"],
      api: [],
      components: ["DocumentTabs"],
      security: [],
    },
  },
  {
    id: "w2_documents_storage",
    worker: "w2",
    name: "查看存储用量",
    requires: ["w2_documents_upload"],
    fn: viewStorageUsage,
    fnArgs: {},
    backupWorkers: ["w1"],
    coverage: {
      routes: ["/portal/documents"],
      api: [],
      components: ["StorageUsage"],
      security: [],
    },
  },
  {
    id: "w2_documents_delete",
    worker: "w2",
    name: "删除文档",
    requires: ["w2_documents_verify_list"],
    fn: deleteDocument,
    fnArgs: {
      fileName: `E2E_239_student-doc-${TS}.txt`,
    },
    backupWorkers: ["w1"],
    coverage: {
      routes: ["/portal/documents"],
      api: ["/portal/documents/list/detail/delete"],
      components: ["DocumentList"],
      security: ["file-delete"],
    },
  },

  /* ── 登录设备管理 ── */
  {
    id: "w2_sessions_view",
    worker: "w2",
    name: "查看登录设备",
    requires: ["w2_profile_view"],
    fn: viewSessions,
    fnArgs: {},
    coverage: {
      routes: ["/portal/profile"],
      api: ["/portal/profile/sessions/list"],
      components: ["SessionsSection"],
      security: [],
    },
  },
  {
    id: "w2_sessions_current",
    worker: "w2",
    name: "验证当前设备",
    requires: ["w2_sessions_view"],
    fn: verifyCurrentDevice,
    fnArgs: {},
    coverage: {
      routes: ["/portal/profile"],
      api: [],
      components: ["SessionsSection"],
      security: [],
    },
  },
  {
    id: "w2_sessions_revoke_single",
    worker: "w2",
    name: "踢出单个设备",
    requires: ["w2_sessions_view"],
    fn: revokeSingleSession,
    fnArgs: {},
    coverage: {
      routes: ["/portal/profile"],
      api: ["/portal/profile/sessions/list/revoke"],
      components: ["SessionsSection"],
      security: ["session-revoke-single"],
    },
  },
  {
    id: "w2_sessions_revoke_others",
    worker: "w2",
    name: "踢出所有其他设备",
    requires: ["w2_sessions_view"],
    fn: revokeAllOthers,
    fnArgs: {},
    coverage: {
      routes: ["/portal/profile"],
      api: ["/portal/profile/sessions/list/revoke-all"],
      components: ["SessionsSection"],
      security: ["session-revoke"],
    },
  },

  /* ── 权限测试 ── */
  {
    id: "w2_permission_portal_allowed",
    worker: "w2",
    name: "验证 portal 访问权限",
    requires: ["w2_reload_auth"],
    fn: verifyPermissionAllowed,
    fnArgs: {
      routes: ["/portal/profile", "/portal/documents"],
    },
    coverage: {
      routes: ["/portal/profile", "/portal/documents"],
      api: [],
      components: [],
      security: ["portal-access"],
    },
  },
  {
    id: "w2_permission_admin_denied",
    worker: "w2",
    name: "验证 admin 访问拒绝",
    requires: ["w2_register"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/dashboard", "/admin/users", "/admin/web-settings"],
    },
    coverage: {
      routes: [],
      api: [],
      components: [],
      security: ["admin-denied"],
    },
  },
  {
    id: "w2_permission_api_denied",
    worker: "w2",
    name: "验证 admin API 拒绝",
    requires: ["w2_register"],
    fn: verifyApiDenied,
    fnArgs: {
      endpoints: ["/api/admin/users/list", "/api/admin/web-settings/articles/list"],
    },
    coverage: {
      routes: [],
      api: ["/api/admin/users/list", "/api/admin/web-settings/articles/list"],
      components: [],
      security: ["api-denied"],
    },
  },

  /* ── 登出 ── */
  {
    id: "w2_logout",
    worker: "w2",
    name: "学生用户登出",
    requires: ["w2_register"],
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
