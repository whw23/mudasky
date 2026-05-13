# 专业级录取要求 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为每个院校专业增加独立的录取要求字段（富文本），在管理端可编辑、公开端可展开查看、导入导出支持。

**Architecture:** 在 `UniversityProgram` 模型添加 `admission_requirements` 字段（Text, nullable），通过 ProgramManager 展开编辑，公开详情页学科方向区域展开/折叠显示。Public API 的 `programs` 从 `list[str]` 改为 `list[ProgramBrief]` 嵌套对象。导入导出 Sheet2 新增第 5 列。

**Tech Stack:** SQLAlchemy (model), Alembic (migration), FastAPI/Pydantic (API), React + TiptapEditor (admin), SafeHtml (public)

---

### Task 1: 数据模型 + 迁移

**Files:**
- Modify: `backend/shared/app/db/university/program_models.py:8-31`
- Modify: `backend/shared/app/db/university/program_repository.py:60-66`
- Create: `backend/alembic/versions/xxxx_add_program_admission_requirements.py`

- [ ] **Step 1: 修改 UniversityProgram 模型**

在 `backend/shared/app/db/university/program_models.py` 的 `sort_order` 字段后添加：

```python
admission_requirements = Column(Text, nullable=True)
```

需要在文件顶部的 import 中确认 `Text` 已导入（当前 import 行是 `from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint`，需加上 `Text`）。

- [ ] **Step 2: 修改 replace_programs 传入 admission_requirements**

在 `backend/shared/app/db/university/program_repository.py` 的 `replace_programs` 函数中，`UniversityProgram` 创建处（第 61-66 行）添加字段：

```python
prog = UniversityProgram(
    id=str(uuid.uuid4()),
    university_id=university_id,
    name=p["name"],
    discipline_id=p["discipline_id"],
    sort_order=i,
    admission_requirements=p.get("admission_requirements"),
)
```

- [ ] **Step 3: 生成 Alembic 迁移**

```bash
cd backend && uv run alembic revision --autogenerate -m "add program admission requirements"
```

检查生成的迁移文件，确认 `upgrade` 包含：
```python
op.add_column('university_program', sa.Column('admission_requirements', sa.Text(), nullable=True))
```

- [ ] **Step 4: 运行迁移验证**

```bash
docker compose exec api alembic upgrade head
```

- [ ] **Step 5: 提交**

```bash
git add backend/shared/app/db/university/program_models.py backend/shared/app/db/university/program_repository.py backend/alembic/versions/
git commit -m "feat: UniversityProgram 模型添加 admission_requirements 字段"
```

---

### Task 2: Admin API Schema + Service

**Files:**
- Modify: `backend/api/api/admin/config/web_settings/universities/schemas.py:96-118`
- Modify: `backend/api/api/admin/config/web_settings/universities/service.py:189-202`

- [ ] **Step 1: 修改 Admin schemas**

在 `backend/api/api/admin/config/web_settings/universities/schemas.py`：

`ProgramResponse`（第 96-104 行）添加字段：

```python
class ProgramResponse(BaseModel):
    """专业响应。"""

    id: str
    name: str
    discipline_id: str
    sort_order: int
    admission_requirements: str | None = None

    model_config = {"from_attributes": True}
```

`ProgramItem`（第 107-112 行）添加字段：

```python
class ProgramItem(BaseModel):
    """专业条目。"""

    name: str
    discipline_id: str
    admission_requirements: str | None = None
```

- [ ] **Step 2: 修改 set_programs service 方法**

在 `backend/api/api/admin/config/web_settings/universities/service.py` 第 201 行，`programs_data` 构建处加入新字段：

```python
programs_data = [
    {
        "name": p.name,
        "discipline_id": p.discipline_id,
        "admission_requirements": p.admission_requirements,
    }
    for p in programs
]
```

- [ ] **Step 3: 重启 API 容器验证**

```bash
docker compose restart api
```

通过 curl 测试 `GET /admin/web-settings/universities/list` 确认 programs 包含 `admission_requirements` 字段。

- [ ] **Step 4: 提交**

```bash
git add backend/api/api/admin/config/web_settings/universities/schemas.py backend/api/api/admin/config/web_settings/universities/service.py
git commit -m "feat: Admin API 支持专业级录取要求"
```

---

### Task 3: Public API Schema + Router

**Files:**
- Modify: `backend/api/api/public/university/schemas.py`
- Modify: `backend/api/api/public/university/router.py:148`
- Modify: `frontend/types/index.ts:142`

