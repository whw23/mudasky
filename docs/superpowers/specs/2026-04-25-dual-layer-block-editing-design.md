# 双层模组编辑系统设计

## 背景

当前网页设置预览中，各 block 的编辑风格不统一：

- **大多数 block**：只有 block 级 EditableOverlay（点击整体 → 打开弹窗）
- **ContactInfoBlock**：只有字段级 EditableOverlay（点击单个字段 → 编辑该字段）
- **HomeBanner**：混合模式（block 级 + 字段级）

目标：所有 block 统一为双层编辑 —— 既能点击整体编辑，也能点击具体字段直接编辑。

## 设计决策

### 交互模型

- **默认状态**：无视觉效果
- **hover block（非字段区域）**：block 级蓝色虚线框 + 铅笔图标
- **hover 具体字段**：字段高亮（紧凑区块虚线框，`fit-content` 宽度），block 内其他内容淡化（spotlight 效果，`opacity: 0.35`）
- **点击字段**：编辑该字段（stopPropagation，不触发 block 级）
- **点击空白区域**：block 级编辑（打开 UnifiedBlockEditor）

### 实现方案

CSS `:has()` 驱动的 SpotlightOverlay + FieldOverlay 组件，无 React 状态开销。

### 字段 Overlay 视觉

紧凑区块样式：虚线框包裹内容但不满宽（`width: fit-content`），像个小卡片。

## 新组件

### SpotlightOverlay

```tsx
interface SpotlightOverlayProps {
  onClick: () => void      // block 级点击（打开 UnifiedBlockEditor）
  label: string            // 辅助文字（如"编辑模组"）
  children: ReactNode      // 包含 FieldOverlay 的 block 内容
}
```

行为：
- 默认：无视觉效果
- Hover 且无子 FieldOverlay 被 hover：显示蓝色虚线框 + 铅笔
- 有子 FieldOverlay 被 hover：隐藏自身 overlay，非 hover 子元素淡化
- 点击空白区域 → `onClick`

### FieldOverlay

```tsx
interface FieldOverlayProps {
  onClick: () => void      // 字段级点击
  label: string            // 辅助文字（如"编辑内容"）
  children: ReactNode      // 字段内容
}
```

行为：
- Hover：紧凑蓝色虚线框 + 铅笔，兄弟元素淡化
- 点击 → `onClick` + `stopPropagation`
- `width: fit-content`，不占满整行

### CSS 核心

```css
/* 有 FieldOverlay 被 hover 时，block 级 overlay 隐藏 */
.spotlight-overlay:has([data-field]:hover) .spotlight-border {
  opacity: 0;
}

/* 非 hover 的 spotlight 直接子内容区域淡化 */
/* 注意：用后代选择器 :has()，因为 FieldOverlay 可能嵌套在 grid 等中间容器内 */
.spotlight-overlay:has([data-field]:hover) .spotlight-content > *:not(:has([data-field]:hover)) {
  opacity: 0.35;
  transition: opacity 0.2s;
}

/* FieldOverlay hover 效果 */
[data-field]:hover {
  outline: 2px dashed #3b82f6;
  outline-offset: 2px;
  background: rgba(59,130,246,0.02);
  width: fit-content;
}
```

## 各 Block 字段级编辑映射

### 简单文本 Block

| Block | 可编辑字段 | 点击行为 |
|-------|-----------|---------|
| IntroBlock | `data.content`（描述文字） | 打开 UnifiedBlockEditor content tab |
| CtaBlock | `data.title`、`data.desc`、`data.buttonText` | 同上，聚焦对应字段 |

### 数组 Block

| Block | 可编辑字段 | 点击行为 |
|-------|-----------|---------|
| CardGridBlock | 每张卡片（数组项） | 打开 UnifiedBlockEditor content tab，展开对应项 |
| StepListBlock | 每个步骤 | 同上 |
| DocListBlock | 每个文档项 | 同上 |
| GalleryBlock | 每张图片 | 同上 |

### API 驱动 Block

| Block | 可编辑字段 | 点击行为 |
|-------|-----------|---------|
| ArticleListBlock | 每篇文章卡片 | 打开 ArticleEditDialog |
| UniversityListBlock | 每个院校卡片 | 打开 UniversityEditDialog |
| CaseGridBlock | 每个案例卡片 | 打开 CaseEditDialog |
| FeaturedDataBlock | 每个展示项 | 打开对应 University/CaseEditDialog |

API 驱动 block 保留 ManageToolbar（提供新增/删除），字段级 overlay 提供点击编辑。

### 全局配置 Block

| Block | 可编辑字段 | 点击行为 |
|-------|-----------|---------|
| ContactInfoBlock | 每个联系项（数组项） | 打开 ConfigEditDialog 编辑对应项 |

## ContactInfoBlock 数据模型重构

