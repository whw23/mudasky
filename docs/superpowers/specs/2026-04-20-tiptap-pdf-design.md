# 统一 Tiptap 富文本编辑器 + 文章 PDF 上传 — 设计文档

## 概述

统一所有富文本编辑为 Tiptap WYSIWYG 编辑器，移除 Markdown 编辑器和渲染依赖，文章新增 PDF 上传和 iframe 预览功能。

## 1. 编辑器统一

### 1.1 替换为 TiptapEditor 的字段

| 组件 | 字段 | 说明 |
|------|------|------|
| UniversityEditDialog | `description` | 院校简介 |
| UniversityEditDialog | `admission_requirements` | 录取要求 |
| UniversityEditDialog | `scholarship_info` | 奖学金信息 |
| ArticleEditDialog | `content` | 文章正文（content_type="html" 时） |

### 1.2 保持 Textarea 的字段

| 组件 | 字段 | 理由 |
|------|------|------|
| ArticleEditDialog | `excerpt` | 短摘要，纯文本 |
| CaseEditDialog | `testimonial` | 短引用，纯文本 |
| ContactExpandPanel | `noteText` | 内部备注 |

### 1.3 渲染统一

所有 HTML 富文本在前端展示统一使用 `SafeHtml` 组件（DOMPurify 消毒），替代 react-markdown。

已使用 SafeHtml 的位置：
- 院校详情页：admission_requirements、scholarship_info（已在上个 feature 中实现）
- 院校详情页：description（需新增 SafeHtml 渲染）

需要修改的位置：
- `ArticleContent.tsx`：react-markdown 渲染改为 SafeHtml

### 1.4 清理

删除文件：
- `frontend/components/editor/MarkdownEditor.tsx`

卸载依赖：
- `@uiw/react-md-editor`
- `react-markdown`
- `remark-gfm`

## 2. 文章 PDF 上传与预览

### 2.1 后端改动

**image repository：**
- `ALLOWED_MIME_TYPES` 增加 `"application/pdf"`

**Article 模型修改：**
- `content_type` 字段默认值从 `"markdown"` 改为 `"html"`
- `file_url`（String(500)）重命名为 `file_id`（String(36), FK → image.id, nullable）

**数据库迁移：**
- Alembic 迁移：rename column `file_url` → `file_id`，修改类型为 String(36)，添加外键
- `content_type` 默认值改为 `"html"`

**Article admin schemas：**
- `ArticleCreate.file_url` → `file_id`（optional）
- `ArticleCreate.content_type` 默认值改为 `"html"`
- `ArticleUpdate.file_url` → `file_id`
- `ArticleResponse.file_url` → `file_id`

**Article admin router：**
- 新增 `POST /articles/list/detail/upload-pdf` — 上传 PDF 文件
- 校验 MIME 类型为 `application/pdf`
- 调用 image repository 存储，返回 file_id

**Article admin service：**
- `create_article` 支持 `file_id` 字段
- 新增 `upload_pdf(article_id, file)` 方法

### 2.2 前端改动

**ArticleEditDialog：**
- 添加 content_type 切换控件（Radio 或 Select："富文本" / "PDF 文件"）
- `content_type === "html"`：显示 TiptapEditor 编辑 content 字段
- `content_type === "file"`：隐藏 TiptapEditor，显示 PDF 上传区
  - 拖拽/点击上传
  - MIME 限制 `application/pdf`
  - 上传成功后显示文件名和预览链接
  - 调用 `POST /articles/list/detail/upload-pdf`

**ArticleContent.tsx：**
- `content_type === "html"`：`<SafeHtml html={content} className="prose max-w-none" />`
- `content_type === "file"` 且 `file_id` 存在：

```tsx
<iframe
  src={`/api/public/images/detail?id=${file_id}`}
  className="w-full rounded-lg border-0"
  style={{ height: "80vh" }}
  title="PDF 预览"
/>
```

- 加载失败降级：显示下载链接 `<a href="/api/public/images/detail?id=${file_id}">下载 PDF</a>`

### 2.3 旧数据处理

删库重建，不需要数据迁移脚本。现有文章数据全部清除。

## 3. 代码组织

| 层 | 文件 | 改动 |
|----|------|------|
| Model | `shared/app/db/content/models.py` | content_type 默认值、file_url → file_id |
| Repository | `shared/app/db/image/repository.py` | ALLOWED_MIME_TYPES 增加 PDF |
| Migration | `alembic/versions/<auto>.py` | rename column、修改默认值 |
| Admin Schemas | `api/admin/config/web_settings/articles/schemas.py` | file_url → file_id |
| Admin Service | `api/admin/config/web_settings/articles/service.py` | upload_pdf 方法 |
| Admin Router | `api/admin/config/web_settings/articles/router.py` | upload-pdf 接口 |
| Public Schemas | `api/public/content/schemas.py` | file_url → file_id |
| Frontend | `components/admin/web-settings/UniversityEditDialog.tsx` | Textarea → TiptapEditor |
| Frontend | `components/admin/web-settings/ArticleEditDialog.tsx` | Textarea → TiptapEditor + PDF 上传 |
| Frontend | `components/content/ArticleContent.tsx` | react-markdown → SafeHtml + iframe |
| Frontend | `components/editor/MarkdownEditor.tsx` | 删除 |
| Frontend | `package.json` | 卸载 3 个 markdown 依赖 |
| Tests | 对应 test 文件 | 修复因字段变更导致的失败 |
