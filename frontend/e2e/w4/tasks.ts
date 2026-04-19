/**
 * W4 任务声明：visitor (访客)
 *
 * 职责：
 * - 手机号验证码注册（默认 visitor 角色）
 * - 公开页面访问（所有 public 路由）
 * - 公开详情页访问（依赖 W1 创建种子数据）
 * - 搜索筛选功能测试
 * - 语言切换测试
 * - 咨询按钮测试
 * - 权限测试（正向：public 访问；反向：admin+portal 拒绝）
 * - JWT 安全测试（缺失/无效/篡改 token）
 * - IDOR 测试（依赖 W2 上传文档）
 */

import type { Task } from "../framework/types"
import setCookie from "../fns/set-cookie"
import register from "../fns/register"
import logout from "../fns/logout"
import {
  verifyPublicPage,
  verifyNavbar,
  verifyFooter,
  filterUniversities,
} from "../fns/public-pages"
import {
  verifyArticleDetail,
  verifyCaseDetail,
  verifyUniversityDetail,
} from "../fns/public-detail"
import {
  testUniversitySearch,
  testCountryFilter,
  testResetFilter,
  testLocaleSwitcher,
  testConsultButton,
} from "../fns/search-filter"
import {
  verifyPermissionAllowed,
  verifyPermissionDenied,
  verifyApiDenied,
} from "../fns/permission"
import {
  testMissingToken,
  testInvalidToken,
  testTamperedJwt,
  testValidToken,
} from "../fns/jwt-security"
import {
  testAccessOtherDoc,
  testDeleteOtherDoc,
} from "../fns/idor"
import {
  testLoginSuccess,
  testLogoutFlow,
  testWrongPassword,
} from "../fns/auth-flow"

import { TS } from "../constants"
const W4_PHONE = "+86-13900004004"