### 现状

全局配置中 5 个独立字段：`contact_address`、`contact_phone`、`contact_email`、`contact_wechat`、`contact_registered_address`。

### 新结构

改为 `contact_items` 数组，每项支持图标 + 多语言标签/内容 + 可选图片（hover 放大）：

```json
{
  "contact_items": [
    {
      "icon": "phone",
      "label": { "zh": "服务热线", "en": "Hotline" },
      "content": { "zh": "400-xxx-xxxx" },
      "image_id": null,
      "hover_zoom": false
    },
    {
      "icon": "mail",
      "label": { "zh": "邮箱", "en": "Email" },
      "content": { "zh": "info@example.com" },
      "image_id": null,
      "hover_zoom": false
    },
    {
      "icon": "message-circle",
      "label": { "zh": "微信咨询", "en": "WeChat" },
      "content": { "zh": "扫码添加客服微信" },
      "image_id": "qr-code-image-id",
      "hover_zoom": true
    },
    {
      "icon": "map-pin",
      "label": { "zh": "公司地址", "en": "Address" },
      "content": { "zh": "上海市xxx路xxx号" },
      "image_id": null,
      "hover_zoom": false
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `icon` | string | Lucide 图标名，管理员从预设列表选择 |
| `label` | LocalizedField | 字段标签（多语言） |
| `content` | LocalizedField | 字段内容（多语言） |
| `image_id` | string \| null | 可选图片（关联 Image 表） |
| `hover_zoom` | boolean | 是否 hover 时弹出放大 |

### 特性

- 管理员可增删排序联系项，不再固定 5 个字段
- Footer、关于我们页面同步读取新数组结构
- 无 alembic 迁移，直接改种子数据 + `docker compose down -v` 重建

### 数据消费方

- `ContactInfoBlock` → 页面预览中的联系信息模组
- `ContactInfoSection` → 关于我们页面的联系信息区域
- `Footer` → 底部联系方式

三处统一读取 `contact_items` 数组。

## UnifiedBlockEditor 变化

1. **字段聚焦**：新增 `defaultFieldIndex?: number` prop，数组 block 打开时自动展开/滚动到指定数组项
2. **ContactInfo 内容编辑**：`contact_info` 类型不再标记为 API 驱动，拥有完整内容标签页，渲染数组编辑器（图标选择 + 多语言 label/content + 图片上传 + hover_zoom 开关）
3. **ContactInfo 保存逻辑**：contact_info 的内容数据存在全局配置（ConfigContext）而非 block.data。UnifiedBlockEditor 对 contact_info 类型需特殊处理 —— 保存时调用配置 API 更新 `contact_items`，而非写入 block.data。加载时也从全局配置读取。

## 受影响文件

| 文件 | 变化 |
|------|------|
| **新建** `components/admin/SpotlightOverlay.tsx` | 双层容器组件 |
| **新建** `components/admin/FieldOverlay.tsx` | 字段级高亮组件 |
| `components/blocks/IntroBlock.tsx` | 加 SpotlightOverlay + FieldOverlay |
| `components/blocks/CtaBlock.tsx` | 同上 |
| `components/blocks/CardGridBlock.tsx` | 同上，每张卡片一个 FieldOverlay |
| `components/blocks/StepListBlock.tsx` | 同上 |
| `components/blocks/DocListBlock.tsx` | 同上 |
| `components/blocks/GalleryBlock.tsx` | 同上 |
| `components/blocks/ArticleListBlock.tsx` | 加 FieldOverlay，保留 ManageToolbar |
| `components/blocks/UniversityListBlock.tsx` | 同上 |
| `components/blocks/CaseGridBlock.tsx` | 同上 |
| `components/blocks/FeaturedDataBlock.tsx` | 加 FieldOverlay |
| `components/blocks/ContactInfoBlock.tsx` | 加 SpotlightOverlay，改用新数组数据 |
| `components/blocks/BlockRenderer.tsx` | 传递 `onFieldEdit` 回调 |
| `components/about/ContactInfoSection.tsx` | 适配新数组结构 |
| `components/home/HomeBanner.tsx` | 迁移到 SpotlightOverlay 统一风格 |
| `components/layout/Footer.tsx` | 适配新数组结构 |
| `components/admin/web-settings/UnifiedBlockEditor.tsx` | 加 `defaultFieldIndex`，ContactInfo 内容编辑 |
| `components/admin/web-settings/BlockContentTab.tsx` | ContactInfo 数组编辑器 |
| `components/admin/web-settings/PageBlocksPreview.tsx` | 传递 `onFieldEdit` |
| `backend/scripts/init/seed_config.py` | contact_items 数组结构 |
| `types/block.ts` | ContactItem 类型定义 |
| `components/admin/EditableOverlay.tsx` | 保留，供非预览模式使用 |
