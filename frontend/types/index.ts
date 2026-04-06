/**
 * 全局类型定义
 * 与后端 schemas 对应，使用 camelCase 字段命名
 */

/** 用户信息 */
export interface User {
  id: number
  username: string
  email: string
  role: "admin" | "user"
  avatar?: string
  createdAt: string
  updatedAt: string
}

/** 文章 */
export interface Article {
  id: number
  title: string
  summary: string
  content: string
  coverImage?: string
  categoryId: number
  category?: Category
  authorId: number
  author?: User
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

/** 文档 */
export interface Document {
  id: number
  title: string
  fileUrl: string
  fileType: string
  fileSize: number
  userId: number
  createdAt: string
  updatedAt: string
}

/** 分类 */
export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  parentId?: number
  createdAt: string
  updatedAt: string
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** 认证响应 */
export interface AuthResponse {
  accessToken: string
  tokenType: string
  user: User
}
