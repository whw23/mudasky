/** 全局类型定义，与后端 schemas 对应。 */

export interface User {
  id: string
  phone: string | null
  username: string | null
  user_type: string
  is_active: boolean
  is_superuser: boolean
  two_factor_enabled: boolean
  two_factor_method: string | null
  storage_quota: number
  permissions: string[]
  group_ids: string[]
  group_names: string[]
  created_at: string
  updated_at: string | null
}

/** 权限定义 */
export interface Permission {
  id: string
  code: string
  description: string
}

/** 权限组定义 */
export interface PermissionGroup {
  id: string
  name: string
  description: string
  is_system: boolean
  auto_include_all: boolean
  permissions: Permission[]
  user_count: number
  created_at: string
  updated_at: string | null
}

export interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  cover_image: string | null
  category_id: string
  author_id: string
  status: "draft" | "published"
  is_pinned: boolean
  view_count: number
  published_at: string | null
  created_at: string
  updated_at: string | null
}

/** 文档分类枚举 */
export type DocumentCategory =
  | "transcript"
  | "certificate"
  | "passport"
  | "language_test"
  | "application"
  | "other"

/** 文档信息 */
export interface Document {
  id: string
  user_id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  category: DocumentCategory
  created_at: string
  updated_at: string | null
}

/** 文档列表响应（含存储用量） */
export interface DocumentListResponse {
  items: Document[]
  total: number
  page: number
  page_size: number
  total_pages: number
  storage_used: number
  storage_quota: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  sort_order: number
  article_count: number
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AuthResponse {
  user: User
  step: string | null
}
