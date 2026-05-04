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
- `react-photoswipe-gallery`（MIT，React 封装组件，v3.1.1）
- 特色：从缩略图位置展开的过渡动画
- 图片说明：`react-photoswipe-gallery` 内置 `withCaption` + `<Item caption="...">` 支持

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

全部由 PhotoSwipe + react-photoswipe-gallery 内置提供：

| 功能 | 来源 | 说明 |
|------|------|------|
| 左右切换 | PhotoSwipe 内置 | 箭头按钮 + 滑动手势 |
| 键盘导航 | PhotoSwipe 内置 | ← → 切换，Esc 关闭 |
| 缩放 | PhotoSwipe 内置 | 双击 / 滚轮 / 双指捏合 |
| 图片说明 | react-photoswipe-gallery `withCaption` | `<Item caption={...}>` 显示 caption |
| 开合动画 | PhotoSwipe 内置 | 从缩略图位置展开/收回 |
| 计数器 | PhotoSwipe 内置 | 显示 "2 / 9" |

不做 Lightbox 内的缩略图导航条——图片数量有限（6-15 张），箭头切换 + 计数器已足够。

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
width: Mapped[int | None] = mapped_column(Integer, nullable=True)
height: Mapped[int | None] = mapped_column(Integer, nullable=True)
```

- 上传时在 `create_image()` 中用 Pillow 提取（`_convert_to_webp()` 已经打开了图片对象，复用即可）
- 已有图片通过 Alembic 数据迁移脚本批量补充（读取 file_data 用 Pillow 提取）
- 用于 rows/masonry 布局计算宽高比，以及 PhotoSwipe `<Item width={} height={}>` 参数

### GalleryItem 数据结构扩展

在 GalleryItem 中增加 `width` 和 `height`，在添加图片到 gallery 时从 Image 表读取并写入：

```typescript
interface GalleryItem {
  image_id: string
  caption: LocalizedField  // { zh, en, ja, de }
  width: number            // 新增：图片宽度
  height: number           // 新增：图片高度
}
```

这样前端渲染时直接使用，无需额外 API 请求。SSR 友好。

### Block options 扩展

```python
block.options = {
    "galleryType": "grid"  # "grid" | "masonry" | "rows" | "carousel"
}
```

### 不新增 API 接口

图片宽高存储在 GalleryItem 数据中，前端直接读取，不需要 batch meta API。

## 前端组件结构

```text
GalleryBlock.tsx          -- 入口组件，根据 galleryType 分发
├── GalleryGrid.tsx       -- 等高网格布局
├── GalleryMasonry.tsx    -- 瀑布流布局
├── GalleryRows.tsx       -- 行排列布局
├── GalleryCarousel.tsx   -- 轮播布局
└── GalleryItem.tsx       -- 单张图片卡片（hover 效果 + PhotoSwipe Item）
```

不再需要单独的 GalleryLightbox.tsx——`react-photoswipe-gallery` 的 `<Gallery>` 组件直接包裹在 GalleryBlock 入口即可。

### GalleryBlock.tsx（入口）

```text
1. 从 block.options.galleryType 读取风格（默认 "grid"）
2. 用 <Gallery withCaption> 包裹
3. 根据风格渲染对应布局组件
4. 每个布局组件内部使用 GalleryItem
```

### GalleryItem.tsx（通用图片卡片）

```
- react-photoswipe-gallery <Item> 包裹
  - original: /api/public/images/detail?id=xxx（全尺寸图）
  - thumbnail: 同上（同一图片，浏览器缓存复用）
  - width / height: 从 GalleryItem 数据读取
  - caption: 当前语言的 caption 文本
- img 标签 + lazy loading
- hover: scale-105 + shadow-lg
- hover: 暗色遮罩 + ZoomIn 图标 (lucide-react)
- 大圆角 rounded-xl + overflow-hidden
```

## 管理后台变化

### BlockEditorOverlay

galleryType 子类型标签显示，类似 card_grid 的 cardType。

### UnifiedBlockEditor

Gallery Block 的选项标签页增加 galleryType 下拉选择：

| 值       | 标签     |
|----------|----------|
| grid     | 等高网格 |
| masonry  | 瀑布流   |
| rows     | 行排列   |
| carousel | 轮播     |

### block-labels.ts

新增 `GALLERY_TYPE_LABELS`，`getBlockLabel` 函数扩展支持 gallery。

### 图片添加流程

现有的 gallery 图片添加流程（通过 ImageUploadField）需要在上传成功后，从后端获取图片的 width/height 并写入 GalleryItem 数据。

## 新增依赖

| 包名                     | 版本   | 协议 | 大小          | 用途          |
|--------------------------|--------|------|---------------|---------------|
| photoswipe               | ^5.4.4 | MIT  | ~50KB gzipped | Lightbox 核心 |
| react-photoswipe-gallery | ^3.1.1 | MIT  | ~5KB          | React 封装    |

后端不新增依赖（Pillow ≥12.0 已在 shared/pyproject.toml）。

## PhotoSwipe CSS 引入

PhotoSwipe 需要引入 CSS 文件：

```typescript
import "photoswipe/style.css"
```

在 GalleryBlock.tsx 中引入，仅在使用 Gallery Block 的页面加载。

## 不做的事

- 不做 Lightbox 内缩略图导航条（箭头 + 计数器已够用）
- 不做图片上传拖拽排序的改动（现有 DnD 系统已支持）
- 不做自动播放轮播（避免干扰用户）
- 不做图片滤镜 / 特效
- 不做分页加载（教育机构图片数量不会太多）
- 不新增后端 API 接口（宽高存在 GalleryItem 数据中）

## 测试范围

- GalleryBlock 四种布局的渲染测试（前端单元测试）
- Lightbox 打开/关闭/切换（E2E）
- galleryType 切换（管理后台 E2E）
- Image width/height 存储和提取（后端单元测试）
- 已有图片 width/height 数据迁移（Alembic 迁移脚本）
- 响应式布局断点（前端单元测试）
