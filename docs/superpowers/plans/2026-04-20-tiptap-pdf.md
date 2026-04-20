# 统一 Tiptap 编辑器 + PDF 上传 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一所有富文本编辑为 Tiptap，文章支持 PDF 上传和 iframe 预览，清理 Markdown 依赖。

**Architecture:** 后端扩展 image 表支持 PDF MIME，修改 Article 模型（file_url → file_id，content_type 默认改 html），前端替换 Textarea 为 TiptapEditor，ArticleContent 渲染改为 SafeHtml + iframe。旧数据删库重建。

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Tiptap, DOMPurify, Playwright (iframe PDF)

**Design Spec:** `docs/superpowers/specs/2026-04-20-tiptap-pdf-design.md`

---

## Task 1: 后端 — 扩展 image MIME 类型 + Article 模型修改

**Files:**
- Modify: `backend/shared/app/db/image/repository.py`
- Modify: `backend/shared/app/db/content/models.py`

- [ ] **Step 1: image repository 添加 PDF MIME**

在 `backend/shared/app/db/image/repository.py` 中修改 `ALLOWED_MIME_TYPES`：

```python
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
}
```

- [ ] **Step 2: 修改 Article 模型**

在 `backend/shared/app/db/content/models.py` 中：

1. 添加 `ForeignKey` 到 imports：
```python
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
```

2. 修改 `content_type` 默认值：
```python
content_type: Mapped[str] = mapped_column(
    String(20), default="html", nullable=False
)
```

3. 替换 `file_url` 为 `file_id`：
```python
file_id: Mapped[str | None] = mapped_column(
    String(36),
    ForeignKey("image.id"),
    nullable=True,
)
```

- [ ] **Step 3: 提交**

```bash
git add backend/shared/app/db/image/repository.py backend/shared/app/db/content/models.py
git commit -m "feat: image 支持 PDF MIME，Article 模型 file_url → file_id"
```

---

## Task 2: 数据库迁移

**Files:**
- Create: `backend/alembic/versions/<auto>.py`

- [ ] **Step 1: 生成迁移**

```bash
export $(grep -v '^#' env/backend.env | grep -v '^$' | xargs) && export DB_HOST=localhost && uv run --project backend/shared alembic -c backend/alembic.ini revision --autogenerate -m "article file_url to file_id and content_type default html"
```

- [ ] **Step 2: 检查迁移文件**

确认包含：
- `op.alter_column("article", "content_type", server_default="html")` 或等效
- rename/drop `file_url` + add `file_id` with FK

如果 autogenerate 不能正确处理 rename（通常不能），手动修改迁移文件：
```python
def upgrade():
    op.drop_column("article", "file_url")
    op.add_column("article", sa.Column("file_id", sa.String(36), sa.ForeignKey("image.id"), nullable=True))
    op.alter_column("article", "content_type", server_default="html")

def downgrade():
    op.alter_column("article", "content_type", server_default="markdown")
    op.drop_column("article", "file_id")
    op.add_column("article", sa.Column("file_url", sa.String(500), nullable=True))
```

- [ ] **Step 3: 删库重建并执行迁移**

```bash
docker compose down -v
docker compose up -d
# 等待 db healthy
sleep 10
export $(grep -v '^#' env/backend.env | grep -v '^$' | xargs) && export DB_HOST=localhost && uv run --project backend/shared alembic -c backend/alembic.ini upgrade head
```

- [ ] **Step 4: 提交**

```bash
git add backend/alembic/versions/
git commit -m "feat: 数据库迁移 — Article file_url → file_id"
```

---

## Task 3: 后端 — Article admin schemas/service/router 修改

**Files:**
- Modify: `backend/api/api/admin/config/web_settings/articles/schemas.py`
- Modify: `backend/api/api/admin/config/web_settings/articles/service.py`
- Modify: `backend/api/api/admin/config/web_settings/articles/router.py`
- Modify: `backend/api/api/public/content/schemas.py`

- [ ] **Step 1: 修改 admin schemas**

在 `schemas.py` 中：

ArticleCreate — 替换 `file_url` 为 `file_id`，修改 `content_type` 默认值：
```python
content_type: str = Field("html", description="内容类型: html/file")
file_id: str | None = Field(None, description="PDF 文件 ID（file 类型时使用）")
```
删除 `file_url` 字段。

