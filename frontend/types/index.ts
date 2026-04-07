/** 全局类型定义，与后端 schemas 对应。 */

export interface User {
  id: string
  phone: string | null
  username: string | null
  role: string
  is_active: boolean
  is_superuser: boolean
  two_factor_enabled: boolean
  storage_quota: number
  group_ids: string[]
  created_at: string
  updated_at: string | null
}

export interface Article {
  id: string
  title: string
  content: string
  summary: string | null
  cover_image: string | null
  category_id: string
  author_id: string
  status: 'draft' | 'pending' | 'published' | 'rejected'
  published_at: string | null
  created_at: string
  updated_at: string | null
}

export interface Document {
  id: string
  file_name: string
  file_hash: string
  mime_type: string
  file_size: number
  status: string
  created_at: string
  updated_at: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  sort_order: number
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
