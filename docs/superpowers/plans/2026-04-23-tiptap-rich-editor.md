# Tiptap 富文本编辑器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前基础的 Tiptap 编辑器升级为功能完整的富文本编辑器，支持全部格式、图片上传/粘贴/拖拽、HTML 源码编辑、预览、视频嵌入、表格，以及导入导出时图片 base64 自动转换。

**Architecture:** 重写 `frontend/components/editor/` 下的编辑器组件，拆分为主组件 + 工具栏 + 扩展配置 + 图片上传 + 视频嵌入 + 源码编辑 + 预览 + 样式。后端修改导入导出服务，增加 HTML 中图片的 base64 ↔ URL 转换。DOMPurify 配置更新以支持 iframe（视频）和 data 属性。

**Tech Stack:** Tiptap 3.x + React 19, Tailwind CSS, python-slugify, Pillow, DOMPurify

---

## 文件结构

### 前端新建文件

| 文件 | 职责 |
|------|------|
| `frontend/components/editor/editor-extensions.ts` | 集中配置所有 Tiptap 扩展 |
| `frontend/components/editor/image-upload.ts` | 图片上传逻辑（文件选择/粘贴/拖拽） |
| `frontend/components/editor/video-embed.ts` | 自定义视频嵌入 Node 扩展 |
| `frontend/components/editor/EditorToolbar.tsx` | 工具栏组件（两行按钮布局） |
| `frontend/components/editor/HtmlSourceEditor.tsx` | HTML 源码编辑 textarea |
| `frontend/components/editor/EditorPreview.tsx` | 预览面板（SafeHtml 渲染） |
| `frontend/components/editor/editor.css` | 编辑器样式（表格、任务列表、代码块等） |

### 前端修改文件

| 文件 | 修改内容 |
|------|----------|
| `frontend/components/editor/TiptapEditor.tsx` | 重写：集成新扩展、模式切换（编辑/源码/预览）、图片上传 |
| `frontend/components/common/SafeHtml.tsx` | DOMPurify 配置更新，允许 iframe、data 属性 |
| `frontend/components/admin/web-settings/ArticleEditDialog.tsx` | 无需改动（已使用 TiptapEditor） |

### 后端新建文件

| 文件 | 职责 |
|------|------|
| `backend/shared/app/utils/html_images.py` | HTML 中图片 base64 ↔ URL 转换工具 |

### 后端修改文件

| 文件 | 修改内容 |
|------|----------|
| `backend/api/api/admin/config/web_settings/articles/export_service.py` | 导出时 HTML 内图片 URL → base64 |
| `backend/api/api/admin/config/web_settings/articles/import_service.py` | 导入时 HTML 内图片 base64 → URL |

---

## Task 1: 安装 Tiptap 扩展包

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: 安装所有新 Tiptap 扩展**

```bash
cd frontend && pnpm add \
  @tiptap/extension-underline \
  @tiptap/extension-color \
  @tiptap/extension-text-style \
  @tiptap/extension-highlight \
  @tiptap/extension-text-align \
  @tiptap/extension-table \
  @tiptap/extension-table-row \
  @tiptap/extension-table-cell \
  @tiptap/extension-table-header \
  @tiptap/extension-task-list \
  @tiptap/extension-task-item \
  @tiptap/extension-superscript \
  @tiptap/extension-subscript
```

- [ ] **Step 2: 验证安装**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v '.next/' | grep -v 'e2e/' | head -5
```

Expected: 无新增错误

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore: 安装 Tiptap 富文本扩展包"
```

---

## Task 2: 扩展配置 + 图片上传 + 视频嵌入

**Files:**
- Create: `frontend/components/editor/editor-extensions.ts`
- Create: `frontend/components/editor/image-upload.ts`
- Create: `frontend/components/editor/video-embed.ts`

- [ ] **Step 1: 创建扩展配置文件**

`frontend/components/editor/editor-extensions.ts`：
- 导入所有 Tiptap 扩展
- 导出 `createEditorExtensions(options)` 函数，接收 `placeholder` 和 `onImageUpload` 参数
- StarterKit 配置：禁用内置的 codeBlock（用 CodeBlockLowlight 替代时）
- Image 配置：允许 inline、HTMLAttributes
- Link 配置：`openOnClick: false`
- TextAlign 配置：`types: ["heading", "paragraph"]`
- Highlight 配置：`multicolor: true`
- TaskItem 配置：`nested: true`

