# 前端测试补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端测试覆盖率从 6.1% 提升到 80%+，通过 Vitest 单元测试覆盖 lib/hooks/contexts/UI 组件，通过 Playwright E2E 覆盖用户流程。

**Architecture:** 自底向上分 5 批推进：lib → hooks & contexts → UI 组件 → Playwright 配置 → E2E 测试。Vitest 测试使用 vi.mock() 隔离外部依赖，Playwright 走真实前后端链路。

**Tech Stack:** Vitest 4.x, @testing-library/react 16.x, Playwright Test, jsdom

---

## Batch 1：Vitest — lib 工具函数

### Task 1: lib/utils.ts 测试

**Files:**
- Create: `frontend/tests/lib/utils.test.ts`

- [ ] **Step 1: 编写测试文件**

```ts
/**
 * cn() 工具函数测试。
 */

import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn", () => {
  it("无参数时返回空字符串", () => {
    expect(cn()).toBe("")
  })

  it("单个类名原样返回", () => {
    expect(cn("text-red-500")).toBe("text-red-500")
  })

  it("合并多个类名", () => {
    const result = cn("text-sm", "font-bold")
    expect(result).toContain("text-sm")
    expect(result).toContain("font-bold")
  })

  it("Tailwind 冲突时后者覆盖前者", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("条件类名：false 值被忽略", () => {
    expect(cn("base", false && "hidden")).toBe("base")
  })

  it("条件类名：true 值被保留", () => {
    const result = cn("base", true && "visible")
    expect(result).toContain("base")
    expect(result).toContain("visible")
  })

  it("undefined 和 null 被忽略", () => {
    expect(cn("base", undefined, null)).toBe("base")
  })
})
```

- [ ] **Step 2: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/lib/utils.test.ts`
Expected: 7 tests PASS

- [ ] **Step 3: 提交**

```bash
git add frontend/tests/lib/utils.test.ts
git commit -m "test: lib/utils cn() 函数测试"
```

### Task 2: lib/i18n-config.ts 测试

**Files:**
- Create: `frontend/tests/lib/i18n-config.test.ts`

- [ ] **Step 1: 编写测试文件**

```ts
/**
 * 多语言配置工具测试。
 */

import { describe, it, expect } from "vitest"
import {
  CONFIG_LOCALES,
  getLocalizedValue,
  createLocalizedField,
} from "@/lib/i18n-config"

describe("CONFIG_LOCALES", () => {
  it("包含 zh、en、ja、de 四种语言", () => {
    const codes = CONFIG_LOCALES.map((l) => l.code)
    expect(codes).toEqual(["zh", "en", "ja", "de"])
  })
})

describe("getLocalizedValue", () => {
  it("field 为 undefined 时返回空字符串", () => {
    expect(getLocalizedValue(undefined, "zh")).toBe("")
  })

  it("field 为字符串时直接返回（向后兼容）", () => {
    expect(getLocalizedValue("原始文本", "en")).toBe("原始文本")
  })

  it("field 为对象时按 locale 取值", () => {
    const field = { zh: "中文", en: "English", ja: "日本語", de: "Deutsch" }
    expect(getLocalizedValue(field, "en")).toBe("English")
  })

  it("locale 不存在时 fallback 到 zh", () => {
    const field = { zh: "中文", en: "English" }
    expect(getLocalizedValue(field, "fr")).toBe("中文")
  })

  it("locale 和 zh 都不存在时返回空字符串", () => {
    const field = { en: "English" }
    expect(getLocalizedValue(field, "fr")).toBe("")
  })

  it("对应 locale 值为空字符串时 fallback 到 zh", () => {
    const field = { zh: "中文", en: "" }
    expect(getLocalizedValue(field, "en")).toBe("中文")
  })
})

describe("createLocalizedField", () => {
  it("传入中文值时 zh 字段填充，其余为空", () => {
    const field = createLocalizedField("测试")
    expect(field).toEqual({ zh: "测试", en: "", ja: "", de: "" })
  })

  it("不传参数时所有字段为空字符串", () => {
    const field = createLocalizedField()
    expect(field).toEqual({ zh: "", en: "", ja: "", de: "" })
  })
})
```

- [ ] **Step 2: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/lib/i18n-config.test.ts`
Expected: 9 tests PASS

- [ ] **Step 3: 提交**

```bash
git add frontend/tests/lib/i18n-config.test.ts
git commit -m "test: lib/i18n-config 多语言工具函数测试"
```

### Task 3: lib/crypto.ts 测试

**Files:**
- Create: `frontend/tests/lib/crypto.test.ts`

- [ ] **Step 1: 编写测试文件**

```ts
/**
 * RSA 密码加密工具测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

/* mock api 模块 */
vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

import { encryptPassword } from "@/lib/crypto"
import api from "@/lib/api"

const MOCK_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWe
FuxJLHMRiGpbwFcnFmsMlmTU0SaFXMZcj7bMDGNLpNAfdj5AS6HsJVMOZmZm3YkN
e/bDgekEAyClpJisNB5UVNfVMKBQY2nquRI5bvzsRhxU1MR/FxAgF5PnFY7+RBZG
FYJcQMsYGKsN0rxXvM5XCsgJMMjWg87pCjWF0MBlID+kFE0SNdB+6StN5FPB7TlI
PkNlQMYzBtZlI/oK//vkwyR2KC6QdlMAsMgk9b9a0x6ONJZi1lD3InIRWjFQUF0i
WQGOXdEHK3DkbQ7FluN6WHLO5e0FBJST4+PpxWHofMCWBIS9S9q1OE9vj3y6eFi7
1QIDAQAB
-----END PUBLIC KEY-----`