ArticleUpdate — 同样替换：
```python
content_type: str | None = Field(None, description="内容类型")
file_id: str | None = Field(None, description="PDF 文件 ID")
```
删除 `file_url` 字段。

ArticleResponse — 替换：
```python
content_type: str = "html"
file_id: str | None = None
```
删除 `file_url` 字段。

- [ ] **Step 2: 修改 admin service**

在 `service.py` 中：

1. 添加 imports：
```python
from fastapi import UploadFile
from app.core.exceptions import BadRequestException, NotFoundException
from app.db.image import repository as image_repo
from app.db.image.repository import MAX_IMAGE_SIZE
```

2. 修改 `create_article` 方法，添加 `content_type` 和 `file_id`：
```python
async def create_article(
    self, data: ArticleCreate, author_id: str
) -> Article:
    """创建文章。"""
    published_at = (
        datetime.now(timezone.utc)
        if data.status == "published"
        else None
    )
    article = Article(
        title=data.title,
        slug=data.slug,
        content_type=data.content_type,
        content=data.content,
        file_id=data.file_id,
        excerpt=data.excerpt,
        cover_image=data.cover_image,
        category_id=data.category_id,
        author_id=author_id,
        status=data.status,
        published_at=published_at,
    )
    return await repository.create_article(
        self.session, article
    )
```

3. 新增 `upload_pdf` 方法：
```python
async def upload_pdf(
    self, article_id: str, file: UploadFile
) -> str:
    """上传 PDF 文件，返回 file_id。"""
    article = await self.get_article(article_id)
    if file.content_type != "application/pdf":
        raise BadRequestException(
            message="仅支持 PDF 格式",
            code="INVALID_FILE_TYPE",
        )
    file_data = await file.read()
    if len(file_data) > MAX_IMAGE_SIZE:
        raise BadRequestException(
            message="文件大小不能超过 5MB",
            code="FILE_TOO_LARGE",
        )
    image = await image_repo.create_image(
        self.session,
        file_data,
        file.filename or "document.pdf",
        file.content_type,
    )
    article.file_id = image.id
    article.content_type = "file"
    await repository.update_article(self.session, article)
    return image.id
```

- [ ] **Step 3: 修改 admin router**

在 `router.py` 中添加 imports 和新接口：

```python
from fastapi import File, UploadFile


@router.post(
    "/list/detail/upload-pdf",
    summary="上传文章 PDF",
)
async def upload_pdf(
    article_id: str,
    session: DbSession,
    file: UploadFile = File(...),
) -> dict:
    """上传 PDF 文件并关联到文章。"""
    svc = ArticleService(session)
    file_id = await svc.upload_pdf(article_id, file)
    return {"file_id": file_id}
```

- [ ] **Step 4: 修改 public schemas**

在 `backend/api/api/public/content/schemas.py` 中，`ArticleResponse` 替换 `file_url` 为 `file_id`：
```python
content_type: str = "html"
file_id: str | None = None
```

- [ ] **Step 5: 提交**

```bash
git add backend/api/api/admin/config/web_settings/articles/ backend/api/api/public/content/schemas.py
git commit -m "feat: Article API 修改 — file_url → file_id + PDF 上传接口"
```

---

## Task 4: 前端 — UniversityEditDialog Textarea → TiptapEditor

**Files:**
- Modify: `frontend/components/admin/web-settings/UniversityEditDialog.tsx`
- Modify: `frontend/components/public/UniversityDetail.tsx`

- [ ] **Step 1: UniversityEditDialog 替换 3 个 Textarea**

在 `UniversityEditDialog.tsx` 中：

1. 添加 TiptapEditor import：
```typescript
import { TiptapEditor } from "@/components/editor/TiptapEditor"
```

2. 替换 description Textarea：
```tsx
<div className="space-y-1.5">
  <Label>简介</Label>
  <TiptapEditor
    content={description}
    onChange={(html) => setDescription(html)}
    placeholder="院校简介"
  />
</div>
```

3. 替换 admission_requirements Textarea：
```tsx
<div className="space-y-1.5">
  <Label>录取要求</Label>
  <TiptapEditor
    content={admissionReqs}
    onChange={(html) => setAdmissionReqs(html)}
    placeholder="录取要求（可选）"
  />
</div>
```

