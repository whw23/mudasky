# 照片墙现代化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将照片墙 Block 从简陋的水平滚动列表改造为支持 4 种布局风格 + PhotoSwipe Lightbox 的现代化画廊。

**Architecture:** 布局层用 Tailwind CSS 自建 4 种风格（grid/masonry/rows/carousel），通过 `block.options.galleryType` 切换。Lightbox 层用 PhotoSwipe + react-photoswipe-gallery。后端扩展 Image 模型增加 width/height 字段，GalleryItem 数据中也存储宽高。

**Tech Stack:** React + TypeScript + Tailwind CSS + PhotoSwipe 5 + react-photoswipe-gallery + Pillow (已有)

---

## File Map

### 新建文件

| 文件 | 职责 |
| --- | --- |
| `frontend/components/blocks/gallery/GalleryGrid.tsx` | 等高网格布局 |
| `frontend/components/blocks/gallery/GalleryMasonry.tsx` | 瀑布流布局 |
| `frontend/components/blocks/gallery/GalleryRows.tsx` | 行排列布局 |
| `frontend/components/blocks/gallery/GalleryCarousel.tsx` | 轮播布局 |
| `frontend/components/blocks/gallery/GalleryItem.tsx` | 单张图片卡片（hover 效果 + PhotoSwipe Item） |
| `backend/alembic/versions/xxxx_add_image_dimensions.py` | Alembic 迁移：Image 表增加 width/height |

### 修改文件

| 文件 | 改动 |
| --- | --- |
| `backend/shared/app/db/image/models.py` | Image 模型增加 width, height 字段 |
| `backend/shared/app/db/image/repository.py` | create_image 中提取并存储图片尺寸 |
| `backend/scripts/init/seed_page_blocks.py` | gallery block 增加 `options.galleryType` |
| `backend/scripts/init/seed_images.py` | gallery 图片数据增加 width/height |
| `frontend/components/blocks/GalleryBlock.tsx` | 重写：根据 galleryType 分发布局 + PhotoSwipe |
| `frontend/lib/block-labels.ts` | 增加 GALLERY_TYPE_LABELS + getBlockLabel 扩展 |
| `frontend/components/admin/web-settings/BlockTypeFields.tsx` | 增加 GalleryFields（galleryType 选择） |
| `frontend/components/admin/web-settings/BlockContentTab.tsx` | gallery ARRAY_FIELDS 增加 width/height |
| `frontend/tests/components/blocks/GalleryBlock.test.tsx` | 重写测试覆盖新组件 |

---

## Task 1: 后端 — Image 模型增加 width/height

**Files:**

- Modify: `backend/shared/app/db/image/models.py`
- Modify: `backend/shared/app/db/image/repository.py`
- Test: `backend/api/tests/admin/config/test_service.py` (已有图片上传测试)

- [ ] **Step 1: 修改 Image 模型，增加 width 和 height 字段**

在 `backend/shared/app/db/image/models.py` 的 `file_hash` 字段之后、`created_at` 之前添加：

```python
width: Mapped[int | None] = mapped_column(
    Integer, nullable=True, doc="图片宽度（像素）"
)
height: Mapped[int | None] = mapped_column(
    Integer, nullable=True, doc="图片高度（像素）"
)
```

- [ ] **Step 2: 修改 repository.py，在 create_image 中提取尺寸**

修改 `backend/shared/app/db/image/repository.py` 的 `create_image` 函数。在 WebP 转换分支中复用已打开的 PIL Image 获取尺寸，非转换分支也提取尺寸：