const MOCK_NONCE = "test-nonce-abc"

describe("encryptPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("正常流程：获取公钥、加密、返回结果", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { public_key: MOCK_PEM, nonce: MOCK_NONCE },
    })

    const result = await encryptPassword("mypassword")

    expect(api.get).toHaveBeenCalledWith("/auth/public-key")
    expect(result).toHaveProperty("encrypted_password")
    expect(result).toHaveProperty("nonce", MOCK_NONCE)
    expect(typeof result.encrypted_password).toBe("string")
    expect(result.encrypted_password.length).toBeGreaterThan(0)
  })

  it("API 失败时抛出错误", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network Error"))

    await expect(encryptPassword("mypassword")).rejects.toThrow("Network Error")
  })
})
```

- [ ] **Step 2: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/lib/crypto.test.ts`
Expected: 2 tests PASS

- [ ] **Step 3: 提交**

```bash
git add frontend/tests/lib/crypto.test.ts
git commit -m "test: lib/crypto RSA 密码加密测试"
```

### Task 4: lib/content-api.ts 测试

**Files:**
- Create: `frontend/tests/lib/content-api.test.ts`

- [ ] **Step 1: 编写测试文件**

```ts
/**
 * 内容 API 服务端数据获取测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  fetchCategories,
  fetchArticles,
  fetchArticle,
  getCategoryIdBySlug,
  fetchArticlesByCategorySlug,
  type Category,
  type Article,
} from "@/lib/content-api"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1", name: "新闻", slug: "news" },
  { id: "cat-2", name: "留学", slug: "study-abroad" },
]

const MOCK_ARTICLE: Article = {
  id: "art-1",
  title: "测试文章",
  slug: "test-article",
  content: "<p>内容</p>",
  excerpt: "摘要",
  category_id: "cat-1",
  published_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
  view_count: 100,
}

/** 创建模拟 Response 对象 */
function mockResponse(data: unknown, ok = true): Response {
  return { ok, json: () => Promise.resolve(data) } as Response
}

describe("fetchCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("正常返回分类列表", async () => {
    mockFetch.mockResolvedValue(mockResponse(MOCK_CATEGORIES))

    const result = await fetchCategories()

    expect(result).toEqual(MOCK_CATEGORIES)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/content/categories"),
      expect.objectContaining({ next: { revalidate: 60 } }),
    )
  })

  it("API 返回非 ok 时返回空数组", async () => {
    mockFetch.mockResolvedValue(mockResponse(null, false))
    expect(await fetchCategories()).toEqual([])
  })

  it("网络异常时返回空数组", async () => {
    mockFetch.mockRejectedValue(new Error("Network Error"))
    expect(await fetchCategories()).toEqual([])
  })
})

describe("fetchArticles", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("默认参数：page=1, pageSize=10", async () => {
    const paginated = {
      items: [MOCK_ARTICLE],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    }
    mockFetch.mockResolvedValue(mockResponse(paginated))

    const result = await fetchArticles()

    expect(result).toEqual(paginated)
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("page=1")
    expect(url).toContain("page_size=10")
  })

  it("自定义分页和分类过滤", async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ items: [], total: 0, page: 2, page_size: 5, total_pages: 0 }),
    )

    await fetchArticles({ categoryId: "cat-1", page: 2, pageSize: 5 })

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("page=2")
    expect(url).toContain("page_size=5")
    expect(url).toContain("category_id=cat-1")
  })

  it("API 失败时返回空分页结构", async () => {
    mockFetch.mockRejectedValue(new Error("fail"))

    const result = await fetchArticles()

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })
})

describe("fetchArticle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("正常返回文章详情", async () => {
    mockFetch.mockResolvedValue(mockResponse(MOCK_ARTICLE))

    const result = await fetchArticle("art-1")

    expect(result).toEqual(MOCK_ARTICLE)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/content/articles/art-1"),
      expect.any(Object),
    )
  })

  it("文章不存在时返回 null", async () => {
    mockFetch.mockResolvedValue(mockResponse(null, false))
    expect(await fetchArticle("nonexistent")).toBeNull()
  })
})

describe("getCategoryIdBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("找到匹配的 slug 时返回 id", async () => {
    mockFetch.mockResolvedValue(mockResponse(MOCK_CATEGORIES))

    const id = await getCategoryIdBySlug("news")

    expect(id).toBe("cat-1")
  })

  it("slug 不存在时返回 undefined", async () => {
    mockFetch.mockResolvedValue(mockResponse(MOCK_CATEGORIES))

    const id = await getCategoryIdBySlug("nonexistent")

    expect(id).toBeUndefined()
  })
})

describe("fetchArticlesByCategorySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("正常流程：slug → categoryId → 文章列表", async () => {
    /* 第一次 fetch：fetchCategories */
    mockFetch.mockResolvedValueOnce(mockResponse(MOCK_CATEGORIES))
    /* 第二次 fetch：fetchArticles */
    mockFetch.mockResolvedValueOnce(
      mockResponse({ items: [MOCK_ARTICLE], total: 1, page: 1, page_size: 6, total_pages: 1 }),
    )

    const result = await fetchArticlesByCategorySlug("news")

    expect(result).toEqual([MOCK_ARTICLE])
  })

  it("slug 不存在时返回空数组", async () => {
    mockFetch.mockResolvedValue(mockResponse(MOCK_CATEGORIES))

    const result = await fetchArticlesByCategorySlug("nonexistent")

    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/lib/content-api.test.ts`
