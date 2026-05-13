# 专业级录取要求

## 概述

在现有院校级通用录取要求（`University.admission_requirements`）基础上，为每个专业（`UniversityProgram`）增加独立的录取要求字段。院校级作为通用要求，专业级作为补充。

## 数据层

### 模型变更

`UniversityProgram` 新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `admission_requirements` | `Text, nullable` | 专业独立的录取要求，富文本 HTML |

### 数据库迁移

Alembic 迁移：`ALTER TABLE university_program ADD COLUMN admission_requirements TEXT`。

## 后端 API

### Schema 变更

**Admin schemas（`admin/config/web_settings/universities/schemas.py`）：**

- `ProgramResponse` 新增 `admission_requirements: str | None = None`
- `ProgramItem`（设置专业请求）新增 `admission_requirements: str | None = None`

**Public schemas（`public/university/schemas.py`）：**

- 新增 `ProgramBrief` 模型：`name: str` + `admission_requirements: str | None = None`
- `UniversityResponse.programs` 从 `list[str]` 改为 `list[ProgramBrief]`

### Router/Service 变更

- Admin：`set_programs` 端点保存时写入 `admission_requirements`
- Public：`get_university_detail` 返回的 programs 改为 `ProgramBrief` 对象列表

## 前端管理（ProgramManager）

### 展开编辑模式

- 每行专业右侧新增展开按钮（ChevronDown/ChevronRight 图标）
- 点击展开：该行下方插入 TiptapEditor 区域，编辑该专业的录取要求
- 再次点击折叠收起
- 保存时连同 `admission_requirements` 一起提交到 `set_programs` 端点

## 公开详情页（UniversityDetail）

### 学科方向区域

现有按大分类分组展示专业列表，改为：

- 有录取要求的专业名称右侧显示展开箭头（ChevronRight/ChevronDown）
- 点击展开显示该专业的录取要求（SafeHtml 渲染）
- 没有录取要求的专业保持原样，不可展开
- 院校级的"录取要求"区域保持不变，作为通用要求

## 导入导出

### 导出（export）

Sheet2「专业列表」新增第 5 列：`录取要求`。导出时将 `admission_requirements`（HTML）转为纯文本写入。

### 模板（template）

Sheet2「专业列表」示例行同步新增 `录取要求` 列，填入示例文本（如"雅思6.5以上，GPA 3.0+"）。

### 导入（import）

- `_parse_workbook` 解析 Sheet2 时读取第 5 列 `录取要求`
- 写入 `programs_map` 中每个专业的 `admission_requirements`
- `_create_university` 和 `_update_university` 设置专业时写入 `admission_requirements`
- 导入的录取要求是纯文本，管理员可后续通过 ProgramManager 用富文本编辑器修改

## 不涉及的范围

- 院校列表卡片不展示专业录取要求
- 院校级 `admission_requirements` 不变