```python
async def create_image(
    session: AsyncSession,
    file_data: bytes,
    filename: str,
    mime_type: str,
) -> Image:
    """创建图片。位图自动转 WebP，SVG/PDF 保持原格式。"""
    img_width: int | None = None
    img_height: int | None = None

    if mime_type in CONVERTIBLE_MIME_TYPES:
        file_data, mime_type, ext, img_width, img_height = _convert_to_webp(file_data)
        stem = filename.rsplit(".", 1)[0] if "." in filename else filename
        filename = stem + ext
    elif mime_type == "image/webp":
        pil_img = PILImage.open(io.BytesIO(file_data))
        img_width, img_height = pil_img.size

    file_hash = hashlib.sha256(file_data).hexdigest()
    existing = await get_by_hash(session, file_hash)
    if existing:
        return existing

    image = Image(
        file_data=file_data,
        filename=filename,
        mime_type=mime_type,
        file_size=len(file_data),
        file_hash=file_hash,
        width=img_width,
        height=img_height,
    )
    session.add(image)
    await session.commit()
    await session.refresh(image)
    return image
```

同时修改 `_convert_to_webp` 返回尺寸：

```python
def _convert_to_webp(file_data: bytes) -> tuple[bytes, str, str, int, int]:
    """将位图转为 WebP 格式，返回 (数据, MIME, 扩展名, 宽, 高)。"""
    img = PILImage.open(io.BytesIO(file_data))
    width, height = img.size
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if img.info.get("transparency") else "RGB")
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=WEBP_QUALITY)
    return buf.getvalue(), "image/webp", ".webp", width, height
```

- [ ] **Step 3: 生成 Alembic 迁移**

```bash
cd /home/whw23/code/mudasky/backend/shared && uv run alembic revision --autogenerate -m "add image dimensions"
```

检查生成的迁移文件，确保 upgrade 包含：

```python
op.add_column('image', sa.Column('width', sa.Integer(), nullable=True))
op.add_column('image', sa.Column('height', sa.Integer(), nullable=True))
```

在 upgrade 函数末尾添加数据迁移（为已有图片补充尺寸）：

```python
from sqlalchemy import text
conn = op.get_bind()
images = conn.execute(text("SELECT id, file_data, mime_type FROM image WHERE width IS NULL")).fetchall()

from PIL import Image as PILImage
import io
for img_id, file_data, mime_type in images:
    if mime_type in ("image/svg+xml", "application/pdf"):
        continue
    try:
        pil_img = PILImage.open(io.BytesIO(file_data))
        w, h = pil_img.size
        conn.execute(
            text("UPDATE image SET width = :w, height = :h WHERE id = :id"),
            {"w": w, "h": h, "id": img_id},
        )
    except Exception:
        pass
```

- [ ] **Step 4: 运行迁移验证**

```bash
cd /home/whw23/code/mudasky && docker compose exec api alembic upgrade head
```

- [ ] **Step 5: 运行后端单元测试确认不破坏已有功能**

```bash
./scripts/test.sh unit
```

- [ ] **Step 6: Commit**

```bash
git add backend/shared/app/db/image/models.py backend/shared/app/db/image/repository.py backend/alembic/versions/*add_image_dimensions*
git commit -m "feat: Image 模型增加 width/height 字段，上传时自动提取"
```

---

## Task 2: 种子数据 — gallery block 增加 galleryType 和图片尺寸

**Files:**

- Modify: `backend/scripts/init/seed_page_blocks.py`
- Modify: `backend/scripts/init/seed_images.py`

- [ ] **Step 1: seed_page_blocks.py 中 gallery block 增加默认 options**

找到 `_block("gallery", ...)` 调用（约 183 行），添加 `options` 参数：

```python
_block(
    "gallery",
    section_tag="Office",
    section_title={
        "zh": "办公环境",
        "en": "Our Office",
        "ja": "オフィス環境",
        "de": "Büroumgebung",
    },
    options={"galleryType": "grid"},
    data=[],
),
```

- [ ] **Step 2: seed_images.py 中 gallery 图片数据增加 width/height**

在 `_init_office_images` 函数中，图片导入后从 Image 对象读取 width/height 写入 GalleryItem：