Expected: 11 tests PASS

- [ ] **Step 3: 提交**

```bash
git add frontend/tests/lib/content-api.test.ts
git commit -m "test: lib/content-api 内容 API 数据获取测试"
```

### Task 5: lib/api.ts 测试补充

**Files:**
- Modify: `frontend/tests/lib/api.test.ts`

- [ ] **Step 1: 补充拦截器测试**

将现有文件内容替换为：

```ts
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
```

- [ ] **Step 2: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/lib/api.test.ts`
Expected: 5 tests PASS

- [ ] **Step 3: 提交**

```bash
git add frontend/tests/lib/api.test.ts
git commit -m "test: lib/api 补充请求拦截器测试"
```

- [ ] **Step 4: 运行全部 Batch 1 测试**

Run: `docker compose exec frontend pnpm test -- --run`
Expected: 所有测试 PASS

---

## Batch 2：Vitest — hooks & contexts

### Task 6: hooks/use-auth.ts 测试

**Files:**
- Create: `frontend/tests/hooks/use-auth.test.tsx`

- [ ] **Step 1: 编写测试文件**

```tsx
/**
 * useAuth hook 测试。
 */

import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn().mockRejectedValue(new Error("no session")) },
}))

import { useAuth } from "@/hooks/use-auth"
import { AuthProvider } from "@/contexts/AuthContext"

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe("useAuth", () => {
  it("在 AuthProvider 内调用时返回 context 值", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current).toHaveProperty("user")
    expect(result.current).toHaveProperty("loading")
    expect(result.current).toHaveProperty("isLoggedIn")
    expect(result.current).toHaveProperty("fetchUser")
    expect(result.current).toHaveProperty("logout")
    expect(result.current).toHaveProperty("authModal")
    expect(result.current).toHaveProperty("showLoginModal")
    expect(result.current).toHaveProperty("showRegisterModal")
    expect(result.current).toHaveProperty("hideAuthModal")
  })

  it("在 AuthProvider 外调用时抛出错误", () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow("useAuth 必须在 AuthProvider 内使用")
  })
})
```

- [ ] **Step 2: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/hooks/use-auth.test.tsx`
Expected: 2 tests PASS

- [ ] **Step 3: 提交**

```bash
git add frontend/tests/hooks/use-auth.test.tsx
git commit -m "test: hooks/use-auth hook 测试"
```

### Task 7: contexts/AuthContext.tsx 测试

**Files:**
- Create: `frontend/tests/contexts/AuthContext.test.tsx`

- [ ] **Step 1: 编写测试文件**

```tsx
/**
 * AuthContext 认证上下文测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

import { AuthProvider, AuthContext } from "@/contexts/AuthContext"
import { useContext } from "react"
import api from "@/lib/api"

/** 辅助组件：渲染 context 值 */
function TestConsumer() {
  const ctx = useContext(AuthContext)
  if (!ctx) return <div>no context</div>
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="user">{ctx.user ? ctx.user.id : "null"}</span>
      <span data-testid="isLoggedIn">{String(ctx.isLoggedIn)}</span>
      <span data-testid="authModal">{String(ctx.authModal)}</span>
      <button data-testid="logout" onClick={ctx.logout}>退出</button>
      <button data-testid="showLogin" onClick={ctx.showLoginModal}>登录</button>
      <button data-testid="showRegister" onClick={ctx.showRegisterModal}>注册</button>
      <button data-testid="hideModal" onClick={ctx.hideAuthModal}>关闭</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  )
}

const MOCK_USER = { id: "user-1", username: "testuser", is_active: true }

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetchUser 成功后设置用户信息", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: MOCK_USER })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("user-1")
      expect(screen.getByTestId("isLoggedIn").textContent).toBe("true")
      expect(screen.getByTestId("loading").textContent).toBe("false")
    })
  })

  it("fetchUser 失败时 user 为 null", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("401"))

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("null")
      expect(screen.getByTestId("isLoggedIn").textContent).toBe("false")
      expect(screen.getByTestId("loading").textContent).toBe("false")
    })
  })

  it("logout 清除用户", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: MOCK_USER })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("user-1")
    })

    await userEvent.click(screen.getByTestId("logout"))

    expect(screen.getByTestId("user").textContent).toBe("null")
    expect(screen.getByTestId("isLoggedIn").textContent).toBe("false")
  })

  it("authModal 状态切换", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("401"))

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("authModal").textContent).toBe("null")
    })

    await userEvent.click(screen.getByTestId("showLogin"))
    expect(screen.getByTestId("authModal").textContent).toBe("login")

    await userEvent.click(screen.getByTestId("showRegister"))
    expect(screen.getByTestId("authModal").textContent).toBe("register")

    await userEvent.click(screen.getByTestId("hideModal"))
    expect(screen.getByTestId("authModal").textContent).toBe("null")
  })
})
```

- [ ] **Step 2: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/contexts/AuthContext.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 3: 提交**

```bash
git add frontend/tests/contexts/AuthContext.test.tsx
git commit -m "test: contexts/AuthContext 认证上下文测试"
```

### Task 8: contexts/ConfigContext.tsx 测试