export const tasks: Task[] = [
  /* ── 初始化 ── */
  {
    id: "w4_set_cookie",
    worker: "w4",
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
    id: "w4_register",
    worker: "w4",
    name: "访客用户注册",
    requires: ["w4_set_cookie"],
    fn: register,
    fnArgs: {
      phone: W4_PHONE,
      worker: "w4",
    },
    coverage: {
      routes: ["/"],
      api: ["/api/auth/sms-code", "/api/auth/register"],
      components: ["LoginDialog", "SmsLoginForm"],
      security: ["sms-registration"],
    },
  },

  /* ── 公开页面 ── */
  {
    id: "w4_public_home",
    worker: "w4",
    name: "访问首页",
    requires: [],
    fn: verifyPublicPage,
    fnArgs: {
      path: "/",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/"],
      api: ["/api/public/config/site_info"],
      components: ["HomePage"],
      security: [],
    },
  },
  {
    id: "w4_public_about",
    worker: "w4",
    name: "访问关于我们",
    requires: [],
    fn: verifyPublicPage,
    fnArgs: {
      path: "/about",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/about"],
      api: [],
      components: ["AboutPage"],
      security: [],
    },
  },
  {
    id: "w4_public_news",
    worker: "w4",
    name: "访问新闻列表",
    requires: [],
    fn: verifyPublicPage,
    fnArgs: {
      path: "/news",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/news"],
      api: ["/api/public/content/articles/list"],
      components: ["NewsPage"],
      security: [],
    },
  },
  {
    id: "w4_public_cases",
    worker: "w4",
    name: "访问案例列表",
    requires: [],
    fn: verifyPublicPage,
    fnArgs: {
      path: "/cases",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/cases"],
      api: ["/api/public/cases/list"],
      components: ["CasesPage"],
      security: [],
    },
  },
  {
    id: "w4_public_universities",
    worker: "w4",
    name: "访问院校列表",
    requires: [],
    fn: verifyPublicPage,
    fnArgs: {
      path: "/universities",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/universities"],
      api: ["/api/public/universities/list"],
      components: ["UniversitiesPage"],
      security: [],
    },
  },
  {
    id: "w4_filter_universities",
    worker: "w4",
    name: "院校国家筛选",
    requires: ["w1_crud_university_create"],
    fn: filterUniversities,
    fnArgs: {},
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/universities"],
      api: ["/api/public/universities/provinces", "/api/public/universities/cities"],
      components: ["UniversitySearch"],
      security: [],
    },
  },
  {
    id: "w4_public_life",
    worker: "w4",
    name: "访问留学生活列表",
    requires: [],
    fn: verifyPublicPage,
    fnArgs: {
      path: "/life",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/life"],
      api: ["/api/public/content/articles"],
      components: ["LifePage"],
      security: [],
    },
  },
  {
    id: "w4_public_requirements",
    worker: "w4",
    name: "访问申请条件列表",
    requires: [],
    fn: verifyPublicPage,
    fnArgs: {
      path: "/requirements",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/requirements"],
      api: ["/api/public/content/articles"],
      components: ["RequirementsPage"],
      security: [],
    },
  },
  {
    id: "w4_public_study_abroad",
    worker: "w4",
    name: "访问出国留学列表",
    requires: [],
    fn: verifyPublicPage,
    fnArgs: {
      path: "/study-abroad",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/study-abroad"],
      api: ["/api/public/content/articles"],
      components: ["StudyAbroadPage"],
      security: [],
    },
  },
  {
    id: "w4_public_visa",
    worker: "w4",
    name: "访问签证办理列表",
    requires: [],
    fn: verifyPublicPage,
    fnArgs: {
      path: "/visa",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/visa"],
      api: ["/api/public/content/articles"],
      components: ["VisaPage"],
      security: [],
    },
  },
  {
    id: "w4_public_contact",
    worker: "w4",
    name: "访问联系我们",
    requires: [],
    fn: verifyPublicPage,
    fnArgs: {
      path: "/about",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/about"],
      api: ["/api/public/config/contact_info"],
      components: ["ContactPage"],
      security: [],
    },
  },

  /* ── 公开详情页（依赖 W1 创建种子数据） ── */
  {
    id: "w4_detail_article",
    worker: "w4",
    name: "访问文章详情页",
    requires: ["w1_crud_article_create"],
    fn: verifyArticleDetail,
    fnArgs: {
      articleId: `e2e-article-${TS}`,
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/news/:id", "/life/:id", "/requirements/:id", "/study-abroad/:id", "/visa/:id"],
      api: ["/api/public/content/article/{article_id}"],
      components: ["ArticleDetailPage"],
      security: [],
    },
  },
  {
    id: "w4_detail_case",
    worker: "w4",
    name: "访问案例详情页",
    requires: ["w1_crud_case_create"],
    fn: verifyCaseDetail,
    fnArgs: {
      caseId: "case-id-placeholder",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/cases/:id"],
      api: ["/api/public/cases/list/detail"],
      components: ["CaseDetailPage"],
      security: [],
    },
  },
  {
    id: "w4_detail_university",
    worker: "w4",
    name: "访问院校详情页",
    requires: ["w1_crud_university_create"],
    fn: verifyUniversityDetail,
    fnArgs: {
      universityId: "university-id-placeholder",
    },
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/universities/:id"],
      api: ["/api/public/universities/list/detail"],
      components: ["UniversityDetailPage"],
      security: [],
    },
  },

  /* ── 导航栏和页脚 ── */
  {
    id: "w4_navbar",
    worker: "w4",
    name: "验证导航栏",
    requires: [],
    fn: verifyNavbar,
    fnArgs: {},
    coverage: {
      routes: [],
      api: [],
      components: ["Navbar"],
      security: [],
    },
  },
  {
    id: "w4_footer",
    worker: "w4",
    name: "验证页脚",
    requires: [],
    fn: verifyFooter,
    fnArgs: {},
    coverage: {
      routes: [],
      api: [],
      components: ["Footer"],
      security: [],
    },
  },

  /* ── 搜索筛选 ── */
  {
    id: "w4_search_university",
    worker: "w4",
    name: "测试院校搜索",
    requires: [],
    fn: testUniversitySearch,
    fnArgs: {},
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/universities"],
      api: [],
      components: ["SearchInput"],
      security: [],
    },
  },
  {
    id: "w4_filter_country",
    worker: "w4",
    name: "测试国家筛选",
    requires: [],
    fn: testCountryFilter,
    fnArgs: {},
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/universities"],
      api: [],
      components: ["CountryFilter"],
      security: [],
    },
  },
  {
    id: "w4_filter_reset",
    worker: "w4",
    name: "测试重置筛选",
    requires: ["w4_search_university"],
    fn: testResetFilter,
    fnArgs: {},
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/universities"],
      api: [],
      components: ["ResetButton"],
      security: [],
    },
  },
  {
    id: "w4_locale_switcher",
    worker: "w4",
    name: "测试语言切换",
    requires: [],
    fn: testLocaleSwitcher,
    fnArgs: {},
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/", "/en"],
      api: [],
      components: ["LocaleSwitcher"],
      security: [],
    },
  },
  {
    id: "w4_consult_button",
    worker: "w4",
    name: "测试咨询按钮",
    requires: [],
    fn: testConsultButton,
    fnArgs: {},
    backupWorkers: ["w1", "w2", "w3", "w5", "w6"],
    coverage: {
      routes: ["/"],
      api: [],
      components: ["ConsultButton"],
      security: [],
    },
  },

  /* ── 认证流程测试 ── */
  {
    id: "w4_auth_login_success",
    worker: "w4",
    name: "测试账号密码登录成功",
    requires: ["w4_logout"],
    fn: testLoginSuccess,
    fnArgs: {
      username: process.env.SEED_USER_1_USERNAME || "admin",
      password: process.env.SEED_USER_1_PASSWORD || "Admin123!",
    },
    coverage: {
      routes: ["/"],
      api: ["/api/auth/login"],
      components: ["LoginDialog", "LoginForm", "TabSwitch"],
      security: ["account-password-login"],
    },
  },
  {
    id: "w4_auth_logout",
    worker: "w4",
    name: "测试登出流程",
    requires: ["w4_auth_login_success"],
    fn: testLogoutFlow,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/api/auth/logout"],
      components: ["Header"],
      security: ["logout"],
    },
  },
  {
    id: "w4_auth_wrong_password",
    worker: "w4",
    name: "测试错误密码",
    requires: ["w4_auth_logout"],
    fn: testWrongPassword,
    fnArgs: {
      username: process.env.SEED_USER_1_USERNAME || "admin",
      password: "wrong-password-12345",
    },
    coverage: {
      routes: [],
      api: ["/api/auth/login"],
      components: ["LoginDialog", "ErrorMessage"],
      security: ["wrong-password"],
    },
  },

  /* ── 权限测试 ── */
  {
    id: "w4_permission_public_allowed",
    worker: "w4",
    name: "验证公开页面访问权限",
    requires: [],
    fn: verifyPermissionAllowed,
    fnArgs: {
      routes: ["/", "/about", "/news", "/cases", "/universities", "/about"],
    },
    coverage: {
      routes: ["/", "/about", "/news", "/cases", "/universities", "/about"],
      api: [],
      components: [],
      security: ["public-access"],
    },
  },
  {
    id: "w4_permission_admin_denied",
    worker: "w4",
    name: "验证 admin 访问拒绝",
    requires: ["w4_register"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/admin/dashboard", "/admin/users", "/admin/web-settings", "/admin/documents", "/admin/overview", "/admin/profile"],
    },
    coverage: {
      routes: ["/admin/documents", "/admin/overview", "/admin/profile"],
      api: [],
      components: [],
      security: ["admin-denied"],
    },
  },
  {
    id: "w4_permission_portal_denied",
    worker: "w4",
    name: "验证 portal 访问拒绝",
    requires: ["w4_register"],
    fn: verifyPermissionDenied,
    fnArgs: {
      routes: ["/portal/profile", "/portal/documents", "/portal/overview", "/portal/contacts", "/portal/dashboard", "/portal/general-settings", "/portal/roles", "/portal/students", "/portal/users", "/portal/web-settings"],
    },
    coverage: {
      routes: ["/portal/overview", "/portal/contacts", "/portal/dashboard", "/portal/general-settings", "/portal/roles", "/portal/students", "/portal/users", "/portal/web-settings"],
      api: [],
      components: [],
      security: ["portal-denied"],
    },
  },
  {
    id: "w4_permission_api_denied",
    worker: "w4",
    name: "验证 admin+portal API 拒绝",
    requires: ["w4_register"],
    fn: verifyApiDenied,
    fnArgs: {
      endpoints: [
        "/api/admin/users/list",
        "/api/admin/web-settings/articles/list",
        "/api/portal/profile/detail",
      ],
    },
    coverage: {
      routes: [],
      api: ["/api/admin/users/list", "/api/admin/web-settings/articles/list", "/api/portal/profile/detail"],
      components: [],
      security: ["api-denied"],
    },
  },

  /* ── JWT 安全测试 ── */
  {
    id: "w4_jwt_missing_token",
    worker: "w4",
    name: "测试缺失 token",
    requires: [],
    fn: testMissingToken,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/api/admin/users/list"],
      components: [],
      security: ["missing-token"],
    },
  },
  {
    id: "w4_jwt_invalid_token",
    worker: "w4",
    name: "测试无效 token",
    requires: [],
    fn: testInvalidToken,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/api/admin/users/list"],
      components: [],
      security: ["invalid-token"],
    },
  },
  {
    id: "w4_jwt_tampered",
    worker: "w4",
    name: "测试篡改 JWT",
    requires: [],
    fn: testTamperedJwt,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/api/admin/users/list"],
      components: [],
      security: ["tampered-jwt"],
    },
  },
  {
    id: "w4_jwt_valid_token",
    worker: "w4",
    name: "测试有效 token",
    requires: [],
    fn: testValidToken,
    fnArgs: {},
    coverage: {
      routes: [],
      api: ["/api/public/config/site_info"],
      components: [],
      security: ["valid-token"],
    },
  },

  /* ── IDOR 测试（依赖 W2 上传文档） ── */
  {
    id: "w4_idor_access_other_doc",
    worker: "w4",
    name: "测试访问其他用户文档被拒",
    requires: ["w4_register", "w2_documents_upload"],
    fn: testAccessOtherDoc,
    fnArgs: {
      docId: "placeholder-doc-id",
    },
    coverage: {
      routes: [],
      api: ["/api/portal/documents/list/detail"],
      components: [],
      security: ["idor-access-denied"],
    },
  },
  {
    id: "w4_idor_delete_other_doc",
    worker: "w4",
    name: "测试删除其他用户文档被拒",
    requires: ["w4_register", "w2_documents_upload"],
    fn: testDeleteOtherDoc,
    fnArgs: {
      docId: "placeholder-doc-id",
    },
    coverage: {
      routes: [],
      api: ["/api/portal/documents/list/detail/delete"],
      components: [],
      security: ["idor-delete-denied"],
    },
  },

  /* ── 登出 ── */
  {
    id: "w4_logout",
    worker: "w4",
    name: "访客用户登出",
    requires: ["w4_register"],
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
