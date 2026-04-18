# 首页性能优化 + 水合可见性 设计文档

## 目标

减少首页初始加载的 API 请求数（6→1），交互元素水合前不可见（替代 networkidle），提升加载性能和 E2E 测试稳定性。

## 架构

现有 ConfigProvider 在挂载时并发 6 个 GET 请求。改为：
- 首页必需的 4 项配置合并成 1 个 `/api/public/config/all` 接口
- `phone_country_codes` 移到 PhoneInput 组件按需加载
- `panel_config` 移到面板 layout 按需加载
- Header 交互元素水合前不渲染

## 1. 后端：`/api/public/config/all`

### 接口定义

- 路径：`GET /api/public/config/all`
- 公开接口，无需认证
- 支持 ETag 缓存，`Cache-Control: public, max-age=3600`

### 响应格式

```json
{
  "contact_info": { "phone": "...", "email": "...", "address": "...", ... },
  "site_info": { "company_name": "...", "slogan": "...", ... },
  "homepage_stats": [{ "label": "...", "value": "..." }, ...],
  "about_info": { "content": "..." }
}
```

### ETag 生成

取 4 项配置的 `updated_at` 最大值生成 ETag，任一项更新即缓存失效。

### 现有单独接口

保留不动。后台管理页面修改单项配置后只需刷新对应接口。

## 2. ConfigProvider 改造

### 移除项

- `countryCodes` state 及 `/public/config/phone_country_codes` 请求
- `panelConfig` state 及 `/public/panel-config` 请求
- Context value 中删掉 `countryCodes` 和 `panelConfig`

### 改造项

- `useEffect` 中改为调 1 个 `/public/config/all`
- 响应直接解构到 `contactInfo`、`siteInfo`、`homepageStats`、`aboutInfo`
- 失败时各项使用已有的 `DEFAULT_*` 兜底值

### Context value

改造后只包含：`contactInfo`、`siteInfo`、`homepageStats`、`aboutInfo`。

## 3. `countryCodes` 按需加载

- 从 ConfigContext 移除
- 在 `PhoneInput` 组件内部 `useState` + `useEffect` 加载 `/api/public/config/phone_country_codes`
- 加载前使用 `DEFAULT_COUNTRY_CODES`（+86 中国）兜底
- `SmsCodeButton` 通过 props 从 `PhoneInput` 获取国家码，不直接读 context
- `CountryCodeEditor` 不受影响（已自行调 API）

## 4. `panelConfig` 面板 layout 加载

- 从 ConfigContext 移除
- 在 `app/[locale]/[panel]/layout.tsx` 中加载 `/api/public/panel-config`
- 通过独立的 PanelConfigContext 提供给面板子页面
- 首页不加载此数据

## 5. 水合可见性

### `useHydrated` hook

```typescript
// hooks/useHydrated.ts
"use client"
import { useState, useEffect } from "react"

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])
  return hydrated
}
```

### Header 改造

用 `hydrated &&` 包裹的元素（水合前不渲染）：
- 登录/注册按钮
- 退出按钮
- 管理后台入口按钮
- 语言切换下拉框

保持 SSR 可见的元素：
- Logo + 品牌名
- 导航链接（首页、院校选择等）
- 热线电话

### 移动端菜单

汉堡菜单按钮也用 `hydrated &&` 包裹（点击展开需要 JS）。

## 6. E2E 测试适配

### networkidle 替换

所有导航到首页后等待 header 按钮的 fn：
- `reload-auth.ts`、`auth-flow.ts`、`register.ts`、`logout.ts`、`login.ts`、`disabled-verify.ts`、`public-pages.ts`、`search-filter.ts`、`idor.ts`、`jwt-security.ts`
- 移除 `await page.waitForLoadState("networkidle")`
- 保留 `await loginBtn.waitFor()` / `await logoutBtn.or(loginBtn).first().waitFor()`（按钮出现 = 水合完成）

### 文档删除 AlertDialog 适配

`documents.ts` 的 `deleteDocument` fn：
- 移除 `page.once("dialog", (d) => d.accept())`
- 改为操作 AlertDialog：点击删除按钮 → 等待 AlertDialog 出现 → 点击确认按钮

### shadcn Select 角色分配适配

`assign-role.ts`：
- 当前使用 native setter 操作原生 `<select>`
- 改为操作 shadcn Select：点击 trigger → 等待 popup 出现 → 点击目标 item

### 测试验证

- 全量跑 184 个任务
- 四维度覆盖率 100%
- 0 fail / 0 breaker / 0 timeout