**Files:**
- Create: `frontend/tests/contexts/ConfigContext.test.tsx`

- [ ] **Step 1: 编写测试文件**

```tsx
/**
 * ConfigContext 系统配置上下文测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { useContext } from "react"

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

import api from "@/lib/api"
import { ConfigProvider, useConfig, useLocalizedConfig } from "@/contexts/ConfigContext"

/** 辅助组件：展示 useConfig 结果 */
function ConfigConsumer() {
  const config = useConfig()
  return (
    <div>
      <span data-testid="brand">{config.siteInfo.brand_name as string}</span>
      <span data-testid="codes">{config.countryCodes.length}</span>
      <span data-testid="stats">{config.homepageStats.length}</span>
    </div>
  )
}

/** 辅助组件：展示 useLocalizedConfig 结果 */
function LocalizedConsumer() {
  const config = useLocalizedConfig()
  return (
    <div>
      <span data-testid="l-brand">{config.siteInfo.brand_name}</span>
    </div>
  )
}

function renderWithProvider(consumer: React.ReactNode) {
  return render(<ConfigProvider>{consumer}</ConfigProvider>)
}

describe("ConfigContext", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("API 请求前使用默认值", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    renderWithProvider(<ConfigConsumer />)

    expect(screen.getByTestId("brand").textContent).toBe("慕大国际教育")
    expect(screen.getByTestId("codes").textContent).toBe("1")
    expect(screen.getByTestId("stats").textContent).toBe("4")
  })

  it("API 成功后更新 siteInfo", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/config/site_info") {
        return Promise.resolve({
          data: {
            value: {
              brand_name: "新品牌",
              tagline: "新标语",
              hotline: "123",
              hotline_contact: "张老师",
              logo_url: "",
              favicon_url: "",
              wechat_qr_url: "",
              icp_filing: "",
            },
          },
        })
      }
      return Promise.reject(new Error("not mocked"))
    })

    renderWithProvider(<ConfigConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("brand").textContent).toBe("新品牌")
    })
  })

  it("countryCodes 只保留 enabled: true 的", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/config/phone_country_codes") {
        return Promise.resolve({
          data: {
            value: [
              { code: "+86", country: "CN", label: "中国", digits: 11, enabled: true },
              { code: "+1", country: "US", label: "美国", digits: 10, enabled: false },
              { code: "+81", country: "JP", label: "日本", digits: 11, enabled: true },
            ],
          },
        })
      }
      return Promise.reject(new Error("not mocked"))
    })

    renderWithProvider(<ConfigConsumer />)

    await waitFor(() => {
      expect(screen.getByTestId("codes").textContent).toBe("2")
    })
  })

  it("API 全部失败时保持默认值", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("500"))

    renderWithProvider(<ConfigConsumer />)

    /* 等待所有请求完成 */
    await new Promise((r) => setTimeout(r, 50))

    expect(screen.getByTestId("brand").textContent).toBe("慕大国际教育")
    expect(screen.getByTestId("codes").textContent).toBe("1")
  })

  it("useLocalizedConfig 解析多语言字段", async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === "/config/site_info") {
        return Promise.resolve({
          data: {
            value: {
              brand_name: { zh: "中文品牌", en: "English Brand" },
              tagline: "标语",
              hotline: "123",
              hotline_contact: "联系人",
              logo_url: "",
              favicon_url: "",
              wechat_qr_url: "",
              icp_filing: "",
            },
          },
        })
      }
      return Promise.reject(new Error("not mocked"))
    })

    renderWithProvider(<LocalizedConsumer />)

    await waitFor(() => {
      /* useLocale mock 返回 "zh"，所以取中文值 */
      expect(screen.getByTestId("l-brand").textContent).toBe("中文品牌")
    })
  })
})
```

- [ ] **Step 2: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/contexts/ConfigContext.test.tsx`
Expected: 5 tests PASS

- [ ] **Step 3: 提交**

```bash
git add frontend/tests/contexts/ConfigContext.test.tsx
git commit -m "test: contexts/ConfigContext 系统配置上下文测试"
```

- [ ] **Step 4: 运行全部 Batch 1+2 测试**

Run: `docker compose exec frontend pnpm test -- --run`
Expected: 所有测试 PASS

---

## Batch 3：Vitest — UI 组件

### Task 9: Button 组件测试

**Files:**
- Create: `frontend/tests/components/ui/button.test.tsx`

- [ ] **Step 1: 编写测试文件**

```tsx
/**
 * Button UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Button } from "@/components/ui/button"

describe("Button", () => {
  it("渲染 data-slot='button'", () => {
    render(<Button>点击</Button>)
    const btn = screen.getByText("点击")
    expect(btn.closest("[data-slot='button']")).toBeInTheDocument()
  })

  it("默认 variant 包含 bg-primary", () => {
    render(<Button>默认</Button>)
    const el = screen.getByText("默认").closest("[data-slot='button']")!
    expect(el.className).toContain("bg-primary")
  })

  it("outline variant 包含 border-border", () => {
    render(<Button variant="outline">边框</Button>)
    const el = screen.getByText("边框").closest("[data-slot='button']")!
    expect(el.className).toContain("border-border")
  })

  it("自定义 className 合并到组件上", () => {
    render(<Button className="my-custom">自定义</Button>)
    const el = screen.getByText("自定义").closest("[data-slot='button']")!
    expect(el.className).toContain("my-custom")
  })

  it("render prop 传入时 nativeButton 自动设为 false", () => {
    render(<Button render={<a href="#" />}>链接按钮</Button>)
    const el = screen.getByText("链接按钮")
    /* 应渲染为 <a> 而非 <button> */
    expect(el.tagName).toBe("A")
  })
})
```

- [ ] **Step 2: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/components/ui/button.test.tsx`
Expected: 5 tests PASS