- [ ] **Step 1: 修改 Public schemas**

在 `backend/api/api/public/university/schemas.py` 中，`UniversityResponse` 之前新增 `ProgramBrief`，并修改 `programs` 字段类型：

```python
class ProgramBrief(BaseModel):
    """专业摘要（嵌套用）。"""
    name: str
    admission_requirements: str | None = None


class UniversityResponse(BaseModel):
    """院校信息响应。"""

    id: str
    name: str
    name_en: str | None = None
    country: str
    province: str | None = None
    city: str
    logo_url: str | None = None
    description: str | None = None
    programs: list[ProgramBrief] = []
    # ... 其余字段不变
```

- [ ] **Step 2: 修改 Public router 构建 programs**

在 `backend/api/api/public/university/router.py` 第 148 行，将：

```python
programs=[p.name for p in detail["programs"]] if detail["programs"] else [],
```

改为：

```python
programs=[
    ProgramBrief(
        name=p.name,
        admission_requirements=p.admission_requirements,
    )
    for p in detail["programs"]
] if detail["programs"] else [],
```

文件顶部导入 `ProgramBrief`：在现有的 `from .schemas import ...` 行添加 `ProgramBrief`。

- [ ] **Step 3: 修改前端 University 类型**

在 `frontend/types/index.ts` 第 142 行，将：

```typescript
programs: string[]
```

改为：

```typescript
programs: { name: string; admission_requirements: string | null }[]
```

- [ ] **Step 4: 修复前端引用 programs 的位置**

`UniversityList.tsx` 和 `UniversityDetail.tsx` 中如果有直接使用 `uni.programs` 作为字符串数组的地方需要适配。当前 `UniversityList.tsx` 未渲染 programs，`UniversityDetail.tsx` 也未直接使用 programs（使用 disciplines），所以无需修改。

确认方式：

```bash
grep -rn '\.programs' frontend/components/public/UniversityList.tsx frontend/components/public/UniversityDetail.tsx
```

- [ ] **Step 5: 重启 API 验证**

```bash
docker compose restart api
curl -s http://localhost/api/public/universities/detail/$(curl -s http://localhost/api/public/universities/list | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][0]['id'])") | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['programs'])"
```

应输出 `[{"name": "...", "admission_requirements": null}, ...]`。

- [ ] **Step 6: 提交**

```bash
git add backend/api/api/public/university/schemas.py backend/api/api/public/university/router.py frontend/types/index.ts
git commit -m "feat: Public API programs 改为 ProgramBrief 嵌套对象"
```

---

### Task 4: ProgramManager 展开编辑录取要求

**Files:**
- Modify: `frontend/components/admin/web-settings/ProgramManager.tsx`

- [ ] **Step 1: 扩展 Program interface 和状态**

在 `frontend/components/admin/web-settings/ProgramManager.tsx` 中：

修改 `Program` interface（第 23-27 行）添加字段：

```typescript
interface Program {
  name: string
  discipline_id: string
  category_id: string
  admission_requirements: string
}
```

添加 import：

```typescript
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
```

添加展开状态：

```typescript
const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
```

- [ ] **Step 2: 修改 fetchPrograms 映射**

在 `fetchPrograms` 回调（第 57-63 行），添加新字段到映射：

```typescript
setPrograms((data ?? []).map((p: any) => {
  const disc = disciplines.find((d) => d.id === p.discipline_id)
  return {
    name: p.name,
    discipline_id: p.discipline_id,
    category_id: disc?.category_id ?? "",
    admission_requirements: p.admission_requirements ?? "",
  }
}))
```

- [ ] **Step 3: 添加 updateAdmissionReqs 函数**

在 `updateName` 函数（第 105-108 行）后添加：

```typescript
function updateAdmissionReqs(index: number, html: string) {
  const updated = [...programs]
  updated[index] = { ...updated[index], admission_requirements: html }
  setPrograms(updated)
}
```

- [ ] **Step 4: 修改 addProgram 初始值**

在 `addProgram` 函数（第 85-87 行）添加新字段：

```typescript
function addProgram() {
  setPrograms([...programs, { name: "", discipline_id: "", category_id: "", admission_requirements: "" }])
}
```

- [ ] **Step 5: 修改 handleSave 提交数据**

在 `handleSave` 函数（第 121 行），修改提交数据：

```typescript
programs: valid.map((p) => ({
  name: p.name.trim(),
  discipline_id: p.discipline_id,
  admission_requirements: p.admission_requirements.trim() || null,
})),
```