4. 替换 scholarship_info Textarea：
```tsx
<div className="space-y-1.5">
  <Label>奖学金信息</Label>
  <TiptapEditor
    content={scholarshipInfo}
    onChange={(html) => setScholarshipInfo(html)}
    placeholder="奖学金信息（可选）"
  />
</div>
```

- [ ] **Step 2: UniversityDetail 的 description 改为 SafeHtml**

在 `UniversityDetail.tsx` 中，将 description 的 `<p>` 渲染改为 SafeHtml：

替换：
```tsx
<p className="mt-3 leading-relaxed text-muted-foreground">{data.description}</p>
```

为：
```tsx
<SafeHtml html={data.description} className="prose mt-3 max-w-none" />
```

（SafeHtml 已经被 import 了，因为 admission_requirements 和 scholarship_info 已经在用）

- [ ] **Step 3: 提交**

```bash
git add frontend/components/admin/web-settings/UniversityEditDialog.tsx frontend/components/public/UniversityDetail.tsx
git commit -m "feat: 院校编辑器 Textarea → TiptapEditor，描述改用 SafeHtml 渲染"
```

---

## Task 5: 前端 — ArticleEditDialog 重构

**Files:**
- Modify: `frontend/components/admin/web-settings/ArticleEditDialog.tsx`

- [ ] **Step 1: 添加 TiptapEditor 和文件上传**

重构 ArticleEditDialog：

1. 添加 imports：
```typescript
import { TiptapEditor } from "@/components/editor/TiptapEditor"
```

2. 添加 `contentType` state（默认 "html"）和 `fileId` state：
```typescript
const [contentType, setContentType] = useState("html")
const [fileId, setFileId] = useState<string | null>(null)
const [uploading, setUploading] = useState(false)
```

3. 初始化时从 article 数据设置 contentType 和 fileId：
```typescript
useEffect(() => {
  if (open && article) {
    // ...existing field init...
    setContentType(article.content_type || "html")
    setFileId(article.file_id || null)
  } else if (open) {
    // ...existing reset...
    setContentType("html")
    setFileId(null)
  }
}, [open, article])
```

4. content_type 切换 UI（在 slug 和 excerpt 之间）：
```tsx
<div className="space-y-1.5">
  <Label>内容类型</Label>
  <div className="flex gap-4">
    <label className="flex items-center gap-2">
      <input
        type="radio"
        value="html"
        checked={contentType === "html"}
        onChange={() => setContentType("html")}
      />
      富文本
    </label>
    <label className="flex items-center gap-2">
      <input
        type="radio"
        value="file"
        checked={contentType === "file"}
        onChange={() => setContentType("file")}
      />
      PDF 文件
    </label>
  </div>
</div>
```

5. 条件渲染编辑器或上传区：
```tsx
{contentType === "html" ? (
  <div className="space-y-1.5">
    <Label>正文</Label>
    <TiptapEditor
      content={content}
      onChange={(html) => setContent(html)}
      placeholder="文章正文"
    />
  </div>
) : (
  <div className="space-y-1.5">
    <Label>PDF 文件</Label>
    {fileId ? (
      <div className="flex items-center gap-2 rounded border p-3">
        <span className="text-sm text-muted-foreground">已上传 PDF</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setFileId(null)}
        >
          重新上传
        </Button>
      </div>
    ) : (
      <div className="rounded-lg border-2 border-dashed p-6 text-center">
        <input
          type="file"
          accept="application/pdf"
          onChange={handlePdfUpload}
          className="hidden"
          id="pdf-upload"
        />
        <label
          htmlFor="pdf-upload"
          className="cursor-pointer text-sm text-muted-foreground hover:text-primary"
        >
          点击或拖拽上传 PDF 文件
        </label>
      </div>
    )}
  </div>
)}
```

6. PDF 上传处理函数：
```typescript
async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.type !== "application/pdf") {
    toast.error("仅支持 PDF 格式")
    return
  }
  setUploading(true)
  try {
    // 先创建文章（如果是新建模式），或直接上传
    if (isEdit && article) {
      const form = new FormData()
      form.append("file", file)
      const res = await api.post(
        `/admin/web-settings/articles/list/detail/upload-pdf?article_id=${article.id}`,
        form
      )
      setFileId(res.data.file_id)
      toast.success("PDF 上传成功")
    } else {
      toast.error("请先保存文章再上传 PDF")
    }
  } catch {
    toast.error("上传失败")
  } finally {
    setUploading(false)
  }
}
```