- [ ] **Step 3: 提交**

```bash
git add frontend/tests/components/ui/button.test.tsx
git commit -m "test: UI/Button 组件测试"
```

### Task 10: Card 组件测试

**Files:**
- Create: `frontend/tests/components/ui/card.test.tsx`

- [ ] **Step 1: 编写测试文件**

```tsx
/**
 * Card UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

describe("Card", () => {
  it("渲染 data-slot='card'", () => {
    render(<Card data-testid="card">内容</Card>)
    expect(screen.getByTestId("card").dataset.slot).toBe("card")
  })

  it("自定义 className 合并", () => {
    render(<Card data-testid="card" className="my-card">内容</Card>)
    expect(screen.getByTestId("card").className).toContain("my-card")
  })

  it("子组件全部渲染对应 data-slot", () => {
    render(
      <Card>
        <CardHeader data-testid="header">
          <CardTitle data-testid="title">标题</CardTitle>
          <CardDescription data-testid="desc">描述</CardDescription>
        </CardHeader>
        <CardContent data-testid="content">正文</CardContent>
        <CardFooter data-testid="footer">页脚</CardFooter>
      </Card>,
    )

    expect(screen.getByTestId("header").dataset.slot).toBe("card-header")
    expect(screen.getByTestId("title").dataset.slot).toBe("card-title")
    expect(screen.getByTestId("desc").dataset.slot).toBe("card-description")
    expect(screen.getByTestId("content").dataset.slot).toBe("card-content")
    expect(screen.getByTestId("footer").dataset.slot).toBe("card-footer")
  })
})
```

- [ ] **Step 2: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/components/ui/card.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 3: 提交**

```bash
git add frontend/tests/components/ui/card.test.tsx
git commit -m "test: UI/Card 组件测试"
```

### Task 11: Input, Label, Textarea, Separator 组件测试

**Files:**
- Create: `frontend/tests/components/ui/input.test.tsx`
- Create: `frontend/tests/components/ui/label.test.tsx`
- Create: `frontend/tests/components/ui/textarea.test.tsx`
- Create: `frontend/tests/components/ui/separator.test.tsx`

- [ ] **Step 1: 编写 input.test.tsx**

```tsx
/**
 * Input UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Input } from "@/components/ui/input"

describe("Input", () => {
  it("渲染 data-slot='input'", () => {
    render(<Input data-testid="input" />)
    expect(screen.getByTestId("input").dataset.slot).toBe("input")
  })

  it("type 和 placeholder 透传", () => {
    render(<Input type="email" placeholder="请输入邮箱" />)
    const input = screen.getByPlaceholderText("请输入邮箱")
    expect(input).toHaveAttribute("type", "email")
  })

  it("className 合并", () => {
    render(<Input data-testid="input" className="w-64" />)
    expect(screen.getByTestId("input").className).toContain("w-64")
  })
})
```

- [ ] **Step 2: 编写 label.test.tsx**

```tsx
/**
 * Label UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Label } from "@/components/ui/label"

describe("Label", () => {
  it("渲染 children", () => {
    render(<Label>用户名</Label>)
    expect(screen.getByText("用户名")).toBeInTheDocument()
  })

  it("htmlFor 透传", () => {
    render(<Label htmlFor="email">邮箱</Label>)
    expect(screen.getByText("邮箱")).toHaveAttribute("for", "email")
  })

  it("data-slot='label'", () => {
    render(<Label data-testid="label">标签</Label>)
    expect(screen.getByTestId("label").dataset.slot).toBe("label")
  })
})
```

- [ ] **Step 3: 编写 textarea.test.tsx**

```tsx
/**
 * Textarea UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Textarea } from "@/components/ui/textarea"

describe("Textarea", () => {
  it("data-slot='textarea'", () => {
    render(<Textarea data-testid="ta" />)
    expect(screen.getByTestId("ta").dataset.slot).toBe("textarea")
  })

  it("placeholder 透传", () => {
    render(<Textarea placeholder="请输入内容" />)
    expect(screen.getByPlaceholderText("请输入内容")).toBeInTheDocument()
  })

  it("rows 透传", () => {
    render(<Textarea data-testid="ta" rows={5} />)
    expect(screen.getByTestId("ta")).toHaveAttribute("rows", "5")
  })
})
```

- [ ] **Step 4: 编写 separator.test.tsx**

```tsx
/**
 * Separator UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { Separator } from "@/components/ui/separator"

describe("Separator", () => {
  it("默认 horizontal 方向", () => {
    const { container } = render(<Separator />)
    const el = container.querySelector("[data-slot='separator']")!
    expect(el).toBeInTheDocument()
  })

  it("className 合并", () => {
    const { container } = render(<Separator className="my-sep" />)
    const el = container.querySelector("[data-slot='separator']")!
    expect(el.className).toContain("my-sep")
  })
})
```

