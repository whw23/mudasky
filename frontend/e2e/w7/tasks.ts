/**
 * W7 破坏性测试任务声明。
 * 反复注册临时账号进行安全测试（禁用/JWT/IDOR/认证流程）。
 */

import type { Task } from "../framework/types"
import register from "../fns/register"
import logout from "../fns/logout"
import login from "../fns/login"
import assignRole from "../fns/assign-role"
import { verifyDisabledApi, verifyEnabledApi } from "../fns/disabled-verify"
import { testMissingToken, testInvalidToken, testTamperedJwt } from "../fns/jwt-security"
import { testAccessOtherDoc, testDeleteOtherDoc } from "../fns/idor"
import { testLoginDialog, testLoginSuccess, testWrongPassword, testLogoutFlow } from "../fns/auth-flow"

import setCookie from "../fns/set-cookie"
import { PHONES, TS } from "../constants"

export const tasks: Task[] = [
  // ── 设置 cookie ──
  {
    id: "w7_set_cookie",
    worker: "w7",
    name: "设置 internal_secret cookie",
    requires: [],
    fn: setCookie,
    fnArgs: {},
    coverage: { routes: [], api: [], components: [], security: [] },
  },

  // ── SEED_USER_1 登录并给 W1 赋权 ──
  {
    id: "w7_login_seed1",
    worker: "w7",
    name: "W7 用 SEED_USER_1 登录",
    requires: ["w7_set_cookie"],
    fn: login,
    fnArgs: {
      username: process.env.SEED_USER_1_USERNAME || "admin",
      password: process.env.SEED_USER_1_PASSWORD || "Admin123!",
      worker: "w7",
    },
    coverage: {
      routes: ["/"],
      api: ["/api/auth/login"],
      components: ["LoginDialog", "LoginForm"],
      security: [],
    },
  },
  {
    id: "w7_assign_superuser_w1",
    worker: "w7",
    name: "W7 给 W1 赋权 superuser",
    requires: ["w7_login_seed1", "w1_register"],
    fn: assignRole,
    fnArgs: {
      phone: PHONES.w1,
      roleName: "superuser",
    },
    coverage: {
      routes: ["/admin/users"],
      api: ["/api/admin/users/list", "/api/admin/users/list/detail/assign-role"],
      components: ["UserList", "UserDetail"],
      security: ["role-assignment"],
    },
  },

  // ── 禁用/启用测试组 ──
  {
    id: "w7_reg_disable",
    worker: "w7",
    name: "注册临时账号(禁用测试)",
    requires: ["w7_assign_superuser_w1"],
    fn: register,
    fnArgs: { phone: PHONES.w7_disabled, worker: "w7" },
    coverage: {
      routes: ["/"],
      api: ["/api/auth/sms-code", "/api/auth/login"],
      security: [["auth", "temp-register-disable"]],
    },
  },
  // W1 会创建 w1_disable_temp 任务（依赖 w7_reg_disable）
  {
    id: "w7_verify_disabled",
    worker: "w7",
    name: "验证禁用后 API 返回 401",
    requires: ["w1_disable_temp"],
    fn: verifyDisabledApi,
    coverage: {
      api: ["/api/portal/overview"],
      security: [["auth", "disabled-user-401"]],
    },
  },
  // W1 会创建 w1_enable_temp 任务（依赖 w7_verify_disabled）
  {
    id: "w7_verify_enabled",
    worker: "w7",
    name: "验证启用后访问恢复",
    requires: ["w1_enable_temp"],
    fn: verifyEnabledApi,
    fnArgs: { phone: PHONES.w7_disabled },
    coverage: {
      security: [["auth", "enabled-user-200"]],
    },
  },
  {
    id: "w7_logout_disable",
    worker: "w7",
    name: "登出(禁用测试)",
    requires: ["w7_verify_enabled"],
    fn: logout,
    coverage: {
      components: [["Header", "logout-button"]],
    },
  },

  // ── JWT 安全测试组 ──
  {
    id: "w7_reg_jwt",
    worker: "w7",
    name: "注册临时账号(JWT测试)",
    requires: ["w7_logout_disable"],
    fn: register,
    fnArgs: { phone: PHONES.w7_jwt, worker: "w7" },
    coverage: {
      security: [["auth", "temp-register-jwt"]],
    },
  },
  {
    id: "w7_jwt_missing",
    worker: "w7",
    name: "测试缺失 token 返回 401",
    requires: ["w7_reg_jwt"],
    fn: testMissingToken,
    coverage: {
      api: ["/api/admin/users/list"],
      security: [["jwt", "missing-token-401"]],
    },
  },
  {
    id: "w7_jwt_invalid",
    worker: "w7",
    name: "测试无效 token 返回 401",
    requires: ["w7_reg_jwt"],
    fn: testInvalidToken,
    coverage: {
      security: [["jwt", "invalid-token-401"]],
    },
  },
  {
    id: "w7_jwt_tampered",
    worker: "w7",
    name: "测试篡改 JWT 返回 401",
    requires: ["w7_reg_jwt"],
    fn: testTamperedJwt,
    coverage: {
      security: [["jwt", "tampered-jwt-401"]],
    },
  },
  {
    id: "w7_logout_jwt",
    worker: "w7",
    name: "登出(JWT测试)",
    requires: ["w7_jwt_missing", "w7_jwt_invalid", "w7_jwt_tampered"],
    fn: logout,
    coverage: {
      components: [["Header", "logout-button"]],
    },
  },

  // ── 认证流程测试组 ──
  {
    id: "w7_auth_dialog",
    worker: "w7",
    name: "测试登录弹窗",
    requires: ["w7_logout_jwt"],
    fn: testLoginDialog,
    coverage: {
      components: [
        ["AuthDialog", "dialog-open"],
        ["AuthDialog", "tab-switch"],
      ],
      security: [["auth", "dialog-ui"]],
    },
  },
  {
    id: "w7_auth_login",
    worker: "w7",
    name: "测试账号密码登录",
    requires: ["w7_auth_dialog"],
    fn: testLoginSuccess,
    fnArgs: {
      username: process.env.SEED_USER_1_USERNAME || "admin",
      password: process.env.SEED_USER_1_PASSWORD || "Admin123!",
    },
    coverage: {
      api: ["/api/auth/login"],
      components: [["AuthDialog", "account-login"]],
      security: [["auth", "account-login-success"]],
    },
  },
  {
    id: "w7_auth_logout",
    worker: "w7",
    name: "测试登出流程",
    requires: ["w7_auth_login"],
    fn: testLogoutFlow,
    coverage: {
      components: [["Header", "logout-flow"]],
      security: [["auth", "logout-flow"]],
    },
  },
  {
    id: "w7_auth_wrong_password",
    worker: "w7",
    name: "测试错误密码",
    requires: ["w7_auth_logout"],
    fn: testWrongPassword,
    fnArgs: {
      username: process.env.SEED_USER_1_USERNAME || "admin",
      password: "wrong-password-12345",
    },
    coverage: {
      components: [["AuthDialog", "error-message"]],
      security: [["auth", "wrong-password-error"]],
    },
  },

  // ── IDOR 测试组 ──
  {
    id: "w7_reg_idor",
    worker: "w7",
    name: "注册临时账号(IDOR测试)",
    requires: ["w7_auth_wrong_password"],
    fn: register,
    fnArgs: { phone: PHONES.w7_idor, worker: "w7" },
    coverage: {
      security: [["auth", "temp-register-idor"]],
    },
  },
  {
    id: "w7_idor_access",
    worker: "w7",
    name: "测试访问他人文档被拒",
    requires: ["w7_reg_idor", "w2_documents_upload"],
    fn: testAccessOtherDoc,
    fnArgs: {
      // docId 从 w2_documents_upload 信号文件的 data 中读取
      // runner 会自动把前置任务的 data 传入 fnArgs
      docId: "{{w2_documents_upload.docId}}",
    },
    coverage: {
      api: ["/api/portal/documents/list/detail"],
      security: [["idor", "access-other-doc-denied"]],
    },
  },
  {
    id: "w7_idor_delete",
    worker: "w7",
    name: "测试删除他人文档被拒",
    requires: ["w7_idor_access"],
    fn: testDeleteOtherDoc,
    fnArgs: {
      docId: "{{w2_documents_upload.docId}}",
    },
    coverage: {
      api: ["/api/portal/documents/list/detail/delete"],
      security: [["idor", "delete-other-doc-denied"]],
    },
  },
  {
    id: "w7_logout_idor",
    worker: "w7",
    name: "登出(IDOR测试)",
    requires: ["w7_idor_delete"],
    fn: logout,
    coverage: {
      components: [["Header", "logout-button"]],
    },
  },
]
