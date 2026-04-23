# Tiptap 富文本编辑器设计

## 背景

当前文章编辑器（TiptapEditor）功能基础，仅支持标题、粗体、斜体、列表、引用、图片/链接（prompt 输入 URL）。需要升级为功能完整的富文本编辑器，支持全屏编辑、HTML 源码切换、预览、图片上传/粘贴/拖拽，以及导入导出时图片自动 base64 转换。

## 设计

### 编辑器功能清单

| 分类 | 功能 | Tiptap 扩展 |
|------|------|-------------|
| 核心格式 | H1-H4、粗体、斜体、删除线、下划线、行内代码 | StarterKit, Underline, Highlight |
| 引用与分割 | 引用块、分割线、代码块 | StarterKit (内含) |
| 列表 | 有序列表、无序列表、任务列表 | StarterKit, TaskList + TaskItem |
| 媒体 | 图片上传/粘贴/拖拽、链接、视频嵌入 | Image, Link, 自定义 VideoEmbed |
| 表格 | 插入表格、增删行列、合并/拆分单元格 | Table, TableRow, TableCell, TableHeader |
| 排版 | 文字颜色、文字高亮、对齐方式 | Color, Highlight, TextAlign |
| 高级 | 上标、下标 | Superscript, Subscript |
| 编辑器 | 撤销/重做、HTML 源码切换、全屏、预览 | StarterKit (History) + 自定义 UI |

### 需要安装的 Tiptap 扩展包

已有：`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`

新增：
- `@tiptap/extension-underline`
- `@tiptap/extension-color`
- `@tiptap/extension-text-style`（Color 的依赖）
- `@tiptap/extension-highlight`
- `@tiptap/extension-text-align`
- `@tiptap/extension-table`
- `@tiptap/extension-table-row`
- `@tiptap/extension-table-cell`
- `@tiptap/extension-table-header`
- `@tiptap/extension-task-list`
- `@tiptap/extension-task-item`
- `@tiptap/extension-superscript`
- `@tiptap/extension-subscript`
- `@tiptap/extension-code-block-lowlight`（可选，语法高亮代码块）

### 组件架构

```
ArticleEditDialog
  └─ TiptapEditor (重写)
       ├─ EditorToolbar          — 工具栏（分组按钮）
       ├─ EditorContent          — Tiptap 编辑区域
       ├─ HtmlSourceEditor       — HTML 源码编辑（textarea，切换显示）
       └─ EditorPreview          — 预览面板（SafeHtml 渲染）
```

### 文件拆分

| 文件 | 职责 | 行数估计 |
|------|------|----------|
| `TiptapEditor.tsx` | 主组件，管理编辑器实例和模式切换（编辑/源码/预览） | ~120 |
| `EditorToolbar.tsx` | 工具栏渲染，分组按钮，下拉菜单 | ~250 |
| `EditorPreview.tsx` | 预览面板，使用 SafeHtml 渲染 | ~30 |
| `HtmlSourceEditor.tsx` | HTML 源码编辑 textarea | ~40 |
| `editor-extensions.ts` | 所有 Tiptap 扩展配置集中管理 | ~80 |
| `image-upload.ts` | 图片上传逻辑（文件选择、粘贴、拖拽处理） | ~60 |
| `video-embed.ts` | 自定义视频嵌入 Node 扩展 | ~50 |
| `editor.css` | 编辑器样式（表格边框、任务列表复选框等） | ~80 |

所有文件放在 `frontend/components/editor/` 目录下。

### 工具栏布局

两行工具栏：

第一行（左）：撤销 | 重做 || H1 H2 H3 H4 || 粗体 斜体 下划线 删除线 || 文字颜色 高亮颜色

第一行（右）：HTML源码 | 预览 | 全屏

第二行（左）：无序列表 有序列表 任务列表 || 引用 代码块 分割线 || 对齐（左/中/右/两端）|| 上标 下标 || 链接 图片 视频 表格

工具栏按钮使用 `Toggle` 样式，激活状态高亮。分组之间用分隔线 `|` 隔开。

### 图片处理

#### 编辑时（上传到服务器）

1. **按钮上传**：点击工具栏图片按钮 → 弹出文件选择 → 上传到 `/admin/web-settings/images/upload` → 插入 `<img src="/api/public/images/detail?id=xxx">`
2. **粘贴上传**：监听 `paste` 事件，检测剪贴板中的图片 → 自动上传 → 插入
3. **拖拽上传**：监听 `drop` 事件，检测拖入的图片文件 → 自动上传 → 插入
4. **上传过程中**：显示 loading 占位符（灰色方块 + 加载动画），上传完成后替换为实际图片