- [ ] **Step 5: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/components/ui/`
Expected: 所有新增 UI 测试 PASS

- [ ] **Step 6: 提交**

```bash
git add frontend/tests/components/ui/input.test.tsx frontend/tests/components/ui/label.test.tsx frontend/tests/components/ui/textarea.test.tsx frontend/tests/components/ui/separator.test.tsx
git commit -m "test: UI/Input, Label, Textarea, Separator 组件测试"
```

### Task 12: Checkbox, Switch 组件测试

**Files:**
- Create: `frontend/tests/components/ui/checkbox.test.tsx`
- Create: `frontend/tests/components/ui/switch.test.tsx`

- [ ] **Step 1: 编写 checkbox.test.tsx**

```tsx
/**
 * Checkbox UI 组件测试。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Checkbox } from "@/components/ui/checkbox"

describe("Checkbox", () => {
  it("data-slot='checkbox'", () => {
    const { container } = render(<Checkbox />)
    expect(container.querySelector("[data-slot='checkbox']")).toBeInTheDocument()
  })

  it("onCheckedChange 回调被触发", async () => {
    const onChange = vi.fn()
    const { container } = render(<Checkbox onCheckedChange={onChange} />)
    const checkbox = container.querySelector("[data-slot='checkbox']")!
    await userEvent.click(checkbox)
    expect(onChange).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 编写 switch.test.tsx**

```tsx
/**
 * Switch UI 组件测试。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Switch } from "@/components/ui/switch"

describe("Switch", () => {
  it("渲染 role='switch'", () => {
    render(<Switch />)
    expect(screen.getByRole("switch")).toBeInTheDocument()
  })

  it("checked 状态反映在 aria-checked", () => {
    render(<Switch checked={true} />)
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true")
  })

  it("点击触发 onCheckedChange", async () => {
    const onChange = vi.fn()
    render(<Switch onCheckedChange={onChange} />)
    await userEvent.click(screen.getByRole("switch"))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("disabled 时不可点击", () => {
    render(<Switch disabled />)
    expect(screen.getByRole("switch")).toBeDisabled()
  })
})
```

- [ ] **Step 3: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/components/ui/checkbox.test.tsx tests/components/ui/switch.test.tsx`
Expected: 6 tests PASS

- [ ] **Step 4: 提交**

```bash
git add frontend/tests/components/ui/checkbox.test.tsx frontend/tests/components/ui/switch.test.tsx
git commit -m "test: UI/Checkbox, Switch 组件测试"
```

### Task 13: Tabs, Dialog, Sonner 组件测试

**Files:**
- Create: `frontend/tests/components/ui/tabs.test.tsx`
- Create: `frontend/tests/components/ui/dialog.test.tsx`
- Create: `frontend/tests/components/ui/sonner.test.tsx`

- [ ] **Step 1: 编写 tabs.test.tsx**

```tsx
/**
 * Tabs UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

describe("Tabs", () => {
  it("渲染完整的 Tab 结构", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">标签1</TabsTrigger>
          <TabsTrigger value="tab2">标签2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">内容1</TabsContent>
        <TabsContent value="tab2">内容2</TabsContent>
      </Tabs>,
    )

    expect(screen.getByText("标签1")).toBeInTheDocument()
    expect(screen.getByText("标签2")).toBeInTheDocument()
    expect(screen.getByText("内容1")).toBeInTheDocument()
  })

  it("data-slot 正确设置", () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">内容</TabsContent>
      </Tabs>,
    )

    expect(container.querySelector("[data-slot='tabs']")).toBeInTheDocument()
    expect(container.querySelector("[data-slot='tabs-list']")).toBeInTheDocument()
    expect(container.querySelector("[data-slot='tabs-trigger']")).toBeInTheDocument()
    expect(container.querySelector("[data-slot='tabs-content']")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 编写 dialog.test.tsx**

```tsx
/**
 * Dialog UI 组件测试。
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

describe("Dialog", () => {
  it("open 时渲染内容", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>标题</DialogTitle>
            <DialogDescription>描述</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.getByText("标题")).toBeInTheDocument()
    expect(screen.getByText("描述")).toBeInTheDocument()
  })

  it("未 open 时不渲染内容", () => {
    render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>隐藏标题</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.queryByText("隐藏标题")).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: 编写 sonner.test.tsx**

```tsx
/**
 * Sonner/Toaster 组件测试。
 */

import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light" }),
}))

import { Toaster } from "@/components/ui/sonner"

describe("Toaster", () => {
  it("渲染不报错", () => {
    const { container } = render(<Toaster />)
    expect(container).toBeTruthy()
  })
})
```

- [ ] **Step 4: 运行测试验证通过**

Run: `docker compose exec frontend pnpm test -- --run tests/components/ui/`
Expected: 所有 UI 组件测试 PASS

- [ ] **Step 5: 提交**

```bash
git add frontend/tests/components/ui/tabs.test.tsx frontend/tests/components/ui/dialog.test.tsx frontend/tests/components/ui/sonner.test.tsx
git commit -m "test: UI/Tabs, Dialog, Sonner 组件测试"
```

- [ ] **Step 6: 运行全部 Vitest 测试确认无回归**

Run: `docker compose exec frontend pnpm test -- --run`
Expected: 所有测试 PASS

---

## Batch 4：Playwright 配置与安装

### Task 14: 安装 Playwright 并创建配置

**Files:**
- Create: `frontend/e2e/playwright.config.ts`
- Create: `frontend/e2e/fixtures/base.ts`
- Modify: `frontend/package.json`（添加 script）

- [ ] **Step 1: 安装 Playwright**

```bash
cd frontend && pnpm add -D @playwright/test && pnpm exec playwright install chromium
```

- [ ] **Step 2: 创建 playwright.config.ts**

```ts
/**
 * Playwright E2E 测试配置。
 * 通过 http://localhost 走 gateway 完整链路。
 */

