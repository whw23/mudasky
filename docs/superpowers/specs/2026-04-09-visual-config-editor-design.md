# 可视化配置编辑器 + 多语言配置

## 背景

当前管理后台的"系统设置"页面是纯表单：文本框、文本域、上传按钮。管理员无法直观看到修改后的效果。需要改为可视化预览 + 点击编辑的方式，同时支持多语言配置。

## 目标

1. 设置页面直接渲染前台页面组件（Header、Footer、首页、关于我们）作为预览
2. 点击可编辑区域 → 弹窗编辑，弹窗内显示所有语言的字段
3. 配置数据支持多语言存储，fallback 链：当前语言 → 中文 → 空字符串
4. 向下兼容旧的纯字符串格式数据

## 数据存储变更

### 当前格式（纯字符串）

```json
{
  "brand_name": "慕大国际教育",
  "tagline": "专注国际教育"
}
```

### 新格式（多语言对象）

```json
{
  "brand_name": {
    "zh": "慕大国际教育",
    "en": "MUTU International Education",
    "ja": "ムダ国際教育",
    "de": "MUTU Internationale Bildung"
  },
  "tagline": {
    "zh": "专注国际教育",
    "en": "Focus on International Education"
  }
}
```

### 兼容策略

前端读取时统一用工具函数处理：

```typescript
function getLocalizedValue(
  field: string | Record<string, string>,
  locale: string
): string {
  if (typeof field === "string") return field
  return field[locale] || field["zh"]
}
```

- 纯字符串（旧数据）→ 直接返回
- 多语言对象 → 按 locale 取值，fallback 到中文
- 后端不做 locale 处理，前端负责取值

### 哪些字段需要多语言

**site_info：**

| 字段 | 多语言 | 说明 |
|------|--------|------|
| brand_name | 是 | 品牌名 |
| brand_name_en | 删除 | 合并到 brand_name.en |
| tagline | 是 | 标语 |
| hotline | 否 | 电话号码，全语言通用 |
| hotline_contact | 是 | 联系人名称 |
| logo_url | 否 | 图片 URL |
| favicon_url | 否 | 图片 URL |
| wechat_qr_url | 否 | 图片 URL |
| icp_filing | 否 | 备案号 |

**contact_info：**

| 字段 | 多语言 | 说明 |
|------|--------|------|
| address | 是 | 地址 |
| phone | 否 | 电话号码 |
| email | 否 | 邮箱 |
| wechat | 否 | 微信号 |
| office_hours | 是 | 办公时间描述 |

**homepage_stats：**

| 字段 | 多语言 | 说明 |
|------|--------|------|
| value | 否 | 数字（如 "15+"） |
| label | 是 | 标签描述 |

**about_info：**

| 字段 | 多语言 | 说明 |
|------|--------|------|
| history | 是 | 公司历史 |
| mission | 是 | 使命 |
| vision | 是 | 愿景 |
| partnership | 是 | 合作介绍 |

**phone_country_codes：** 不需要多语言（保持现有表单）。

## 页面设计

### 设置页面结构

```
设置页面（上下滚动，带锚点导航）
├── Header 预览区
│   └── 渲染真实 <Header />，可编辑区域带 hover 高亮
│       点击 → 弹窗编辑（品牌名、标语、热线、Logo 等）
│
├── 首页统计预览区
│   └── 渲染真实的首页统计组件
│       点击某个统计项 → 弹窗编辑（数值 + 多语言标签）
│       + 添加/删除统计项按钮
│
├── 关于我们预览区
│   └── 渲染真实的关于我们页面片段
│       点击某段文字 → 弹窗编辑（多语言 textarea）
│
├── Footer 预览区
│   └── 渲染真实 <Footer />，可编辑区域带 hover 高亮
│       点击 → 弹窗编辑（联系方式、备案号等）
│
└── 其他设置
    └── 国家码管理（保持现有表格形式）
```

### 可编辑区域交互

1. **非编辑态**：正常渲染 + 鼠标 hover 时显示蓝色虚线边框 + 铅笔图标
2. **点击**：弹出 Dialog，显示该区域的所有可编辑字段
3. **弹窗内容**：多语言 tab 或直接展示所有语言的输入框
4. **保存**：调 `PUT /admin/config/{key}` 保存，预览区实时更新
5. **图片字段**：弹窗中显示当前图片 + 上传/替换按钮

### 弹窗编辑器

```
┌─ 编辑 Header ─────────────────────────────────┐
│                                                │
│ 品牌名称                                       │
│ 中文：  [慕大国际教育                    ]     │
│ English：[MUTU International Education  ]     │
│ 日本語：[ムダ国際教育                    ]     │
│ Deutsch：[MUTU Internationale Bildung   ]     │
│                                                │
│ 标语                                           │
│ 中文：  [专注国际教育 · 专注出国服务     ]     │
│ English：[Focus on International Education]    │
│ ...                                            │
│                                                │
│ 服务热线：[189-1268-6656    ]（所有语言通用）  │
│ 联系人                                         │
│ 中文：  [吴老师       ]                        │
│ English：[Mr. Wu      ]                        │
│                                                │
│ Logo：[当前图片预览] [上传新图片]               │
│                                                │
│              [取消]  [保存]                     │
└────────────────────────────────────────────────┘
```

## 组件设计

### 新增组件

| 组件 | 职责 |
|------|------|
| `EditableOverlay` | 包裹可编辑区域，提供 hover 高亮和点击事件 |
| `ConfigEditDialog` | 弹窗编辑器，渲染多语言表单 |
| `LocalizedInput` | 单个多语言字段输入组件（4 个语言的 input/textarea） |
| `getLocalizedValue()` | 工具函数，从多语言对象中取值 |

### 修改组件

| 组件 | 变更 |
|------|------|
| `Header` | 接受 `editable` prop，启用时包裹 `EditableOverlay` |
| `Footer` | 同上 |
| 首页/关于页面组件 | 同上 |
| `ConfigContext` | `getLocalizedValue` 处理多语言数据 |
| 设置页面 | 重写为可视化预览布局 |
| `SiteInfoEditor` | 删除（功能合并到可视化编辑） |
| `ContactInfoEditor` | 删除 |
| `HomepageStatsEditor` | 删除 |
| `AboutInfoEditor` | 删除 |

### 后端变更

后端不需要改动。配置值是 JSON 类型，存什么格式都支持。多语言处理完全在前端完成。

## 支持的语言

| 代码 | 显示名 |
|------|--------|
| zh | 中文 |
| en | English |
| ja | 日本語 |
| de | Deutsch |

## 影响范围

### 前端

- 设置页面完全重写
- Header/Footer 组件加 `editable` 模式
- 首页统计、关于我们组件加 `editable` 模式
- ConfigContext 加多语言取值逻辑
- 所有消费 config 的组件通过 `getLocalizedValue()` 取值
- 删除 4 个旧编辑器组件
- 新增 4 个新组件

### 后端

无变更。`brand_name_en` 字段在前端可选保留或迁移合并。

### 数据迁移

首次保存时自动从旧格式升级为新格式（前端处理）。或者写一个一次性脚本把现有数据转为多语言格式。
