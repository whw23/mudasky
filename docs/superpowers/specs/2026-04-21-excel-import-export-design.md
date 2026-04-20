# Excel 导入导出 + 院校专业模型改造

## 概述

为学科分类、院校、成功案例、文章四类数据实现 Excel 批量导入、导出、模板下载。同时改造院校专业数据模型，从 JSONB 数组改为独立关联表 `UniversityProgram`，每个专业必须关联一个学科小分类。

## 一、数据模型改造

### 1.1 新增 `UniversityProgram` 表

| 列 | 类型 | 约束 |
|---|------|------|
| id | String(36) | PK, UUID |
| university_id | String(36) | FK→university.id, NOT NULL, cascade delete |
| name | String(200) | NOT NULL |
| discipline_id | String(36) | FK→discipline.id, NOT NULL |
| sort_order | Integer | default=0 |
| created_at | DateTime | server_default |

约束：`UniqueConstraint(university_id, name)` — 同一院校不能有同名专业。

### 1.2 删除旧结构

- 删除 `University.programs` JSONB 列
- 删除 `UniversityDiscipline` 多对多表及其模型
- 删除所有引用旧结构的代码：
  - `disc_repo.set_university_disciplines()` 等 repository 方法
  - service/router/schema 中读写 programs 和 UniversityDiscipline 的逻辑
  - 现有的 `import_service.py`（基于旧模型，需完全重写）
  - 前端院校编辑中的 programs 输入和学科关联 UI

### 1.3 关系变化

```
旧：University ──M:M──> Discipline (via UniversityDiscipline)
    University.programs = ["计算机科学", "金融学"]  (JSONB, 无关联)

新：University ──1:M──> UniversityProgram ──M:1──> Discipline
    院校的学科方向 = 其所有专业关联的小分类的去重集合
```

### 1.4 数据库重建

开发环境直接 `docker compose down -v` 重建数据库，不做迁移。Alembic 迁移文件后续按新模型生成。

## 二、学科分类体系

### 2.1 两级结构

- **大分类**（DisciplineCategory）：如 工学、商学、医学
- **小分类**（Discipline）：如 计算机科学、金融学、临床医学

### 2.2 关联关系

- 院校的每个专业（UniversityProgram）必须关联一个小分类
- 小分类必须属于一个大分类
- 通过专业间接获取院校的学科方向

## 三、Excel 格式定义

### 3.1 学科分类

**文件格式：** 单 `.xlsx` 文件（无需 ZIP，没有图片/文件）

**Sheet：** 单 Sheet

| 大分类 | 小分类 |
|--------|--------|
| 工学 | 计算机科学 |
| 工学 | 电子工程 |
| 商学 | 金融学 |
| 商学 | 会计学 |

- 大分类自动去重创建
- 匹配逻辑：按（大分类名, 小分类名）唯一匹配

### 3.2 院校

**文件格式：** ZIP 包含 Excel + 图片文件夹

**ZIP 结构：**

```
universities.zip
├── universities.xlsx
└── images/
    ├── 哈佛大学_logo.jpg
    ├── 哈佛大学_1.jpg
    ├── 哈佛大学_2.jpg
    └── ...
```

**Sheet1 "基本信息"：** 每行一所院校

| 名称 | 英文名 | 国家 | 省份 | 城市 | 网站 | 描述 | 录取要求 | 奖学金信息 | 纬度 | 经度 | 是否精选 | 排序 | Logo文件名 | 展示图文件名 | QS排名 |
|------|--------|------|------|------|------|------|---------|-----------|------|------|---------|------|-----------|------------|--------|
| 哈佛大学 | Harvard University | 美国 | 马萨诸塞州 | 剑桥 | https://harvard.edu | 世界顶尖学府 | GPA 3.8+ | 多种奖学金 | 42.377 | -71.117 | 是 | 1 | 哈佛大学_logo.jpg | 哈佛大学_1.jpg;哈佛大学_2.jpg | 2026:4;2025:5 |

- Logo文件名：对应 images/ 下的文件
- 展示图文件名：分号分隔多个文件名
- QS排名：`年份:排名` 格式，分号分隔

**Sheet2 "专业列表"：** 每行一个专业

| 院校名称 | 专业名称 | 大分类 | 小分类 |
|---------|---------|--------|--------|
| 哈佛大学 | 计算机科学 | 工学 | 计算机科学 |
| 哈佛大学 | 金融学 | 商学 | 金融学 |

- 通过"院校名称"关联到 Sheet1
- 大分类+小分类 用于匹配 Discipline