```python
office_images.append({
    "image_id": str(image.id),
    "caption": {"zh": "", "en": "", "ja": "", "de": ""},
    "width": image.width or 0,
    "height": image.height or 0,
})
```

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/init/seed_page_blocks.py backend/scripts/init/seed_images.py
git commit -m "feat: gallery 种子数据增加 galleryType 和图片尺寸"
```

---

## Task 3: 前端 — 安装依赖 + PhotoSwipe CSS

**Files:**

- Modify: `frontend/package.json`

- [ ] **Step 1: 安装 photoswipe 和 react-photoswipe-gallery**

```bash
pnpm --prefix frontend add photoswipe react-photoswipe-gallery
```

- [ ] **Step 2: 确认安装成功**

```bash
pnpm --prefix frontend ls photoswipe react-photoswipe-gallery
```

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore: 安装 photoswipe 和 react-photoswipe-gallery"
```

---

## Task 4: 前端 — GalleryItem 通用图片卡片组件

**Files:**

- Create: `frontend/components/blocks/gallery/GalleryItem.tsx`

- [ ] **Step 1: 创建 GalleryItem 组件**

```tsx
"use client"

/**
 * 画廊单张图片卡片。
 * 包含 hover 缩放/遮罩效果 + PhotoSwipe Item 包裹。
 */

import { useLocale } from "next-intl"
import { Item } from "react-photoswipe-gallery"
import { ZoomIn } from "lucide-react"
import { getLocalizedValue } from "@/lib/i18n-config"

interface GalleryItemProps {
  imageId: string
  caption: any
  width: number
  height: number
  className?: string
}

/** 画廊图片卡片 */
export function GalleryItem({ imageId, caption, width, height, className = "" }: GalleryItemProps) {
  const locale = useLocale()
  const src = `/api/public/images/detail?id=${imageId}`
  const alt = getLocalizedValue(caption, locale) || ""
  const captionText = getLocalizedValue(caption, locale) || ""

  return (
    <Item
      original={src}
      thumbnail={src}
      width={width || 1200}
      height={height || 800}
      caption={captionText}
      alt={alt}
    >
      {({ ref, open }) => (
        <div
          className={`group cursor-pointer overflow-hidden rounded-xl ${className}`}
          onClick={open}
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={ref as React.Ref<HTMLImageElement>}
              src={src}
              alt={alt}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/30">
              <ZoomIn className="size-8 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          </div>
          {captionText && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {captionText}
            </p>
          )}
        </div>
      )}
    </Item>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/blocks/gallery/GalleryItem.tsx
git commit -m "feat: GalleryItem 通用图片卡片（hover 效果 + PhotoSwipe）"
```

---

## Task 5: 前端 — 4 种布局组件

**Files:**

- Create: `frontend/components/blocks/gallery/GalleryGrid.tsx`
- Create: `frontend/components/blocks/gallery/GalleryMasonry.tsx`
- Create: `frontend/components/blocks/gallery/GalleryRows.tsx`
- Create: `frontend/components/blocks/gallery/GalleryCarousel.tsx`

- [ ] **Step 1: GalleryGrid — 等高网格布局**

```tsx
"use client"

/** 等高网格布局。统一裁切比例，响应式 2/3/4 列。 */

import { GalleryItem } from "./GalleryItem"

interface GalleryGridProps {
  items: Array<{ image_id: string; caption: any; width: number; height: number }>
}

export function GalleryGrid({ items }: GalleryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item, i) => (
        <GalleryItem
          key={i}
          imageId={item.image_id}
          caption={item.caption}
          width={item.width}
          height={item.height}
          className="aspect-[4/3]"
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: GalleryMasonry — 瀑布流布局**

```tsx
"use client"

/** 瀑布流布局。CSS columns 实现，图片保持原始比例。 */

import { GalleryItem } from "./GalleryItem"

interface GalleryMasonryProps {
  items: Array<{ image_id: string; caption: any; width: number; height: number }>
}

