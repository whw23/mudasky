/**
 * axios 实例封装。
 * 包含请求拦截器（添加自定义头）和响应拦截器（自动刷新 token）。
 */

import axios from "axios"

/** 是否保持登录（影响 cookie 有效期） */
let keepLogin = true

/** 设置是否保持登录 */
export function setKeepLogin(value: boolean): void {
  keepLogin = value
}

/** 标记是否正在刷新 token，防止并发刷新 */
let isRefreshing = false

/** 等待 token 刷新的请求队列 */
let pendingRequests: Array<() => void> = []

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
})

/** 请求拦截器：添加自定义头 */
api.interceptors.request.use((config) => {
  config.headers["X-Requested-With"] = "XMLHttpRequest"
  config.headers["X-Keep-Login"] = keepLogin ? "true" : "false"
  return config
})

/** 响应拦截器：处理 token 过期自动刷新 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    /* 如果是 access_token 过期或缺失，尝试用 refresh_token 刷新 */
    const code = error.response?.data?.code
    const isRefreshRequest = originalRequest.url?.includes("/auth/refresh")
    if (
      error.response?.status === 401 &&
      code === "ACCESS_TOKEN_EXPIRED" &&
      !originalRequest._retry &&
      !isRefreshRequest
    ) {
      originalRequest._retry = true

      if (isRefreshing) {
        /* 如果已在刷新，排队等待 */
        return new Promise((resolve) => {
          pendingRequests.push(() => {
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        await api.post("/auth/refresh")
        /* 刷新成功后，执行排队的请求 */
        pendingRequests.forEach((cb) => cb())
        pendingRequests = []
        return api(originalRequest)
      } catch (refreshError) {
        /* 刷新失败，清空队列，跳转首页 */
        pendingRequests = []
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:session-expired"))
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