### 3.3 成功案例

**文件格式：** ZIP 包含 Excel + 图片文件夹

**ZIP 结构：**

```
cases.zip
├── cases.xlsx
└── images/
    ├── 张三_avatar.jpg
    ├── 张三_offer.jpg
    └── ...
```

**Sheet：** 单 Sheet

| 学生姓名 | 院校名称 | 专业 | 入学年份 | 感言 | 头像文件名 | Offer图文件名 | 是否精选 | 排序 |
|---------|---------|------|---------|------|-----------|-------------|---------|------|
| 张三 | 哈佛大学 | 计算机科学 | 2026 | 感谢慕大... | 张三_avatar.jpg | 张三_offer.jpg | 是 | 1 |

- 院校名称：匹配已有院校的 `name`，匹配成功填入 `university_id`
- 头像/Offer图文件名：对应 images/ 下的文件

### 3.4 文章

**文件格式：** ZIP 包含 Excel + 正文文件夹

**ZIP 结构：**

```
articles.zip
├── articles.xlsx
└── content/
    ├── 留学德国全攻略.html
    ├── 签证材料清单.pdf
    └── ...
```

**Sheet：** 单 Sheet

| 标题 | Slug | 内容类型 | 正文文件名 | 摘要 | 封面图文件名 | 状态 | 是否置顶 |
|------|------|---------|-----------|------|------------|------|---------|
| 留学德国全攻略 | study-in-germany | html | 留学德国全攻略.html | 全面介绍... | cover1.jpg | published | 否 |
| 签证材料清单 | visa-checklist | file | 签证材料清单.pdf | 申请签证... | | draft | 否 |

- `category_id` 不在 Excel 中，导入时自动填入当前分类
- `author_id` 导入时取当前登录用户
- 内容类型：`html`（正文在 HTML 文件中）或 `file`（正文为 PDF 文件）
- 正文文件名：对应 content/ 下的文件
- 封面图文件名：对应 content/ 下的图片文件（和正文放同一目录）

## 四、导入工作流

### 4.1 通用流程

```
用户上传文件（.xlsx 或 .zip）
  ↓
POST /{entity}/import/preview
  → 解析 Excel + 文件
  → 校验必填字段
  → 匹配已有数据（按唯一标识）
  → 标记每条记录状态：新增 / 更新(N字段变更) / 无变化 / 错误
  → 标记冲突项（学科不存在、院校名不匹配等）
  → 返回 preview 结果
  ↓
前端展示 preview 弹窗
  → 用户处理冲突（新建学科/关联已有/跳过）
  → 用户确认导入
  ↓
POST /{entity}/import/confirm
  → 执行 merge 导入
  → 有值字段覆盖，空字段保留原值
  → 上传关联的图片/文件到 Image 表
  → 返回结果统计（新增N/更新N/跳过N/失败N）
```

### 4.2 唯一标识（merge 匹配键）

| 数据类型 | 匹配键 | 说明 |
|---------|--------|------|
| 学科分类 | (大分类名, 小分类名) | 同名即同一学科 |
| 院校 | name | 院校名唯一 |
| 成功案例 | (student_name, university, year) | 同一学生同一院校同一年 |
| 文章 | slug | URL 标识唯一 |

### 4.3 Merge 策略

- Excel 中**有值的字段**覆盖数据库中的值
- Excel 中**空的字段**保留数据库中的现有值
- **新记录**直接创建
- 图片字段：有新文件名则上传替换，文件名为空则保留原图

### 4.4 冲突处理（导入时引用不存在的数据）

**院校导入 — 专业的学科不存在：**

preview 返回 `unknown_disciplines` 列表，前端展示每个未知学科，用户可选：
- 创建新的（自动创建大分类+小分类）
- 关联到已有小分类（下拉选择）
- 跳过该专业

**成功案例导入 — 院校名不匹配：**

preview 返回 `unknown_universities` 列表，前端展示每个未知院校名，用户可选：
- 关联到已有院校（搜索选择）
- 保留文本（university_id 为空，只填 university 文本字段）
- 跳过该案例

**文章导入 — slug 冲突：**

按 merge 策略直接更新已有文章，preview 中标记为"更新"。

## 五、导出工作流

### 5.1 通用流程

```
用户点击"导出"按钮
  ↓
GET /{entity}/export
  → 查询所有数据（或当前分类下的数据）
  → 生成 Excel
  → 从 Image 表提取关联的图片/文件二进制数据
  → 打包为 ZIP
  → 返回文件流下载
```