export function GalleryMasonry({ items }: GalleryMasonryProps) {
  return (
    <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
      {items.map((item, i) => {
        const ratio = item.width && item.height ? item.width / item.height : 4 / 3
        return (
          <div key={i} className="mb-4 break-inside-avoid">
            <GalleryItem
              imageId={item.image_id}
              caption={item.caption}
              width={item.width}
              height={item.height}
              className={ratio > 1 ? "aspect-video" : "aspect-[3/4]"}
            />
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: GalleryRows — 行排列布局**

```tsx
"use client"

/** 行排列布局。每行等高，宽度按图片宽高比分配。 */

import { GalleryItem } from "./GalleryItem"

interface GalleryRowsProps {
  items: Array<{ image_id: string; caption: any; width: number; height: number }>
}

export function GalleryRows({ items }: GalleryRowsProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item, i) => {
        const ratio = item.width && item.height ? item.width / item.height : 4 / 3
        return (
          <div
            key={i}
            className="h-48 shrink-0 grow md:h-56 lg:h-64"
            style={{ flexBasis: `${ratio * 200}px` }}
          >
            <GalleryItem
              imageId={item.image_id}
              caption={item.caption}
              width={item.width}
              height={item.height}
              className="h-full"
            />
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: GalleryCarousel — 轮播布局**

```tsx
"use client"

/** 轮播布局。scroll-snap 实现，左右箭头 + 指示点。 */

import { useState, useRef, useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { GalleryItem } from "./GalleryItem"

interface GalleryCarouselProps {
  items: Array<{ image_id: string; caption: any; width: number; height: number }>
}

export function GalleryCarousel({ items }: GalleryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)

  const scrollTo = useCallback((index: number) => {
    const el = scrollRef.current
    if (!el) return
    const child = el.children[index] as HTMLElement
    if (child) {
      el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: "smooth" })
      setCurrent(index)
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function handleScroll() {
      const children = Array.from(el!.children) as HTMLElement[]
      const scrollLeft = el!.scrollLeft + el!.offsetWidth / 2
      const idx = children.findIndex((c) => c.offsetLeft + c.offsetWidth > scrollLeft)
      if (idx >= 0) setCurrent(idx)
    }
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 scrollbar-none"
      >
        {items.map((item, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            <GalleryItem
              imageId={item.image_id}
              caption={item.caption}
              width={item.width}
              height={item.height}
              className="aspect-video"
            />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            onClick={() => scrollTo(Math.max(0, current - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md transition-opacity hover:bg-white disabled:opacity-30"
            disabled={current === 0}
            aria-label="上一张"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => scrollTo(Math.min(items.length - 1, current + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md transition-opacity hover:bg-white disabled:opacity-30"
            disabled={current === items.length - 1}
            aria-label="下一张"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="mt-4 flex justify-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                }`}
                aria-label={`第 ${i + 1} 张`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/components/blocks/gallery/
git commit -m "feat: 4 种画廊布局组件（grid/masonry/rows/carousel）"
```

---

## Task 6: 前端 — 重写 GalleryBlock 入口组件

**Files:**

- Modify: `frontend/components/blocks/GalleryBlock.tsx`

- [ ] **Step 1: 重写 GalleryBlock.tsx**

完全替换 `frontend/components/blocks/GalleryBlock.tsx`：

```tsx
"use client"

/**
 * 图片画廊区块。
 * 支持 4 种布局风格（grid/masonry/rows/carousel）+ PhotoSwipe Lightbox。
 */

import { type ReactNode } from "react"
import type { Block } from "@/types/block"
import { SpotlightOverlay } from "@/components/admin/SpotlightOverlay"
import { FieldOverlay } from "@/components/admin/FieldOverlay"
import { Trash2, ImagePlus } from "lucide-react"
import { Gallery } from "react-photoswipe-gallery"
import "photoswipe/style.css"
import { GalleryGrid } from "./gallery/GalleryGrid"
import { GalleryMasonry } from "./gallery/GalleryMasonry"
import { GalleryRows } from "./gallery/GalleryRows"
import { GalleryCarousel } from "./gallery/GalleryCarousel"

interface BlockProps {
  block: Block
  header: ReactNode
  bg: string
  editable?: boolean
  onEdit?: (block: Block) => void
  onFieldEdit?: (block: Block, fieldKey: string, fieldIndex?: number) => void
  onEditConfig?: (section: string) => void
  blockLabel?: string
}

interface GalleryItem {
  image_id: string
  caption: any
  width: number
  height: number
}

type GalleryType = "grid" | "masonry" | "rows" | "carousel"

/** 根据 galleryType 渲染对应布局 */
function GalleryLayout({ items, galleryType }: { items: GalleryItem[]; galleryType: GalleryType }) {
  switch (galleryType) {
    case "masonry":
      return <GalleryMasonry items={items} />
    case "rows":
      return <GalleryRows items={items} />
    case "carousel":
      return <GalleryCarousel items={items} />
    default:
      return <GalleryGrid items={items} />
  }
}

/** 图片画廊区块 */
export function GalleryBlock({ block, header, bg, editable, onEdit, onEditConfig, blockLabel }: BlockProps) {
  const items: GalleryItem[] = Array.isArray(block.data) ? block.data : []
  const galleryType: GalleryType = block.options?.galleryType || "grid"

  if (editable && onEdit) {
    return (
      <SpotlightOverlay onClick={() => onEdit(block)} label={blockLabel || "编辑画廊"}>
        <section className={`py-10 md:py-16 ${bg}`}>
          <div className="mx-auto max-w-7xl px-4">
            {header}
            <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
              {items.map((item, i) => (
                <div key={i} className="group relative shrink-0" style={{ width: 280 }}>
                  <FieldOverlay
                    onClick={() => onEditConfig?.(`gallery_item_${block.id}_${i}`)}
                    label={`编辑图片 ${i + 1}`}
                  >
                    <div>
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/public/images/detail?id=${item.image_id}`}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </FieldOverlay>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditConfig?.(`gallery_delete_${block.id}_${i}`)
                    }}
                    className="pointer-events-none absolute top-1 left-1 z-10 rounded bg-red-500 p-1 text-white opacity-0 shadow transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                    title="移除"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
              <div
                className="hidden shrink-0 cursor-pointer group-hover/block:block"
                style={{ width: 280 }}
                data-editable
                onClick={(e) => { e.stopPropagation(); onEditConfig?.(`gallery_add_${block.id}`) }}
              >
                <div className="opacity-50 transition-opacity hover:opacity-80">
                  <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-muted">
                    <ImagePlus className="size-10 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-center text-sm text-muted-foreground">新建图片</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </SpotlightOverlay>
    )
  }

  if (items.length === 0) return null

  return (
    <section className={`py-10 md:py-16 ${bg}`}>
      <div className="mx-auto max-w-7xl px-4">
        {header}
        <div className="mt-8">
          <Gallery withCaption>
            <GalleryLayout items={items} galleryType={galleryType} />
          </Gallery>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 确认 TypeScript 编译通过**

```bash
pnpm --prefix frontend exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/blocks/GalleryBlock.tsx
git commit -m "feat: 重写 GalleryBlock，支持 4 种布局 + PhotoSwipe Lightbox"
```

---

## Task 7: 前端 — block-labels 和 BlockTypeFields 扩展

**Files:**

- Modify: `frontend/lib/block-labels.ts`
- Modify: `frontend/components/admin/web-settings/BlockTypeFields.tsx`

- [ ] **Step 1: block-labels.ts 增加 GALLERY_TYPE_LABELS**

在 `DATA_TYPE_LABELS` 之后添加：

```typescript
/** 画廊布局类型中文名 */
export const GALLERY_TYPE_LABELS: Record<string, string> = {
  grid: "等高网格",
  masonry: "瀑布流",
  rows: "行排列",
  carousel: "轮播",
}
```

在 `getBlockLabel` 函数中 `featured_data` 分支之后添加：

```typescript
if (block.type === "gallery" && block.options?.galleryType) {
  const sub = GALLERY_TYPE_LABELS[block.options.galleryType]
  if (sub) return `${base} · ${sub}`
}
```

- [ ] **Step 2: BlockTypeFields.tsx 增加 gallery case**

在 `TypeSpecificFields` 的 switch 中 `case "doc_list"` 之前添加：

```typescript
case "gallery":
  return <GalleryFields options={options} onUpdate={onUpdateOption} />
```

在文件末尾（`CtaFields` 之后）添加 `GalleryFields` 组件：

```typescript
/** gallery 类型配置 */
function GalleryFields({ options, onUpdate }: FieldsProps) {
  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">图片墙选项</p>
      <SelectField
        label="布局风格"
        value={options.galleryType || "grid"}
        options={[
          { value: "grid", label: "等高网格" },
          { value: "masonry", label: "瀑布流" },
          { value: "rows", label: "行排列" },
          { value: "carousel", label: "轮播" },
        ]}
        onValueChange={(v) => onUpdate("galleryType", v)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/block-labels.ts frontend/components/admin/web-settings/BlockTypeFields.tsx
git commit -m "feat: gallery block 管理后台支持 galleryType 选择"
```

---

## Task 8: 前端 — gallery 新增图片自动填充 width/height

**Files:**

- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx`

当前 `gallery_add` 的 onSave 直接把表单 data 存入 block.data，但表单不含 width/height 字段。需要在保存时补上默认值 `width: 0, height: 0`，保证数据结构一致。

- [ ] **Step 1: 修改 gallery_add onSave，补上 width/height**

在 `frontend/app/[locale]/[panel]/web-settings/page.tsx` 约第 1143 行，`gallery_add` 的 onSave 中，修改：

```typescript
// 原代码：
const updatedItems = [...items, data]

// 改为：
const updatedItems = [...items, { ...data, width: 0, height: 0 }]
```

同样在 `gallery_item` 编辑保存时（约第 1077 行的 onSave），确保更新时不丢失 width/height：

```typescript
// 确保编辑保存时保留 width/height
const updatedItem = { ...items[itemIndex], ...data }
```

（检查当前代码是否已经是 spread 合并。如果是 `items[itemIndex] = data` 直接替换，改为 spread 合并。）

- [ ] **Step 2: Commit**

```bash
git add frontend/app/[locale]/[panel]/web-settings/page.tsx
git commit -m "fix: gallery 新增/编辑条目保留 width/height"
```

---

## Task 9: 前端 — 重写 GalleryBlock 测试

**Files:**

- Modify: `frontend/tests/components/blocks/GalleryBlock.test.tsx`

- [ ] **Step 1: 重写测试文件**

```tsx
/**
 * GalleryBlock 组件测试。
 * 验证图片画廊区块的布局分发、图片渲染、Lightbox 集成。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
}))

vi.mock("@/components/admin/SpotlightOverlay", () => ({
  SpotlightOverlay: ({ children }: any) => <div data-testid="spotlight-overlay">{children}</div>,
}))

vi.mock("@/components/admin/FieldOverlay", () => ({
  FieldOverlay: ({ children }: any) => <div data-testid="field-overlay">{children}</div>,
}))

vi.mock("react-photoswipe-gallery", () => ({
  Gallery: ({ children }: any) => <div data-testid="photoswipe-gallery">{children}</div>,
  Item: ({ children }: any) => children({ ref: { current: null }, open: vi.fn() }),
}))

vi.mock("photoswipe/style.css", () => ({}))

import { GalleryBlock } from "@/components/blocks/GalleryBlock"
import type { Block } from "@/types/block"

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: "gallery-1",
    type: "gallery",
    showTitle: false,
    sectionTag: "",
    sectionTitle: "",
    bgColor: "white",
    options: { galleryType: "grid" },
    data: [
      { image_id: "img-1", caption: { zh: "校园风景", en: "Campus" }, width: 1920, height: 1080 },
      { image_id: "img-2", caption: { zh: "教室环境", en: "Classroom" }, width: 1600, height: 1200 },
    ],
    ...overrides,
  }
}

describe("GalleryBlock", () => {
  it("渲染所有图片", () => {
    render(<GalleryBlock block={makeBlock()} header={null} bg="" />)
    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(2)
  })

  it("图片 src 使用正确的 API 路径", () => {
    render(<GalleryBlock block={makeBlock()} header={null} bg="" />)
    const images = screen.getAllByRole("img")
    expect(images[0]).toHaveAttribute("src", "/api/public/images/detail?id=img-1")
  })

  it("data 为空数组时不渲染", () => {
    const { container } = render(<GalleryBlock block={makeBlock({ data: [] })} header={null} bg="" />)
    expect(container.querySelector("section")).toBeNull()
  })

  it("data 非数组时不渲染", () => {
    const { container } = render(<GalleryBlock block={makeBlock({ data: null })} header={null} bg="" />)
    expect(container.querySelector("section")).toBeNull()
  })

  it("包裹 PhotoSwipe Gallery", () => {
    render(<GalleryBlock block={makeBlock()} header={null} bg="" />)
    expect(screen.getByTestId("photoswipe-gallery")).toBeInTheDocument()
  })

  it("editable 模式包裹 SpotlightOverlay", () => {
    const onEdit = vi.fn()
    render(<GalleryBlock block={makeBlock()} header={null} bg="" editable onEdit={onEdit} />)
    expect(screen.getByTestId("spotlight-overlay")).toBeInTheDocument()
  })

  it("默认 galleryType 为 grid", () => {
    render(<GalleryBlock block={makeBlock({ options: {} })} header={null} bg="" />)
    const images = screen.getAllByRole("img")
    expect(images).toHaveLength(2)
  })

  it("masonry 布局渲染图片", () => {
    render(<GalleryBlock block={makeBlock({ options: { galleryType: "masonry" } })} header={null} bg="" />)
    expect(screen.getAllByRole("img")).toHaveLength(2)
  })

  it("rows 布局渲染图片", () => {
    render(<GalleryBlock block={makeBlock({ options: { galleryType: "rows" } })} header={null} bg="" />)
    expect(screen.getAllByRole("img")).toHaveLength(2)
  })

  it("carousel 布局渲染图片", () => {
    render(<GalleryBlock block={makeBlock({ options: { galleryType: "carousel" } })} header={null} bg="" />)
    expect(screen.getAllByRole("img")).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 运行测试确认通过**

```bash
pnpm --prefix frontend test -- --run tests/components/blocks/GalleryBlock.test.tsx
```

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/components/blocks/GalleryBlock.test.tsx
git commit -m "test: 重写 GalleryBlock 测试覆盖新组件"
```

---

## Task 10: 集成验证 — 浏览器测试

- [ ] **Step 1: 确保开发容器运行**

```bash
./scripts/dev.sh start
```

- [ ] **Step 2: 用 Playwright MCP 导航到包含 gallery block 的页面，截图验证**

导航到关于我们页面（包含办公环境 gallery block），检查：

1. Gallery 是否使用网格布局渲染
2. Hover 时是否有缩放 + 遮罩效果
3. 点击图片是否打开 PhotoSwipe Lightbox
4. Lightbox 内左右切换、关闭、缩放是否正常

- [ ] **Step 3: 导航到管理后台网页设置，验证**

1. Gallery block 是否显示"图片墙 · 等高网格"子类型标签
2. 点击编辑 block，选项标签页是否有"布局风格"下拉选择
3. 切换布局风格后预览是否实时更新

- [ ] **Step 4: 运行前端单元测试**

```bash
pnpm --prefix frontend test -- --run
```

- [ ] **Step 5: 运行后端单元测试**

```bash
./scripts/test.sh unit
```

- [ ] **Step 6: Commit（如有修复）**

```bash
git add -A
git commit -m "fix: gallery 集成验证修复"
```
