/**
 * API 客户端配置和拦截器测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import axios from "axios"

/* 每个测试重新创建 api 实例以避免状态污染 */
let api: ReturnType<typeof axios.create>
let setKeepLogin: (value: boolean) => void

/** 动态导入 api 模块，确保模块级状态重置 */
async function loadApi() {
  vi.resetModules()
  const mod = await import("@/lib/api")
  api = mod.default
  setKeepLogin = mod.setKeepLogin
}

describe("api 客户端", () => {
  beforeEach(async () => {
    await loadApi()
  })

  it("baseURL 应为 /api", () => {
    expect(api.defaults.baseURL).toBe("/api")
  })

  it("withCredentials 应为 true", () => {
    expect(api.defaults.withCredentials).toBe(true)
  })
})

describe("请求拦截器", () => {
  beforeEach(async () => {
    await loadApi()
  })

  it("注入 X-Requested-With header", async () => {
    const config = await api.interceptors.request.handlers[0].fulfilled({
      headers: new axios.AxiosHeaders(),
    })
    expect(config.headers["X-Requested-With"]).toBe("XMLHttpRequest")
  })

  it("默认 X-Keep-Login 为 true", async () => {
    const config = await api.interceptors.request.handlers[0].fulfilled({
      headers: new axios.AxiosHeaders(),
    })
    expect(config.headers["X-Keep-Login"]).toBe("true")
  })

  it("setKeepLogin(false) 后 X-Keep-Login 为 false", async () => {
    setKeepLogin(false)
    const config = await api.interceptors.request.handlers[0].fulfilled({
      headers: new axios.AxiosHeaders(),
    })
    expect(config.headers["X-Keep-Login"]).toBe("false")
  })
})