- [ ] **Step 6: 修改渲染——添加展开按钮和 TiptapEditor**

在专业行的 `<div key={idx} className="flex items-center gap-2">` 的渲染逻辑（第 158-200 行）中：

1. 将每行包裹在一个外层 `<div key={idx}>` 中
2. 在删除按钮左侧添加展开按钮
3. 在该行下方条件渲染 TiptapEditor

```tsx
import { TiptapEditor } from "@/components/editor/TiptapEditor"
```

每行渲染改为：

```tsx
<div key={idx} className="space-y-2">
  <div className="flex items-center gap-2">
    <Select ...>{/* 大分类，不变 */}</Select>
    <Select ...>{/* 小分类，不变 */}</Select>
    <Input ...>{/* 专业名称，不变 */}</Input>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
      className="size-8 shrink-0 p-0"
      title="录取要求"
    >
      {expandedIndex === idx
        ? <ChevronDown className="size-4 text-muted-foreground" />
        : <ChevronRight className="size-4 text-muted-foreground" />}
    </Button>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => removeProgram(idx)}
      className="size-8 shrink-0 p-0"
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  </div>
  {expandedIndex === idx && (
    <div className="ml-2 border-l-2 border-gray-200 pl-4">
      <Label className="text-xs text-muted-foreground">录取要求</Label>
      <TiptapEditor
        content={prog.admission_requirements}
        onChange={(html) => updateAdmissionReqs(idx, html)}
        placeholder="该专业的录取要求（可选）"
      />
    </div>
  )}
</div>
```

- [ ] **Step 7: 浏览器验证**

用 Playwright MCP 导航到院校编辑弹窗，打开 ProgramManager，展开一个专业的录取要求编辑器，确认：
1. 展开/折叠按钮工作
2. TiptapEditor 渲染正常
3. 输入内容后保存，刷新后数据保持

- [ ] **Step 8: 提交**

```bash
git add frontend/components/admin/web-settings/ProgramManager.tsx
git commit -m "feat: ProgramManager 支持展开编辑专业录取要求"
```

---

### Task 5: 公开详情页展开/折叠专业录取要求

**Files:**
- Modify: `frontend/components/public/UniversityDetail.tsx:78-82,147-166`

- [ ] **Step 1: 修改 disciplines 分组逻辑**

在 `frontend/components/public/UniversityDetail.tsx` 第 78-82 行，将分组结构从 `Record<string, string[]>` 改为保留 admission_requirements：

```typescript
const groupedPrograms = data.disciplines.reduce<
  Record<string, { name: string; admissionRequirements: string | null }[]>
>((acc, d) => {
  if (!acc[d.category_name]) acc[d.category_name] = []
  const prog = data.programs.find((p) => p.name === d.program_name)
  acc[d.category_name].push({
    name: d.name,
    admissionRequirements: prog?.admission_requirements ?? null,
  })
  return acc
}, {})
```

注意：当前 `disciplines` 返回的每项包含 `program_name`（来自 service 第 95 行），可用来关联 programs。但 `disciplines` 里的 `name` 是学科小分类名，不是专业名。需要同时显示学科名和关联的专业录取要求。

更精确的做法——按学科分类分组，每组展示学科名和对应专业的录取要求：

```typescript
interface DisciplineWithReqs {
  name: string
  programName: string
  admissionRequirements: string | null
}

const groupedDisciplines = data.disciplines.reduce<
  Record<string, DisciplineWithReqs[]>
>((acc, d) => {
  if (!acc[d.category_name]) acc[d.category_name] = []
  const prog = data.programs.find((p) => p.name === d.program_name)
  acc[d.category_name].push({
    name: d.name,
    programName: d.program_name,
    admissionRequirements: prog?.admission_requirements ?? null,
  })
  return acc
}, {})
```

这需要 `disciplines` 中有 `program_name`。检查当前 public schema：`DisciplineItem` 没有 `program_name` 字段。需要在 `DisciplineItem` 中添加。

- [ ] **Step 2: 修改 Public DisciplineItem schema 加 program_name**

在 `backend/api/api/public/university/schemas.py` 的 `DisciplineItem`（第 8-12 行）添加字段：

```python
class DisciplineItem(BaseModel):
    """学科项（嵌套用）。"""
    id: str
    name: str
    category_name: str
    program_name: str = ""
```

Public router 构建 `DisciplineItem` 时已经传入了 `program_name`（因为 service 返回的 disciplines dict 包含 `program_name` 字段，且 schema 用 `**d` 解包）。但需要确认 router 中 DisciplineItem 构建方式。