- [ ] **Step 2: 创建图片上传工具**

`frontend/components/editor/image-upload.ts`：
- `uploadImage(file: File): Promise<string>` — 调用 `/admin/web-settings/images/upload` 上传图片，返回 URL
- `handleImagePaste(editor, event)` — 从粘贴事件提取图片 Blob → 上传 → 插入
- `handleImageDrop(editor, event)` — 从拖拽事件提取图片文件 → 上传 → 插入
- `handleImageSelect(editor)` — 弹出文件选择器 → 上传 → 插入
- 上传中：先插入占位图（`data:image/svg+xml` 的灰色方块），上传完成后替换 src

- [ ] **Step 3: 创建视频嵌入扩展**

`frontend/components/editor/video-embed.ts`：
- 自定义 Tiptap Node 扩展 `VideoEmbed`
- `name: "videoEmbed"`
- `group: "block"`
- Attributes: `src`（iframe URL）、`videoUrl`（原始链接）
- `parseHTML`: 匹配 `div[data-video-url]`
- `renderHTML`: 输出 `<div data-video-url="..." class="video-embed"><iframe src="..." ...></iframe></div>`
- 辅助函数 `parseVideoUrl(url)`: 从 YouTube/Bilibili URL 提取嵌入 URL
  - `youtube.com/watch?v=xxx` → `https://www.youtube.com/embed/xxx`
  - `youtu.be/xxx` → `https://www.youtube.com/embed/xxx`
  - `bilibili.com/video/BVxxx` → `https://player.bilibili.com/player.html?bvid=BVxxx`
- 导出 `insertVideo(editor)` 命令函数

- [ ] **Step 4: Commit**

```bash
git add frontend/components/editor/editor-extensions.ts \
       frontend/components/editor/image-upload.ts \
       frontend/components/editor/video-embed.ts
git commit -m "feat: Tiptap 扩展配置、图片上传、视频嵌入"
```

---

## Task 3: 编辑器工具栏

**Files:**
- Create: `frontend/components/editor/EditorToolbar.tsx`

- [ ] **Step 1: 创建工具栏组件**

两行布局：

第一行（左）：Undo Redo | H1 H2 H3 H4 | Bold Italic Underline Strikethrough | TextColor Highlight
第一行（右）：SourceCode Preview

第二行（左）：BulletList OrderedList TaskList | Blockquote CodeBlock HorizontalRule | AlignLeft AlignCenter AlignRight AlignJustify | Superscript Subscript | Link Image Video Table

Props：
```typescript
interface EditorToolbarProps {
  editor: Editor | null
  mode: "edit" | "source" | "preview"
  onModeChange: (mode: "edit" | "source" | "preview") => void
  onImageSelect: () => void
  onVideoInsert: () => void
}
```

按钮使用 `Button` 组件 `variant="ghost" size="icon-sm"`，激活时 `variant="secondary"`。
分组之间用 `<div className="mx-1 w-px self-stretch bg-border" />` 分隔。

颜色选择用 `<input type="color">` 隐藏在按钮后面。

- [ ] **Step 2: 更新翻译文件**

在 `frontend/messages/zh.json` 的 `Editor` 命名空间中添加新按钮的翻译：
```json
{
  "heading1": "标题 1",
  "heading4": "标题 4",
  "underline": "下划线",
  "strikethrough": "删除线",
  "textColor": "文字颜色",
  "highlight": "高亮",
  "taskList": "任务列表",
  "codeBlock": "代码块",
  "horizontalRule": "分割线",
  "alignLeft": "左对齐",
  "alignCenter": "居中",
  "alignRight": "右对齐",
  "alignJustify": "两端对齐",
  "superscript": "上标",
  "subscript": "下标",
  "insertVideo": "插入视频",
  "insertTable": "插入表格",
  "videoPrompt": "请输入视频链接（YouTube / Bilibili）",
  "undo": "撤销",
  "redo": "重做",
  "sourceCode": "源码",
  "preview": "预览"
}
```

同步更新 `en.json`、`ja.json`、`de.json`。

- [ ] **Step 3: Commit**

```bash
git add frontend/components/editor/EditorToolbar.tsx \
       frontend/messages/*.json
git commit -m "feat: 编辑器工具栏组件"
```

---

## Task 4: 源码编辑 + 预览 + 样式

**Files:**
- Create: `frontend/components/editor/HtmlSourceEditor.tsx`
- Create: `frontend/components/editor/EditorPreview.tsx`
- Create: `frontend/components/editor/editor.css`