#### 导出时（URL → base64）

在 `export_service.py` 的 HTML 导出流程中：
1. 扫描 HTML 中的 `<img src="/api/public/images/detail?id=xxx">`
2. 从 Image 表读取二进制数据
3. 转为 base64 data URI：`<img src="data:image/webp;base64,...">`
4. 替换后写入 ZIP 的 `content/{slug}.html`

导出的 HTML 文件完全自包含，可以直接在浏览器打开查看。

#### 导入时（base64 → URL）

在 `import_service.py` 的 HTML 导入流程中：
1. 扫描 HTML 中的 `<img src="data:...;base64,...">`
2. 解码 base64 为二进制数据
3. 上传到 Image 表，获得 image_id
4. 替换为服务器 URL：`<img src="/api/public/images/detail?id=xxx">`
5. 处理后的 HTML 存入 Article.content

### 视频嵌入

自定义 Tiptap Node 扩展 `VideoEmbed`：
- 输入：用户粘贴 YouTube/Bilibili 链接
- 存储：`<div data-video-url="https://..." class="video-embed"><iframe ...></iframe></div>`
- 渲染：响应式 16:9 比例 iframe
- 支持的平台：YouTube（youtube.com, youtu.be）、Bilibili（bilibili.com）

### 全屏模式

- 点击全屏按钮 → Dialog 切换到 `sm:max-w-full sm:h-full` 样式
- 编辑区域占满整个视口（减去工具栏和底部按钮高度）
- 再次点击退出全屏 → 恢复原始 Dialog 大小
- 通过 `isFullscreen` 状态控制，传给 TiptapEditor 调整高度

### 预览模式

- 点击预览按钮 → 编辑区域左右分栏（50/50）
- 左侧：Tiptap 编辑器（可继续编辑）
- 右侧：SafeHtml 实时预览渲染
- 再次点击退出预览 → 恢复纯编辑模式
- 预览面板使用和前台文章详情页相同的样式（`prose` 类）

### HTML 源码编辑

- 点击 `</>` 按钮 → 编辑区域切换为 `<textarea>`，显示当前 HTML 源码
- 用户可直接编辑 HTML
- 切回富文本模式时，将 textarea 内容同步回 Tiptap 编辑器
- 源码编辑和预览可同时开启（左源码 / 右预览）

### 编辑器样式

使用 Tailwind CSS + 自定义 CSS：
- 表格：边框、表头背景色
- 任务列表：自定义复选框样式
- 图片：可选中状态边框、居中/浮动支持
- 代码块：深色背景、等宽字体
- 引用：左边框 + 灰色背景
- 工具栏：sticky 固定在顶部

### ArticleEditDialog 改动

- 移除 `contentType` 切换（富文本 + PDF 切换保留）
- 富文本编辑区域替换为新 TiptapEditor
- 全屏状态下 Dialog 扩展到全屏
- PDF 上传功能保持不变

### 数据流

```
编辑时：
  用户输入/粘贴图片 → 上传到 /images/upload → 获取 URL → 插入 HTML
  保存时：editor.getHTML() → POST /articles/create 或 /edit

导出时：
  Article.content (HTML with /api/public/images/detail?id=xxx)
  → 扫描 img src → 读 Image 表 → 转 base64 data URI
  → 写入 ZIP content/{slug}.html

导入时：
  ZIP content/{filename}.html (HTML with base64 data URI)
  → 扫描 img src="data:..." → 解码 → 上传到 Image 表
  → 替换为 /api/public/images/detail?id=xxx
  → 存入 Article.content
```

## 验证计划

1. 安装新 Tiptap 扩展后 `pnpm build` 无报错
2. 所有工具栏按钮功能正常（每种格式点击一次，确认 HTML 输出）
3. 图片上传：文件选择、粘贴、拖拽三种方式都能成功插入
4. 全屏模式：切换流畅，编辑区域正确扩展
5. 预览模式：左右分栏，实时同步
6. HTML 源码模式：切换后内容一致，编辑后切回富文本正确渲染
7. 表格：创建、增删行列、合并单元格
8. 视频嵌入：YouTube/Bilibili 链接正确渲染 iframe
9. 导出：HTML 中图片自动转 base64，ZIP 内 HTML 文件可直接浏览器打开
10. 导入：base64 图片自动上传到服务器并替换为 URL
11. 前台文章详情页正确渲染所有格式（SafeHtml + DOMPurify 兼容）