查看 router 第 161-163 行：

```python
disciplines=[DisciplineItem(**d) for d in detail["disciplines"]],
```

service 返回的每个 discipline dict 包含 `program_name` 键（service 第 91-96 行），但当前 `DisciplineItem` 没有这个字段，Pydantic `model_config` 默认不忽略多余字段。需要加上 `program_name` 字段后就能自动映射。

- [ ] **Step 3: 添加展开/折叠状态和 SafeHtml**

在 `frontend/components/public/UniversityDetail.tsx` 中：

确认 `SafeHtml` 已导入（当前第 11 行已有 `import { SafeHtml } from ...`）。

添加展开状态：

```typescript
const [expandedProgram, setExpandedProgram] = useState<string | null>(null)
```

添加 import：

```typescript
import { ChevronDown, ChevronRight } from "lucide-react"
```

（确认当前 import 中已有哪些 lucide-react 图标，添加缺少的。）

- [ ] **Step 4: 修改学科方向区域渲染**

替换第 147-166 行的学科方向渲染：

```tsx
{Object.keys(groupedDisciplines).length > 0 && (
  <section>
    <h2 className="text-xl font-bold">{t("disciplines")}</h2>
    <div className="mt-3 space-y-3">
      {Object.entries(groupedDisciplines).map(([category, items]) => (
        <div key={category}>
          <h3 className="font-medium text-muted-foreground">{category}</h3>
          <div className="mt-1 space-y-1">
            {items.map((item) => (
              <div key={`${item.name}-${item.programName}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (!item.admissionRequirements) return
                    const key = `${item.name}-${item.programName}`
                    setExpandedProgram(expandedProgram === key ? null : key)
                  }}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                    item.admissionRequirements
                      ? "cursor-pointer bg-gray-100 hover:bg-gray-200"
                      : "cursor-default bg-gray-100"
                  }`}
                >
                  {item.name}
                  {item.admissionRequirements && (
                    expandedProgram === `${item.name}-${item.programName}`
                      ? <ChevronDown className="size-3" />
                      : <ChevronRight className="size-3" />
                  )}
                </button>
                {item.admissionRequirements &&
                  expandedProgram === `${item.name}-${item.programName}` && (
                    <div className="ml-4 mt-1 rounded-lg border bg-gray-50 p-3">
                      <SafeHtml
                        html={item.admissionRequirements}
                        className="prose prose-sm max-w-none"
                      />
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 5: 更新前端 University 类型的 disciplines**

在 `frontend/types/index.ts` 第 150 行，disciplines 类型添加 `program_name`：

```typescript
disciplines: { id: string; name: string; category_name: string; program_name: string }[]
```

- [ ] **Step 6: 重启 API + 浏览器验证**

```bash
docker compose restart api
```

用 Playwright MCP 导航到院校详情页，确认：
1. 有录取要求的学科标签显示展开箭头
2. 点击展开显示录取要求内容
3. 再次点击折叠
4. 没有录取要求的标签不可点击

- [ ] **Step 7: 提交**

```bash
git add backend/api/api/public/university/schemas.py frontend/components/public/UniversityDetail.tsx frontend/types/index.ts
git commit -m "feat: 公开详情页支持展开/折叠专业录取要求"
```

---

### Task 6: 导入导出支持

**Files:**
- Modify: `backend/api/api/admin/config/web_settings/universities/export_service.py:60,131-137`
- Modify: `backend/api/api/admin/config/web_settings/universities/import_service.py:212-214,245-262,577-582,668-673`

- [ ] **Step 1: 修改导出——Sheet2 加列**

在 `backend/api/api/admin/config/web_settings/universities/export_service.py`：

第 60 行，Sheet2 表头添加"录取要求"：

```python
write_sheet_header(ws2, ["院校名称", "专业名称", "大分类", "小分类", "录取要求"])
```

第 131-137 行，写入专业行时添加 `admission_requirements`：

```python
ws2.append(
    [
        uni.name,
        prog.name,
        cat.name if cat else "",
        disc.name,
        prog.admission_requirements or "",
    ]
)
```

- [ ] **Step 2: 修改模板——Sheet2 示例行加列**

在 `backend/api/api/admin/config/web_settings/universities/import_service.py`：

第 212 行，模板 Sheet2 表头：

```python
write_sheet_header(ws2, ["院校名称", "专业名称", "大分类", "小分类", "录取要求"])
```

第 213-214 行，示例行加录取要求：

```python
ws2.append(["哈佛大学", "计算机科学", "工学", "计算机科学", "GPA 3.5+, GRE 320+"])
ws2.append(["哈佛大学", "金融学", "商学", "金融学", "GMAT 700+, 实习经历优先"])
```

- [ ] **Step 3: 修改导入解析——读取第 5 列**

在 `backend/api/api/admin/config/web_settings/universities/import_service.py`：

第 245-262 行的 Sheet2 解析循环，读取第 5 列：

```python
for row in ws2.iter_rows(min_row=2, values_only=True):
    if not row[0]:
        continue
    uni_name = str(row[0]).strip()
    prog_name = str(row[1]).strip() if row[1] else ""
    cat_name = str(row[2]).strip() if row[2] else ""
    disc_name = str(row[3]).strip() if row[3] else ""
    adm_reqs = str(row[4]).strip() if len(row) > 4 and row[4] else ""
    if not uni_name or not prog_name:
        continue
    if uni_name not in programs_map:
        programs_map[uni_name] = []
    programs_map[uni_name].append(
        {
            "program_name": prog_name,
            "category_name": cat_name,
            "discipline_name": disc_name,
            "admission_requirements": adm_reqs or None,
        }
    )