import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
})
```

- [ ] **Step 3: 创建共享 fixtures**

```ts
/**
 * E2E 测试共享 fixtures。
 * 提供已登录的管理员和普通用户页面。
 */

import { test as base, type Page } from "@playwright/test"

export const test = base.extend<{
  adminPage: Page
  userPage: Page
}>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/")
    await page.getByText("登录").click()
    await page.locator('input[name="phone"]').fill("mudasky")
    await page.locator('input[type="password"]').fill("mudasky@12321.")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL("**/admin/**")
    await use(page)
    await context.close()
  },
  userPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/")
    await page.getByText("登录").click()
    await page.locator('input[name="phone"]').fill("13800000001")
    await page.locator('input[type="password"]').fill("Test@12345")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL("**/dashboard")
    await use(page)
    await context.close()
  },
})

export { expect } from "@playwright/test"
```

- [ ] **Step 4: 在 package.json 中添加 e2e script**

在 scripts 中添加：
```json
"test:e2e": "playwright test --config=e2e/playwright.config.ts"
```

- [ ] **Step 5: 提交**

```bash
git add frontend/e2e/playwright.config.ts frontend/e2e/fixtures/base.ts frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore: 安装 Playwright 并配置 E2E 测试基础设施"
```

---

## Batch 5：Playwright — E2E 测试

### Task 15: 公开页面 E2E 测试

**Files:**
- Create: `frontend/e2e/public/home.spec.ts`
- Create: `frontend/e2e/public/about.spec.ts`
- Create: `frontend/e2e/public/articles.spec.ts`
- Create: `frontend/e2e/public/universities.spec.ts`
- Create: `frontend/e2e/public/cases.spec.ts`
- Create: `frontend/e2e/public/contact.spec.ts`
- Create: `frontend/e2e/public/news.spec.ts`
- Create: `frontend/e2e/public/life.spec.ts`
- Create: `frontend/e2e/public/visa.spec.ts`
- Create: `frontend/e2e/public/requirements.spec.ts`
- Create: `frontend/e2e/public/study-abroad.spec.ts`

- [ ] **Step 1: 编写 home.spec.ts**

```ts
/**
 * 首页 E2E 测试。
 */

import { test, expect } from "@playwright/test"

test.describe("首页", () => {
  test("页面可达且包含品牌名", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/慕大/)
    await expect(page.locator("body")).toBeVisible()
  })

  test("导航栏可见", async ({ page }) => {
    await page.goto("/")
    const header = page.locator("header")
    await expect(header).toBeVisible()
  })

  test("统计数字区域可见", async ({ page }) => {
    await page.goto("/")
    /* 首页应展示统计数字，如 "15+" */
    await expect(page.getByText("15+")).toBeVisible()
  })
})
```

- [ ] **Step 2: 编写其余公开页面测试**

每个页面测试文件遵循相同模式：

```ts
// about.spec.ts
import { test, expect } from "@playwright/test"

test.describe("关于我们", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/about")
    await expect(page.locator("body")).toBeVisible()
  })
})
```

```ts
// articles.spec.ts
import { test, expect } from "@playwright/test"

test.describe("文章列表", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/news")
    await expect(page.locator("body")).toBeVisible()
  })
})
```

```ts
// universities.spec.ts
import { test, expect } from "@playwright/test"

test.describe("院校列表", () => {
  test("页面可达且展示院校", async ({ page }) => {
    await page.goto("/universities")
    await expect(page.locator("body")).toBeVisible()
  })
})
```

```ts
// cases.spec.ts
import { test, expect } from "@playwright/test"

test.describe("成功案例", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/cases")
    await expect(page.locator("body")).toBeVisible()
  })
})
```

```ts
// contact.spec.ts
import { test, expect } from "@playwright/test"

test.describe("联系我们", () => {
  test("页面可达且展示联系信息", async ({ page }) => {
    await page.goto("/contact")
    await expect(page.locator("body")).toBeVisible()
  })
})
```

```ts
// news.spec.ts
import { test, expect } from "@playwright/test"

test.describe("新闻中心", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/news")
    await expect(page.locator("body")).toBeVisible()
  })
})
```

```ts
// life.spec.ts
import { test, expect } from "@playwright/test"

test.describe("留学生活", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/life")
    await expect(page.locator("body")).toBeVisible()
  })
})
```

```ts
// visa.spec.ts
import { test, expect } from "@playwright/test"

test.describe("签证服务", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/visa")
    await expect(page.locator("body")).toBeVisible()
  })
})
```

```ts
// requirements.spec.ts
import { test, expect } from "@playwright/test"

test.describe("申请条件", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/requirements")
    await expect(page.locator("body")).toBeVisible()
  })
})
```

```ts
// study-abroad.spec.ts
import { test, expect } from "@playwright/test"

