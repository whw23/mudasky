# 网站图片配置系统 — 设计文档

## 概述

完善网站图片配置系统：每个页面 Banner 支持多张背景图配置（轮播），首页 Hero 全屏高度 + 院校搜索框，Logo/favicon 通过 image 表上传，所有配置在 web-settings 中可视化管理。

## 1. 数据模型

### 1.1 新增 config key：`page_banners`

在 `system_config` 表新增一条记录，key 为 `page_banners`，value 为 JSONB：

```json
{
  "home": { "image_ids": ["id1", "id2"] },
  "universities": { "image_ids": ["id3"] },
  "cases": { "image_ids": ["id4"] },
  "study-abroad": { "image_ids": [] },
  "requirements": { "image_ids": [] },
  "visa": { "image_ids": [] },
  "life": { "image_ids": [] },
  "news": { "image_ids": [] },
  "about": { "image_ids": [] }
}
```

每个页面 key 对应 `image_ids` 数组（image 表的 ID）。空数组时 Banner 使用默认渐变背景。

### 1.2 不新增数据库表

复用现有 `system_config` JSONB 存储 + `image` 表。

### 1.3 Logo/favicon 保持现有 URL 字符串

`site_info` 中的 `logo_url`、`favicon_url`、`wechat_qr_url` 继续存 URL 字符串。上传机制改为用 image 表，上传后自动生成 `/api/public/images/detail?id=xxx` 填入。

## 2. Banner 组件改造

### 2.1 Banner.tsx

**Props 变更：**
- `image?: string` → `imageIds?: string[]`（image 表的 ID 数组）
- 新增多图轮播逻辑

**多图轮播：**
- 多张图时自动轮播，淡入淡出效果，5 秒间隔
- 单张图时静态显示
- 空数组或未提供时保持默认渐变背景
- 图片 URL 格式：`/api/public/images/detail?id=${imageId}`

**首页全屏：**
- `large` prop 时高度从 `h-[280px] md:h-[420px]` 改为 `h-screen`（100vh）

## 3. 首页院校搜索

### 3.1 HeroSearch 组件

新建 `frontend/components/home/HeroSearch.tsx`：

- 搜索框（关键词输入）
- 国家下拉（从 `/api/public/universities/countries` 获取）
- 学科大分类下拉（从 `/api/public/disciplines/list` 获取）
- 搜索按钮：跳转到 `/universities?search=xxx&country=xxx&discipline_category_id=xxx`
- 样式：半透明白色背景，适配深色 Banner 背景

### 3.2 UniversitySearch 同步

修改 `frontend/components/public/UniversitySearch.tsx`：
- 从 URL search params 读取初始筛选状态（search、country、discipline_category_id）
- 首页搜索跳转后自动应用筛选

## 4. Web-settings Banner 配置

### 4.1 BannerImageEditor 组件

新建 `frontend/components/admin/web-settings/BannerImageEditor.tsx`：

- 当前页面的 Banner 图片列表（缩略图展示）
- 上传按钮：上传图片到 image 表（通过 admin universities 同类接口），获取 image_id
- 删除按钮：从 image_ids 数组中移除
- 拖拽排序：调整图片顺序

### 4.2 集成到 web-settings 页面

每个 tab 的页面预览区域顶部加入 BannerImageEditor：
- 点击 Banner 区域可编辑 Banner 图片
- 实时预览：上传后 Banner 区域立即显示图片

### 4.3 Banner 配置 API

**新增 admin 接口：**

- `GET /admin/web-settings/banners` — 获取所有页面的 Banner 配置
- `POST /admin/web-settings/banners/upload` — 上传 Banner 图片（指定 page_key），返回 image_id 并追加到 image_ids
- `POST /admin/web-settings/banners/remove` — 从指定页面移除某张图片
- `POST /admin/web-settings/banners/reorder` — 重排指定页面的图片顺序

**代码组织：**

| 层 | 位置 |
|----|------|
| Admin Router | `api/api/admin/config/web_settings/banners/router.py` |
| Admin Service | `api/api/admin/config/web_settings/banners/service.py` |
| Admin Schemas | `api/api/admin/config/web_settings/banners/schemas.py` |

## 5. Logo/favicon 上传改造

### 5.1 ConfigEditDialog 修改

修改 `frontend/components/admin/ConfigEditDialog.tsx`：

当字段类型为 `image` 时：
- 上传接口从 `/portal/documents/list/upload` 改为 image 表的上传接口
- 上传成功后，将 `/api/public/images/detail?id=${image_id}` 填入字段值
- 预览图使用该 URL

### 5.2 图片上传的 admin 通用接口

新增通用图片上传接口（不绑定具体业务）：

- `POST /admin/web-settings/images/upload` — 上传图片到 image 表，返回 `{ id, url }`
- `url` 格式：`/api/public/images/detail?id=${id}`

## 6. Public API

### 6.1 Banner 配置公开接口

- `GET /api/public/config/banners` — 返回所有页面的 Banner image_ids
- 缓存：`Cache-Control: public, max-age=3600` + ETag（Banner 配置不常变）

### 6.2 前端 ConfigContext 扩展

`ConfigContext` 新增 `pageBanners` 字段：

```typescript
interface PageBanners {
  [pageKey: string]: {
    image_ids: string[]
  }
}
```

各页面从 ConfigContext 读取自己的 banner image_ids，传给 Banner 组件。

## 7. 各页面改造

所有使用 `<Banner>` 的页面：

```tsx
// 改造前
<Banner title={t("pageTitle")} subtitle={t("pageSubtitle")} />

// 改造后
const { pageBanners } = useConfig()
const bannerImages = pageBanners?.["universities"]?.image_ids || []
<Banner title={t("pageTitle")} subtitle={t("pageSubtitle")} imageIds={bannerImages} />
```

首页特殊：
```tsx
<Banner title={t("heroTitle")} subtitle={t("heroSubtitle")} imageIds={bannerImages} large>
  <HeroSearch />
</Banner>
```

Banner 组件新增 `children` prop，首页通过 children 传入搜索框。

## 8. 种子数据

初始化 `page_banners` config，所有页面 image_ids 为空数组。管理员通过 web-settings 上传配置。