```

- [ ] **Step 4: 修改 _create_university 传入 admission_requirements**

在 `backend/api/api/admin/config/web_settings/universities/import_service.py`：

第 577-582 行，创建专业数据时加入新字段：

```python
programs.append(
    {
        "name": p["program_name"],
        "discipline_id": disc.id,
        "admission_requirements": p.get("admission_requirements"),
    }
)
```

- [ ] **Step 5: 修改 _update_university 传入 admission_requirements**

第 668-673 行，同样修改：

```python
programs.append(
    {
        "name": p["program_name"],
        "discipline_id": disc.id,
        "admission_requirements": p.get("admission_requirements"),
    }
)
```

- [ ] **Step 6: 重启 API + 验证**

```bash
docker compose restart api
```

1. 下载模板 ZIP，解压检查 Sheet2 有 5 列且示例行包含录取要求
2. 导出现有数据，检查 Sheet2 有录取要求列
3. 用修改后的模板导入，确认录取要求写入数据库

- [ ] **Step 7: 提交**

```bash
git add backend/api/api/admin/config/web_settings/universities/export_service.py backend/api/api/admin/config/web_settings/universities/import_service.py
git commit -m "feat: 院校导入导出支持专业级录取要求"
```

---

### Task 7: 后端单元测试

**Files:**
- Modify: `backend/api/tests/admin/university/test_service.py`（如果存在）
- Modify: `backend/api/tests/public/university/test_service.py`（如果存在）

- [ ] **Step 1: 确认测试文件位置**

```bash
find backend/api/tests -path '*university*' -name '*.py' | sort
```

- [ ] **Step 2: 更新 admin service 单元测试**

找到 `set_programs` 的测试，添加 `admission_requirements` 测试用例：

正例：设置带录取要求的专业，验证 `replace_programs` 被调用时 dict 包含 `admission_requirements`。

反例：`admission_requirements` 为空/null 时正常保存。

- [ ] **Step 3: 更新 public service 单元测试**

找到 `get_university_detail` 的测试，验证返回的 programs 对象包含 `admission_requirements`。

- [ ] **Step 4: 运行单元测试验证**

```bash
uv run --project backend/api python -m pytest backend/api/tests/ -v --ignore=backend/api/tests/e2e -k university
```

- [ ] **Step 5: 提交**

```bash
git add backend/api/tests/
git commit -m "test: 更新院校专业录取要求单元测试"
```

---

### Task 8: 前端单元测试

**Files:**
- 检查并修改 `frontend/tests/components/blocks/UniversityListBlock.test.tsx`
- 检查并修改其他引用 `programs: string[]` 的测试文件

- [ ] **Step 1: 查找受影响的前端测试**

```bash
grep -rn 'programs.*\[' frontend/tests/ frontend/src/ --include='*.test.*' | grep -v node_modules
```

- [ ] **Step 2: 更新测试中的 programs mock 数据**

将所有测试中的 `programs: ["xxx"]` 改为 `programs: [{ name: "xxx", admission_requirements: null }]`。

- [ ] **Step 3: 运行前端测试**

```bash
pnpm --prefix frontend test
```

- [ ] **Step 4: 提交**

```bash
git add frontend/tests/ frontend/src/
git commit -m "test: 更新前端测试适配 programs 类型变更"
```
