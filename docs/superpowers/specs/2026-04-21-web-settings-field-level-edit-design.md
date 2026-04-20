# 网页设置字段级编辑改造

## 概述

将网页设置页面的编辑模式从"区域级"改为"字段级"：每个数据字段对应一个 EditableOverlay（铅笔+虚线框），点击后弹出只含该字段的编辑弹窗。消除不一致的编辑入口（如绿色"编辑文字"按钮），统一交互模式。

## 核心原则

1. **一个数据字段 = 一个 EditableOverlay**：虚线框精确包裹对应文字，不出现大框包多项
2. **同一 LocalizedField 的多语言渲染合并**：如 `brand_name` 的中文和英文显示在一个 EditableOverlay 内
3. **紧密关联的不同字段允许合并**：如 `hotline` + `hotline_contact` 视觉紧邻，合并为一个编辑入口
4. **复用数据源的字段可就近编辑**：Footer 的 phone 和联系信息的 phone 指向同一 `contact_info.phone`，两处都能编辑
5. **所有文字预留默认值**：未编辑过的字段使用翻译文件中的默认值渲染
6. **编辑支持中英日德四语**：中文自动从默认值填充，英/日/德可选

## 完整字段映射

### Header 区域（3 个编辑点）

| 编辑区域 | 包裹内容 | configKey | 弹窗字段 | 类型 |
|---------|---------|-----------|---------|------|
| 品牌 | Logo + 中文名 + 英文名 | `site_info` | `brand_name`(多语言) + `logo_url`(图片) | 分组 |
| 标语 | 标语文字 | `site_info` | `tagline`(多语言) | 单字段 |
| 热线 | 电话号码 + 联系人 | `site_info` | `hotline`(纯文本) + `hotline_contact`(多语言) | 分组 |

### Banner 区域（每个页面 1~3 个编辑点）

| 编辑区域 | 包裹内容 | configKey | 弹窗类型 |
|---------|---------|-----------|---------|
| Banner 背景 | 整个 Banner 区域 | `page_banners[{pageKey}]` | BannerEditDialog |
| 标题（仅首页） | hero 标题文字 | `site_info` | `hero_title`(多语言) |
| 副标题（仅首页） | hero 副标题文字 | `site_info` | `hero_subtitle`(多语言) |

适用页面：home, universities, cases, about, 自定义分类。

### 首页独有区域

| 编辑区域 | configKey | 弹窗字段 |
|---------|-----------|---------|
| 统计项（每项独立） | `homepage_stats` | `value`(纯文本) + `label`(多语言)，支持增删 |
| 服务标题 | `site_info` | `services_title`(多语言) |
| 热门留学国家标题 | `site_info` | `destinations_title`(多语言) |

### 关于页区域

| 编辑区域 | configKey | 弹窗字段 |
|---------|-----------|---------|
| Banner 背景 | `page_banners[about]` | BannerEditDialog |
| 公司历史 | `about_info` | `history`(多语言, textarea) |
| 使命 | `about_info` | `mission`(多语言, textarea) |
| 愿景 | `about_info` | `vision`(多语言, textarea) |
| 合作介绍 | `about_info` | `partnership`(多语言, textarea) |
| 统计数据（每项独立） | `homepage_stats` | 同首页，同一数据源 |
| 联系信息（5 个字段各自独立） | `contact_info` | 见下方联系信息区域 |

### 联系信息区域（5 个独立编辑点）

| 编辑区域 | configKey | 弹窗字段 | 图标 |
|---------|-----------|---------|------|
| 办公地址 | `contact_info` | `address`(多语言) | MapPin |
| 咨询热线 | `contact_info` | `phone`(纯文本) | Phone |
| 电子邮箱 | `contact_info` | `email`(纯文本) | Mail |
| 微信咨询 | `contact_info` | `wechat`(纯文本) | MessageCircle |
| 注册地址 | `contact_info` | `registered_address`(多语言) | Building |

"办公时间" → "注册地址"，图标从 Clock 改为 Building。

### Footer 区域（6 个编辑点）

| 编辑区域 | configKey | 弹窗字段 | 备注 |
|---------|-----------|---------|------|
| 品牌名 | `site_info` | `brand_name`(多语言) | 同 Header 数据源 |
| 电话 | `contact_info` | `phone`(纯文本) | 同联系信息数据源 |
| 邮箱 | `contact_info` | `email`(纯文本) | 同联系信息数据源 |
| 微信二维码 | `site_info` | `wechat_qr_url`(图片) | |
| 公司名称 | `site_info` | `company_name`(纯文本) | |
| ICP 备案 | `site_info` | `icp_filing`(纯文本) | |

