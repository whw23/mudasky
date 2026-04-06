/**
 * axios 实例封装
 * 包含请求拦截器（添加自定义头）和响应拦截器（自动刷新 token）
 */

import axios from "axios"

/** 标记是否正在刷新 token，防止并发刷新 */
let isRefreshing = false

/** 等待 token 刷新的请求队列 */
let pendingRequests: Array<() => void> = []

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
})

/** 请求拦截器：添加 X-Requested-With 头 */
api.interceptors.request.use((config) => {
  config.headers["X-Requested-With"] = "XMLHttpRequest"
  return config
})

/** 响应拦截器：处理 token 过期自动刷新 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    /* 如果是 token 过期错误且尚未重试 */
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
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
        /* 刷新失败，清空队列 */
        pendingRequests = []
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
