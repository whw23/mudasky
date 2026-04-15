/**
 * 后端 API 全量端点清单。
 * 用于 E2E 覆盖率统计，与实际请求对比。
 */
export const API_ENDPOINTS: string[] = [
  // auth
  "GET /api/auth/public-key",
  "POST /api/auth/sms-code",
  "POST /api/auth/register",
  "POST /api/auth/login",
  "POST /api/auth/refresh-token-hash",
  "POST /api/auth/logout",
  "POST /api/auth/refresh",

  // public — config
  "GET /api/public/config/{key}",
  "GET /api/public/panel-config",

  // public — content
  "GET /api/public/content/articles",
  "GET /api/public/content/article/{article_id}",
  "GET /api/public/content/categories",

  // public — cases
  "GET /api/public/cases/list",
  "GET /api/public/cases/detail/{case_id}",

  // public — universities
  "GET /api/public/universities/list",
  "GET /api/public/universities/countries",
  "GET /api/public/universities/provinces",
  "GET /api/public/universities/cities",
  "GET /api/public/universities/detail/{university_id}",

  // admin — users
  "GET /api/admin/users/list",
  "GET /api/admin/users/list/detail",
  "POST /api/admin/users/list/detail/edit",
  "POST /api/admin/users/list/detail/reset-password",
  "POST /api/admin/users/list/detail/assign-role",
  "POST /api/admin/users/list/detail/force-logout",
  "POST /api/admin/users/list/detail/delete",

  // admin — rbac (roles)
  "GET /api/admin/roles/meta",
  "GET /api/admin/roles/meta/list",
  "POST /api/admin/roles/meta/list/create",
  "POST /api/admin/roles/meta/list/reorder",
  "GET /api/admin/roles/meta/list/detail",
  "POST /api/admin/roles/meta/list/detail/edit",
  "POST /api/admin/roles/meta/list/detail/delete",

  // admin — config (general-settings)
  "GET /api/admin/general-settings/list",
  "POST /api/admin/general-settings/list/edit",

  // admin — config (web-settings)
  "GET /api/admin/web-settings/list",
  "POST /api/admin/web-settings/list/edit",

  // admin — content (categories)
  "GET /api/admin/categories/list",
  "POST /api/admin/categories/list/create",
  "POST /api/admin/categories/list/detail/edit",
  "POST /api/admin/categories/list/detail/delete",

  // admin — content (articles)
  "GET /api/admin/articles/list",
  "POST /api/admin/articles/list/create",
  "POST /api/admin/articles/list/detail/edit",
  "POST /api/admin/articles/list/detail/delete",

  // admin — cases
  "GET /api/admin/cases/list",
  "POST /api/admin/cases/list/create",
  "POST /api/admin/cases/list/detail/edit",
  "POST /api/admin/cases/list/detail/delete",

  // admin — universities
  "GET /api/admin/universities/list",
  "POST /api/admin/universities/list/create",
  "POST /api/admin/universities/list/detail/edit",
  "POST /api/admin/universities/list/detail/delete",

  // admin — students
  "GET /api/admin/students/list",
  "GET /api/admin/students/list/detail",
  "POST /api/admin/students/list/detail/edit",
  "POST /api/admin/students/list/detail/assign-advisor",
  "POST /api/admin/students/list/detail/downgrade",
  "GET /api/admin/students/list/detail/documents/list",
  "GET /api/admin/students/list/detail/documents/list/detail",
  "GET /api/admin/students/list/detail/documents/list/detail/download",

  // admin — contacts
  "GET /api/admin/contacts/list",
  "GET /api/admin/contacts/list/detail",
  "POST /api/admin/contacts/list/detail/mark",
  "POST /api/admin/contacts/list/detail/note",
  "GET /api/admin/contacts/list/detail/history",
  "POST /api/admin/contacts/list/detail/upgrade",

  // portal — profile
  "GET /api/portal/profile/meta",
  "GET /api/portal/profile/meta/list",
  "POST /api/portal/profile/meta/list/edit",
  "POST /api/portal/profile/password",
  "POST /api/portal/profile/phone",
  "POST /api/portal/profile/delete-account",

  // portal — profile — sessions
  "GET /api/portal/profile/sessions/list",
  "POST /api/portal/profile/sessions/list/revoke",
  "POST /api/portal/profile/sessions/list/revoke-all",

  // portal — profile — two-factor
  "POST /api/portal/profile/two-factor/enable-totp",
  "POST /api/portal/profile/two-factor/confirm-totp",
  "POST /api/portal/profile/two-factor/enable-sms",
  "POST /api/portal/profile/two-factor/disable",

  // portal — documents
  "GET /api/portal/documents/list",
  "POST /api/portal/documents/list/upload",
  "GET /api/portal/documents/list/detail",
  "GET /api/portal/documents/list/detail/download",
  "POST /api/portal/documents/list/detail/delete",
];