7. 修改提交 payload，用 `content_type` 和 `file_id` 替代 `file_url`：
```typescript
const payload = {
  title: trimmedTitle,
  slug: trimmedSlug,
  content_type: contentType,
  content: contentType === "html" ? content : "",
  file_id: contentType === "file" ? fileId : null,
  excerpt: excerpt.trim(),
  // ...rest
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/admin/web-settings/ArticleEditDialog.tsx
git commit -m "feat: ArticleEditDialog 重构 — TiptapEditor + content_type 切换 + PDF 上传"
```

---

## Task 6: 前端 — ArticleContent 渲染改为 SafeHtml + iframe

**Files:**
- Modify: `frontend/components/content/ArticleContent.tsx`

- [ ] **Step 1: 替换 react-markdown 渲染为 SafeHtml + iframe**

完全重写 `ArticleContent.tsx`：

```tsx
"use client"

import { SafeHtml } from "@/components/common/SafeHtml"

interface ArticleContentProps {
  contentType: string
  content: string
  fileId?: string | null
}

/** 文章内容渲染 */
export function ArticleContent({
  contentType,
  content,
  fileId,
}: ArticleContentProps) {
  if (contentType === "file" && fileId) {
    return (
      <div className="space-y-4">
        <iframe
          src={`/api/public/images/detail?id=${fileId}`}
          className="w-full rounded-lg border-0"
          style={{ height: "80vh" }}
          title="PDF 预览"
        />
        <div className="text-center">
          <a
            href={`/api/public/images/detail?id=${fileId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            下载 PDF
          </a>
        </div>
      </div>
    )
  }

  return (
    <SafeHtml
      html={content}
      className="prose max-w-none prose-headings:font-bold prose-a:text-primary"
    />
  )
}
```

- [ ] **Step 2: 更新 ArticleDetailPage 调用**

检查 `ArticleDetailPage.tsx` 中调用 `ArticleContent` 的地方，确保传入 `fileId` 替代 `fileUrl`：

```tsx
<ArticleContent
  contentType={article.content_type}
  content={article.content}
  fileId={article.file_id}
/>
```

- [ ] **Step 3: 提交**

```bash
git add frontend/components/content/ArticleContent.tsx frontend/components/content/ArticleDetailPage.tsx
git commit -m "feat: ArticleContent 渲染改为 SafeHtml + iframe PDF 预览"
```

---

## Task 7: 清理 Markdown 依赖

**Files:**
- Delete: `frontend/components/editor/MarkdownEditor.tsx`
- Modify: `frontend/package.json`

- [ ] **Step 1: 删除 MarkdownEditor 组件**

```bash
rm frontend/components/editor/MarkdownEditor.tsx
```

- [ ] **Step 2: 卸载 markdown 依赖**

```bash
pnpm --prefix frontend remove @uiw/react-md-editor react-markdown remark-gfm
```

- [ ] **Step 3: 确认无其他引用**

```bash
grep -r "react-markdown\|MarkdownEditor\|remark-gfm\|@uiw/react-md-editor" frontend/components/ frontend/app/ --include="*.tsx" --include="*.ts"
```

如果有残留引用，删除。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: 清理 Markdown 编辑器和依赖"
```

---

## Task 8: 修复测试

**Files:**
- Modify: 对应的 test 文件

- [ ] **Step 1: 修复 Article admin 测试**

在 `backend/api/tests/admin/config/web_settings/articles/` 下的测试文件中：
- `_make_article` mock 中 `file_url` 改为 `file_id`
- `ArticleCreate` 测试数据中 `file_url` 改为 `file_id`
- `content_type` 默认值从 `"markdown"` 改为 `"html"`
- 添加 `upload_pdf` 的正向/反向测试

- [ ] **Step 2: 修复 Article public 测试**

在 `backend/api/tests/public/content/` 下的测试文件中：
- mock 的 response 字段 `file_url` 改为 `file_id`
- `content_type` 默认值从 `"markdown"` 改为 `"html"`

- [ ] **Step 3: 运行全部测试**

```bash
uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e --tb=short -q
```

- [ ] **Step 4: 提交**

```bash
git add backend/api/tests/
git commit -m "fix: 修复因 Article 模型变更导致的测试失败"
```