### 5.2 导出内容

导出的 ZIP 格式与导入模板一致（往返一致），可以直接编辑后重新导入。

## 六、API 端点

### 6.1 学科分类

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/disciplines/import/template` | 下载导入模板 |
| POST | `/disciplines/import/preview` | 预览导入 |
| POST | `/disciplines/import/confirm` | 确认导入 |
| GET | `/disciplines/export` | 导出 ZIP |

### 6.2 院校

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/universities/list/import/template` | 下载导入模板（已有，需重写） |
| POST | `/universities/list/import/preview` | 预览导入（已有，需重写） |
| POST | `/universities/list/import/confirm` | 确认导入（已有，需重写） |
| GET | `/universities/list/export` | 导出 ZIP（新增） |

### 6.3 成功案例

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/cases/list/import/template` | 下载导入模板 |
| POST | `/cases/list/import/preview` | 预览导入 |
| POST | `/cases/list/import/confirm` | 确认导入 |
| GET | `/cases/list/export` | 导出 ZIP |

### 6.4 文章

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/articles/list/import/template?category_id=` | 下载导入模板（带分类名） |
| POST | `/articles/list/import/preview?category_id=` | 预览导入（自动归入分类） |
| POST | `/articles/list/import/confirm?category_id=` | 确认导入 |
| GET | `/articles/list/export?category_id=` | 导出当前分类文章 ZIP |

## 七、后端架构

```
shared/app/utils/
└── excel_io.py                    # 通用工具：读 sheet、写 header、ZIP 打包解压

api/admin/config/web_settings/
├── disciplines/
│   ├── import_service.py          # 学科导入
│   └── export_service.py          # 学科导出
├── universities/
│   ├── import_service.py          # 院校导入（重写）
│   └── export_service.py          # 院校导出（新增）
├── cases/
│   ├── import_service.py          # 案例导入（新增）
│   └── export_service.py          # 案例导出（新增）
└── articles/
    ├── import_service.py          # 文章导入（新增）
    └── export_service.py          # 文章导出（新增）
```

不抽象通用导入导出框架——四类数据字段、关联、文件差异大，各自独立实现更清晰。`excel_io.py` 只放真正共用的工具函数。

**Python 依赖：** `openpyxl`（已有，用于 Excel 读写）

## 八、前端 UI

### 8.1 按钮位置

| 数据类型 | 按钮位置 | 组件 |
|---------|---------|------|
| 学科分类 | 院校选择页 → 学科分类管理区域 | `UniversitiesEditPreview.tsx` |
| 院校 | 院校选择页 → 院校管理区域 | `UniversitiesEditPreview.tsx` |
| 成功案例 | 成功案例页 | `CasesEditPreview.tsx` |
| 文章 | 各分类页面（预设+自定义 tab） | `ArticleListPreview.tsx` |

### 8.2 工具栏按钮

每个管理区域顶部添加三个按钮：

```
[下载模板] [导入] [导出]
```

### 8.3 导入预览弹窗

导入后弹出 Dialog，展示：

1. **解析结果摘要**：新增 N 条 / 更新 N 条 / 无变化 N 条 / 错误 N 条
2. **数据表格**：每行显示状态标签（新增/更新/错误），更新的行高亮变更字段
3. **冲突处理区**：未知学科、未匹配院校等，每条提供下拉选择（新建/关联已有/跳过）
4. **确认按钮**：处理完冲突后可点击确认导入

### 8.4 通用组件

```
frontend/components/admin/
├── ImportExportToolbar.tsx         # 下载模板/导入/导出三按钮工具栏
└── ImportPreviewDialog.tsx         # 导入预览弹窗（表格+冲突处理+确认）
```

`ImportPreviewDialog` 接收通用 props（preview 数据、冲突项、confirm 回调），各数据类型通过不同的列定义和冲突处理器定制。

## 九、实施阶段

| 阶段 | 内容 |
|------|------|
| 1 | 数据模型改造：新建 UniversityProgram，删除旧结构，清理旧代码，重建数据库 |
| 2 | 通用工具 + 学科分类导入导出（最简单，验证整体流程） |
| 3 | 院校导入导出（最复杂，多 sheet + 图片 + 专业关联） |
| 4 | 成功案例导入导出 |
| 5 | 文章导入导出 |
| 6 | 前端 UI（工具栏 + 预览弹窗） |

## 十、不在范围内

- 用户数据的导入导出
- 导入进度条（数据量小，同步处理即可）
- 导入历史记录
- 导入回滚
