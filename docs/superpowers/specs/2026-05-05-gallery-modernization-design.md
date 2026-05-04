# 照片墙 (Gallery Block) 现代化设计

## 目标

将当前简陋的水平滚动照片墙改造为现代化的图片画廊，支持多种布局风格和全屏 Lightbox 浏览。

## 当前状态

- 固定 280px 宽度的水平滚动列表
- 原生 `overflow-x-auto` 滚动条
- 无 Lightbox / hover 效果 / 响应式
- 数据结构：`{ image_id, caption }` 数组

## 技术方案

### 布局层：Tailwind CSS 自建

用 Tailwind CSS Grid / Flexbox / Columns 实现四种布局风格，不引入布局库，保持完全可控。

### Lightbox 层：PhotoSwipe

- `photoswipe`（MIT，25k GitHub stars，最成熟稳定的 Lightbox 库）
- `react-photoswipe-gallery`（MIT，React 封装组件）
- 特色：从缩略图位置展开的过渡动画

### 现代效果层：Tailwind CSS

hover 缩放、遮罩、大圆角等效果用 Tailwind transition/transform 实现。

## 布局风格

通过 `block.options.galleryType` 选择，管理员创建 Block 时可选。

| galleryType | 名称 | 实现 | 适用场景 |
|-------------|------|------|---------|
| `grid` | 等高网格 | CSS Grid + 统一 aspect-ratio (4:3) | 办公环境、统一风格系列照 |
| `masonry` | 瀑布流 | CSS columns | 活动照片、混合比例 |
| `rows` | 行排列 | Flexbox 等高行，宽度按图片宽高比分配 | 大量照片浏览 |
| `carousel` | 轮播 | Flex + scroll-snap + 左右箭头 + 指示点 | 精选少量高质量图片 |

默认风格：`grid`（最通用、最整洁）。

### 响应式列数

| 风格 | 手机 | 平板 | 桌面 |
|------|------|------|------|
| grid | 2 列 | 3 列 | 4 列 |
| masonry | 2 列 | 3 列 | 4 列 |
| rows | 自适应（每行 2-4 张） | 同左 | 同左 |
| carousel | 1 张 | 1 张 | 1 张 |

## Lightbox 功能

PhotoSwipe 内置 + 插件提供：

| 功能 | 来源 | 说明 |
|------|------|------|
| 左右切换 | 内置 | 箭头按钮 + 滑动手势 |
| 键盘导航 | 内置 | ← → 切换，Esc 关闭 |
| 缩放 | 内置 | 双击 / 滚轮 / 双指捏合 |
| 缩略图导航 | 自建（Tailwind） | 底部缩略图条，点击跳转 |
| 图片说明 | photoswipe-dynamic-caption-plugin | 显示 caption 字段 |
| 开合动画 | 内置 | 从缩略图位置展开/收回 |
| 计数器 | 内置 | 显示 "2 / 9" |

## Hover 效果（所有风格通用）

- 图片微放大：`transition-transform duration-300 hover:scale-105`
- 阴影浮起：`hover:shadow-lg`
- 暗色遮罩 + 图标：hover 时显示半透明遮罩和放大镜图标（提示可点击查看大图）
- 大圆角：`rounded-xl`（16px）
- 图片容器：`overflow-hidden`（防止缩放溢出）

## 数据模型变化

### Image 模型扩展

在 `Image` 表新增 `width` 和 `height` 字段：

```python
width = Column(Integer, nullable=True)   # 图片宽度（像素）
height = Column(Integer, nullable=True)  # 图片高度（像素）
```

- 上传时用 Pillow 提取并存储
- 已有图片通过迁移脚本批量补充
- 用于 rows/masonry 布局计算宽高比

### Block options 扩展

```python
block.options = {
    "galleryType": "grid"  # "grid" | "masonry" | "rows" | "carousel"
}
```

### GalleryItem 数据结构

保持现有结构不变：

```typescript
interface GalleryItem {
  image_id: string
  caption: LocalizedField  // { zh, en, ja, de }
}
```

宽高比从 Image API 获取，不冗余存储在 GalleryItem 中。

### Image 公开接口扩展

新增一个批量获取图片元数据的接口（避免 N+1 请求）：

```
GET /api/public/images/meta/batch?ids=id1,id2,id3
```

返回：

```json
[
  { "id": "uuid", "width": 1920, "height": 1080, "mime_type": "image/webp" }
]
```

现有 `/api/public/images/detail` 接口返回二进制数据，不适合获取元数据。

## 前端组件结构

```
GalleryBlock.tsx          -- 入口组件，根据 galleryType 分发
├── GalleryGrid.tsx       -- 等高网格布局
├── GalleryMasonry.tsx    -- 瀑布流布局
├── GalleryRows.tsx       -- 行排列布局
├── GalleryCarousel.tsx   -- 轮播布局
├── GalleryLightbox.tsx   -- PhotoSwipe Lightbox 封装
└── GalleryItem.tsx       -- 单张图片卡片（hover 效果）
```

### GalleryBlock.tsx（入口）

```
1. 从 block.options.galleryType 读取风格
2. 调用 batch meta API 获取图片宽高
3. 根据风格渲染对应布局组件
4. 包裹 PhotoSwipe Gallery Provider
```

### GalleryItem.tsx（通用图片卡片）

```
- img 标签 + lazy loading
- hover: scale-105 + shadow-lg
- hover: 暗色遮罩 + 放大镜图标 (ZoomIn from lucide-react)
- 大圆角 rounded-xl + overflow-hidden
- PhotoSwipe Item 包裹（点击触发 Lightbox）
```

## 管理后台变化

### BlockEditorOverlay

galleryType 子类型标签显示，类似 card_grid 的 cardType。

### UnifiedBlockEditor

Gallery Block 的选项标签页增加 galleryType 下拉选择：

```
等高网格 | 瀑布流 | 行排列 | 轮播
```

### block-labels.ts

新增 `GALLERY_TYPE_LABELS`：

```typescript
const GALLERY_TYPE_LABELS: Record<string, string> = {
  grid: "等高网格",
  masonry: "瀑布流",
  rows: "行排列",
  carousel: "轮播",
}
```

`getBlockLabel` 函数扩展，gallery block 也显示子类型名。

## 新增依赖

| 包名 | 版本 | 协议 | 大小 | 用途 |
|------|------|------|------|------|
| photoswipe | ^5.4.4 | MIT | ~50KB gzipped | Lightbox 核心 |
| react-photoswipe-gallery | ^3.x | MIT | ~5KB | React 封装 |
| photoswipe-dynamic-caption-plugin | ^3.x | MIT | ~3KB | 图片说明 |

后端不新增依赖（Pillow 已在项目中）。

## 不做的事

- 不做图片上传拖拽排序的改动（现有 DnD 系统已支持）
- 不做自动播放轮播（避免干扰用户）
- 不做图片滤镜 / 特效
- 不做分页加载（教育机构图片数量不会太多）
- Carousel 不做自动轮播，仅手动切换

## 测试范围

- GalleryBlock 四种布局的渲染测试（前端单元测试）
- Lightbox 打开/关闭/切换（E2E）
- galleryType 切换（管理后台 E2E）
- Image batch meta API（后端单元测试 + 接口测试）
- Image width/height 存储（后端单元测试）
- 响应式布局断点（前端单元测试 / E2E）