## 默认值策略

### 渲染默认值

所有文字字段在未设置配置值时，从翻译文件 (`messages/{locale}.json`) 获取默认值渲染。现有组件大部分已实现此逻辑（如 `contactInfo.phone || t("phone")`），需检查覆盖完整性。

### 编辑弹窗默认值

`ConfigEditDialog` 新增 `defaultValues` 参数：

```typescript
interface ConfigEditDialogProps {
  // ...现有属性
  defaultValues?: Record<string, string>
}
```

打开弹窗时：
- 如果多语言字段的中文值为空，自动从 `defaultValues` 填入中文栏
- 英/日/德栏保持空白，显示 placeholder "(可选)"
- 用户可修改中文默认值或保持不变

### 默认值来源

从翻译文件中的对应 key 获取，在调用方（`page.tsx` 或各组件）传入。

## 组件改造清单

### 需要改造

| 组件 | 改造内容 |
|------|---------|
| `Header.tsx` | 调整 EditableOverlay 包裹范围：品牌=Logo+中英文名，标语=单独，热线=号码+联系人 |
| `Footer.tsx` | 拆分 contact 大框为 phone、email 各自独立；品牌名独立 |
| `PagePreview.tsx` | HomePreview：移除绿色"编辑文字"按钮，Banner 内嵌 hero_title 和 hero_subtitle 两个独立 EditableOverlay；services_title 和 destinations_title 独立 |
| `ContactInfoSection.tsx` | 每个联系项独立 EditableOverlay；"办公时间"→"注册地址"（图标 Clock→Building） |
| `AboutContent.tsx` | `MissionVisionSection` 拆分：当前 mission 和 vision 共用一个 `onEdit` prop，需拆为 `onEditMission` + `onEditVision` 两个独立回调，各自包裹独立 EditableOverlay |
| `ConfigEditDialog.tsx` | 新增 `defaultValues` 参数，打开时自动填充中文默认值 |
| `page.tsx`（网页设置） | 重构 handler，从 section 级改为 field 级；传 1~2 个 fields 而非大组 |

### 不需要改造

| 组件 | 原因 |
|------|------|
| `EditableOverlay.tsx` | 现有铅笔+虚线框模式完全适用，复用 |
| `LocalizedInput.tsx` | 四语言输入已实现，复用 |
| `BannerEditDialog.tsx` | Banner 图片管理逻辑不变，复用 |
| `NavEditor.tsx` | 导航编辑逻辑独立，不涉及 |
| `StatsSection.tsx` | 已是每项独立 EditableOverlay，不变 |

## 数据流

### 单字段编辑的合并保存

编辑单个字段时，弹窗仍接收整个 configKey 对象作为 `data`（如 `rawConfig.contactInfo`）。用户修改某个字段后，`formData` 中该字段被更新，其余字段保持原值。保存时发送完整对象：

```
用户点击 "电话" 的铅笔图标
  ↓
EditableOverlay.onClick()
  ↓
setDialogState({
  configKey: "contact_info",
  fields: [{ key: "phone", label: "电话", type: "text", localized: false }],
  data: rawConfig.contactInfo,         // 完整对象：{ address, phone, email, wechat, registered_address }
  defaultValues: { phone: "189-1268-6656" }
})
  ↓
ConfigEditDialog 打开，只显示 phone 字段的编辑控件
  ↓
用户修改 phone → formData = { ...contactInfo, phone: "新号码" }
  ↓
POST /admin/web-settings/list/edit { key: "contact_info", value: formData }
  ↓
fetchAllConfigs() → ConfigProvider 刷新 → Footer 和联系信息区域的 phone 同步更新
```

## 翻译文件变更

`messages/zh.json` 中 `Contact` 命名空间：
- `hoursLabel` → `registeredAddressLabel`（或新增 key）
- `hours` → `registeredAddress`（默认值改为注册地址）

其他语言文件同步更新。

## 不在范围内

- `favicon_url`：已在通用配置页管理
- 后端 API：无需改造，`POST /admin/web-settings/list/edit` 接收完整 configKey 对象，前端合并后发送
- 数据库模型：无变更
