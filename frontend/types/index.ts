/** 全局类型定义，与后端 schemas 对应。 */

export interface User {
  id: string
  phone: string | null
  username: string | null
  is_active: boolean
  two_factor_enabled: boolean
  two_factor_method: string | null
  storage_quota: number
  permissions: string[]
  role_id: string | null
  role_name: string | null
  created_at: string
  updated_at: string | null
}

/** 角色定义 */
export interface Role {
  id: string
  name: string
  description: string
  is_builtin: boolean
  sort_order: number
  permissions: string[]
  user_count: number
  created_at: string
  updated_at: string | null
}

/** 学生信息 */
export interface Student {
  id: string
  phone: string | null
  username: string | null
  is_active: boolean
  contact_status: string | null
  contact_note: string | null
  advisor_id: string | null
  storage_quota: number
  created_at: string
  updated_at: string | null
}

/** 联系记录 */
export interface ContactRecord {
  id: string
  user_id: string
  staff_id: string
  action: string
  note: string | null
  created_at: string
}

export interface Article {
  id: string
  title: string
  slug: string
  content_type: "markdown" | "file"
  content: string
  file_id: string | null
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

/** 成功案例 */
export interface SuccessCase {
  id: string
  student_name: string
  university: string
  program: string
  year: number
  testimonial: string | null
  avatar_url: string | null
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string | null
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

/** 合作院校 */
export interface University {
  id: string
  name: string
  name_en: string | null
  country: string
  province: string | null
  city: string
  logo_url: string | null
  description: string | null
  programs: string[]
  website: string | null
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string | null
  logo_image_id: string | null
  image_ids: string[]
  disciplines: { id: string; name: string; category_name: string }[]
  admission_requirements: string | null
  scholarship_info: string | null
  qs_rankings: { year: number; ranking: number }[] | null
  latitude: number | null
  longitude: number | null
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