- [ ] **Step 1: 创建 HTML 源码编辑组件**

`frontend/components/editor/HtmlSourceEditor.tsx`：
```typescript
interface HtmlSourceEditorProps {
  value: string
  onChange: (html: string) => void
}
```
- 渲染 `<textarea>` 等宽字体
- 全高度填充父容器

- [ ] **Step 2: 创建预览组件**

`frontend/components/editor/EditorPreview.tsx`：
```typescript
interface EditorPreviewProps {
  html: string
}
```
- 使用 `SafeHtml` 渲染
- 应用 `prose` 类保持和前台一致的排版

- [ ] **Step 3: 创建编辑器样式**

`frontend/components/editor/editor.css`：
- `.tiptap` 基础样式（min-height、outline 移除）
- 表格样式：边框、表头背景色、单元格 padding、选中状态
- 任务列表：自定义复选框（`ul[data-type="taskList"]`）
- 代码块：深色背景、等宽字体、圆角
- 引用：左边框 primary 色 + 灰色背景
- 图片：选中边框、居中
- 视频嵌入：响应式 16:9 比例容器
- 占位符样式（Placeholder 扩展）

- [ ] **Step 4: Commit**

```bash
git add frontend/components/editor/HtmlSourceEditor.tsx \
       frontend/components/editor/EditorPreview.tsx \
       frontend/components/editor/editor.css
git commit -m "feat: 源码编辑、预览面板、编辑器样式"
```

---

## Task 5: 重写 TiptapEditor 主组件

**Files:**
- Modify: `frontend/components/editor/TiptapEditor.tsx`

- [ ] **Step 1: 重写主组件**

新的 `TiptapEditor.tsx`：
```typescript
interface TiptapEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
}
```

- 状态：`mode: "edit" | "source" | "preview"`，`sourceHtml: string`
- 使用 `createEditorExtensions()` 创建扩展
- 配置图片粘贴/拖拽处理（`editorProps.handlePaste` 和 `handleDrop`）
- 模式切换逻辑：
  - 切到源码：`setSourceHtml(editor.getHTML())`
  - 切回编辑：`editor.commands.setContent(sourceHtml)`
  - 预览模式：左右分栏（编辑器 + EditorPreview）
- 导入 `editor.css`
- 布局：
  ```
  <div className="overflow-hidden rounded-lg border">
    <EditorToolbar ... />
    <div className="flex">
      {mode === "source" ? <HtmlSourceEditor /> : <EditorContent />}
      {mode === "preview" && <EditorPreview />}
    </div>
  </div>
  ```

- [ ] **Step 2: 验证 TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v '.next/' | grep -v 'e2e/' | head -5
```

- [ ] **Step 3: Commit**

```bash
git add frontend/components/editor/TiptapEditor.tsx
git commit -m "feat: 重写 TiptapEditor 主组件，集成全部功能"
```

---

## Task 6: 更新 SafeHtml 支持 iframe 和 data 属性

**Files:**
- Modify: `frontend/components/common/SafeHtml.tsx`

- [ ] **Step 1: 更新 DOMPurify 配置**

- 允许 `iframe` 标签（视频嵌入）
- 允许 `data-*` 属性（视频 URL）
- 限制 iframe src 域名白名单：`youtube.com`, `youtube-nocookie.com`, `player.bilibili.com`
- 允许 `style` 属性（文字颜色）
- 允许 `class` 属性（视频嵌入容器）

```typescript
const clean = useMemo(() => DOMPurify.sanitize(html, {
  ADD_TAGS: ["iframe"],
  ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "data-video-url", "style", "class"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|data):)/i,
}), [html])
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/common/SafeHtml.tsx
git commit -m "fix: SafeHtml 支持 iframe 和 data 属性（视频嵌入）"
```

---

## Task 7: 后端导出图片 base64 转换

**Files:**
- Create: `backend/shared/app/utils/html_images.py`
- Modify: `backend/api/api/admin/config/web_settings/articles/export_service.py`

- [ ] **Step 1: 创建 HTML 图片转换工具**

`backend/shared/app/utils/html_images.py`：

```python
"""HTML 中图片 URL ↔ base64 转换工具。"""

import base64
import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.image import repository as image_repo

IMAGE_URL_PATTERN = re.compile(
    r'<img\s+([^>]*?)src="(/api/public/images/detail\?id=([a-f0-9-]+))"([^>]*?)>',
    re.IGNORECASE,
)