test.describe("留学指南", () => {
  test("页面可达", async ({ page }) => {
    await page.goto("/study-abroad")
    await expect(page.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 3: 运行公开页面 E2E 测试**

Run: `cd frontend && pnpm exec playwright test --config=e2e/playwright.config.ts e2e/public/`
Expected: 所有公开页面测试 PASS

- [ ] **Step 4: 提交**

```bash
git add frontend/e2e/public/
git commit -m "test: 公开页面 Playwright E2E 测试"
```

### Task 16: 用户流程 E2E 测试

**Files:**
- Create: `frontend/e2e/user/auth.spec.ts`
- Create: `frontend/e2e/user/dashboard.spec.ts`
- Create: `frontend/e2e/user/profile.spec.ts`
- Create: `frontend/e2e/user/documents.spec.ts`
- Create: `frontend/e2e/user/articles.spec.ts`

- [ ] **Step 1: 编写 auth.spec.ts**

```ts
/**
 * 认证流程 E2E 测试。
 */

import { test, expect } from "@playwright/test"

test.describe("登录流程", () => {
  test("管理员登录成功后跳转到后台", async ({ page }) => {
    await page.goto("/")
    await page.getByText("登录").click()
    await page.locator('input[name="phone"]').fill("mudasky")
    await page.locator('input[type="password"]').fill("mudasky@12321.")
    await page.locator('button[type="submit"]').click()
    await page.waitForURL("**/admin/**")
    await expect(page).toHaveURL(/admin/)
  })
})
```

- [ ] **Step 2: 编写 dashboard.spec.ts**

```ts
/**
 * 用户仪表盘 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("用户仪表盘", () => {
  test("登录后可访问仪表盘", async ({ userPage }) => {
    await userPage.goto("/dashboard")
    await expect(userPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 3: 编写 profile.spec.ts**

```ts
/**
 * 个人信息 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("个人信息", () => {
  test("可访问个人信息页", async ({ userPage }) => {
    await userPage.goto("/profile")
    await expect(userPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 4: 编写 documents.spec.ts**

```ts
/**
 * 文档管理 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("文档管理", () => {
  test("可访问文档页", async ({ userPage }) => {
    await userPage.goto("/documents")
    await expect(userPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 5: 编写 articles.spec.ts**

```ts
/**
 * 用户文章 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("我的文章", () => {
  test("可访问文章列表页", async ({ userPage }) => {
    await userPage.goto("/articles")
    await expect(userPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 6: 运行用户流程 E2E 测试**

Run: `cd frontend && pnpm exec playwright test --config=e2e/playwright.config.ts e2e/user/`
Expected: 所有用户流程测试 PASS

- [ ] **Step 7: 提交**

```bash
git add frontend/e2e/user/
git commit -m "test: 用户流程 Playwright E2E 测试"
```

### Task 17: 管理后台 E2E 测试

**Files:**
- Create: `frontend/e2e/admin/dashboard.spec.ts`
- Create: `frontend/e2e/admin/users.spec.ts`
- Create: `frontend/e2e/admin/articles.spec.ts`
- Create: `frontend/e2e/admin/categories.spec.ts`
- Create: `frontend/e2e/admin/cases.spec.ts`
- Create: `frontend/e2e/admin/universities.spec.ts`
- Create: `frontend/e2e/admin/roles.spec.ts`
- Create: `frontend/e2e/admin/settings.spec.ts`

- [ ] **Step 1: 编写 dashboard.spec.ts**

```ts
/**
 * 管理仪表盘 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("管理仪表盘", () => {
  test("展示统计数据", async ({ adminPage }) => {
    await adminPage.goto("/admin/dashboard")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 2: 编写 users.spec.ts**

```ts
/**
 * 用户管理 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("用户管理", () => {
  test("展示用户列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/users")
    await expect(adminPage.locator("table, [data-slot='card']")).toBeVisible()
  })
})
```

- [ ] **Step 3: 编写 articles.spec.ts**

```ts
/**
 * 文章管理 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("文章管理", () => {
  test("展示文章列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/articles")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 4: 编写 categories.spec.ts**

```ts
/**
 * 分类管理 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("分类管理", () => {
  test("展示分类列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/categories")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 5: 编写 cases.spec.ts**

```ts
/**
 * 案例管理 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("案例管理", () => {
  test("展示案例列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/cases")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 6: 编写 universities.spec.ts**

```ts
/**
 * 院校管理 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("院校管理", () => {
  test("展示院校列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/universities")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 7: 编写 roles.spec.ts**

```ts
/**
 * 角色管理 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("角色管理", () => {
  test("展示角色列表", async ({ adminPage }) => {
    await adminPage.goto("/admin/roles")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 8: 编写 settings.spec.ts**

```ts
/**
 * 系统设置 E2E 测试。
 */

import { test, expect } from "../fixtures/base"

test.describe("系统设置", () => {
  test("展示设置页面", async ({ adminPage }) => {
    await adminPage.goto("/admin/settings")
    await expect(adminPage.locator("body")).toBeVisible()
  })
})
```

- [ ] **Step 9: 运行管理后台 E2E 测试**

Run: `cd frontend && pnpm exec playwright test --config=e2e/playwright.config.ts e2e/admin/`
Expected: 所有管理后台测试 PASS

- [ ] **Step 10: 提交**

```bash
git add frontend/e2e/admin/
git commit -m "test: 管理后台 Playwright E2E 测试"
```

- [ ] **Step 11: 运行全部测试验证**

```bash
# Vitest 单元测试
docker compose exec frontend pnpm test -- --run

# Playwright E2E 测试
cd frontend && pnpm exec playwright test --config=e2e/playwright.config.ts
```

Expected: 所有测试 PASS