BASE64_PATTERN = re.compile(
    r'<img\s+([^>]*?)src="data:([^;]+);base64,([^"]+)"([^>]*?)>',
    re.IGNORECASE,
)


async def urls_to_base64(session: AsyncSession, html: str) -> str:
    """将 HTML 中的图片 URL 替换为 base64 data URI。"""
    # 收集所有需要替换的图片
    matches = list(IMAGE_URL_PATTERN.finditer(html))
    if not matches:
        return html

    result = html
    for match in reversed(matches):
        image_id = match.group(3)
        image = await image_repo.get_by_id(session, image_id)
        if not image:
            continue
        b64 = base64.b64encode(image.file_data).decode("ascii")
        data_uri = f"data:{image.mime_type};base64,{b64}"
        new_tag = f'<img {match.group(1)}src="{data_uri}"{match.group(4)}>'
        result = result[:match.start()] + new_tag + result[match.end():]

    return result


async def base64_to_urls(session: AsyncSession, html: str) -> str:
    """将 HTML 中的 base64 data URI 替换为服务器图片 URL。"""
    matches = list(BASE64_PATTERN.finditer(html))
    if not matches:
        return html

    result = html
    for match in reversed(matches):
        mime_type = match.group(2)
        b64_data = match.group(3)
        file_data = base64.b64decode(b64_data)
        ext = mime_type.split("/")[-1].split("+")[0]
        filename = f"imported.{ext}"
        image = await image_repo.create_image(
            session, file_data, filename, mime_type,
        )
        url = f"/api/public/images/detail?id={image.id}"
        new_tag = f'<img {match.group(1)}src="{url}"{match.group(4)}>'
        result = result[:match.start()] + new_tag + result[match.end():]

    return result
```

- [ ] **Step 2: 修改导出服务，HTML 内图片转 base64**

在 `export_service.py` 的 `export_zip` 方法中，HTML 导出前调用 `urls_to_base64`：

```python
from app.utils.html_images import urls_to_base64

# 在 article.content_type == "html" 分支中：
html_content = await urls_to_base64(self.session, article.content)
content_files[f"content/{content_filename}"] = html_content.encode("utf-8")
```

- [ ] **Step 3: Commit**

```bash
git add backend/shared/app/utils/html_images.py \
       backend/api/api/admin/config/web_settings/articles/export_service.py
git commit -m "feat: 导出时 HTML 内图片自动转 base64"
```

---

## Task 8: 后端导入图片 base64 → URL

**Files:**
- Modify: `backend/api/api/admin/config/web_settings/articles/import_service.py`

- [ ] **Step 1: 修改导入服务，HTML 内 base64 转 URL**

在 `_create_article` 和 `_update_article` 中，读取 HTML 内容后调用 `base64_to_urls`：

```python
from app.utils.html_images import base64_to_urls

# 在 content_type == "html" 的分支中，读取 HTML 后：
content_text = file_map[content_path].decode("utf-8")
content_text = await base64_to_urls(self.session, content_text)
```

- [ ] **Step 2: Commit**

```bash
git add backend/api/api/admin/config/web_settings/articles/import_service.py
git commit -m "feat: 导入时 HTML 内 base64 图片自动上传并转 URL"
```

---

## Task 9: 浏览器验证

**Files:** 无代码改动

- [ ] **Step 1: 启动开发环境并验证核心功能**

```bash
docker compose up -d
```

通过 Playwright MCP 打开 http://localhost/zh/admin/web-settings：

1. 导航到任意文章分类页面，点击"写文章"
2. 验证工具栏按钮全部可见且可用
3. 测试格式化：H1-H4、粗体、斜体、下划线、删除线、颜色、高亮
4. 测试列表：有序、无序、任务列表
5. 测试表格：插入、增删行列
6. 测试图片：按钮上传、粘贴、拖拽
7. 测试视频嵌入
8. 测试模式切换：源码 ↔ 编辑 ↔ 预览
9. 保存文章后，前台详情页渲染正确

- [ ] **Step 2: 验证导入导出**

1. 导出一篇含图片的文章为 ZIP
2. 解压检查 HTML 文件中图片是否为 base64
3. 用浏览器打开该 HTML 确认图片可见
4. 重新导入该 ZIP，确认图片正确显示

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat: Tiptap 富文本编辑器完成"
```
