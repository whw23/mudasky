# 院校与成功案例功能增强 — 设计文档

## 概述

增强院校（University）和成功案例（SuccessCase）功能：新增图片管理、学科分类体系、批量导入、主页展示、详情页丰富化。

## 1. 数据模型

### 1.1 新增表

#### `image`（公共图片表）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID |
| file_data | LargeBinary | NOT NULL | 图片二进制（BYTEA） |
| filename | String(255) | NOT NULL | 原始文件名 |
| mime_type | String(100) | NOT NULL | 如 image/png |
| file_size | Integer | NOT NULL | 字节数 |
| file_hash | String(64) | NOT NULL, indexed | SHA-256，用于去重 |
| created_at | DateTime(tz) | NOT NULL | |

#### `discipline_category`（学科大分类）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID |
| name | String(100) | UNIQUE, NOT NULL | 如"工学"、"商学" |
| sort_order | Integer | NOT NULL, default=0 | |
| created_at | DateTime(tz) | NOT NULL | |
| updated_at | DateTime(tz) | NOT NULL | |

#### `discipline`（学科）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID |
| category_id | String(36) | FK → discipline_category.id, NOT NULL | 所属大分类 |
| name | String(200) | NOT NULL | 如"计算机科学" |
| sort_order | Integer | NOT NULL, default=0 | |
| created_at | DateTime(tz) | NOT NULL | |
| updated_at | DateTime(tz) | NOT NULL | |

唯一约束：`(category_id, name)`

#### `university_discipline`（院校-学科多对多）

| 字段 | 类型 | 约束 |
|------|------|------|
| university_id | String(36) | PK, FK → university.id |
| discipline_id | String(36) | PK, FK → discipline.id |

#### `university_image`（院校图片集）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | String(36) | PK | UUID |
| university_id | String(36) | FK → university.id, NOT NULL | |
| image_id | String(36) | FK → image.id, NOT NULL | |
| sort_order | Integer | NOT NULL, default=0 | |

约束：每个院校最多 5 张图片（service 层校验）。

### 1.2 修改现有表

#### `university` 新增字段

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| logo_image_id | String(36) | FK → image.id, nullable | 校徽图片 |
| admission_requirements | Text | nullable | 录取要求（富文本） |
| scholarship_info | Text | nullable | 奖学金信息（富文本） |
| qs_rankings | JSONB | nullable | `[{"year": 2026, "ranking": 45}]` |
| latitude | Float | nullable | 纬度 |
| longitude | Float | nullable | 经度 |

旧字段 `logo_url` 保留，迁移完成后删除。

#### `success_case` 新增字段

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| university_id | String(36) | FK → university.id, nullable | 可选关联院校 |
| avatar_image_id | String(36) | FK → image.id, nullable | 学生照片 |
| offer_image_id | String(36) | FK → image.id, nullable | 录取通知书图片 |

旧字段 `avatar_url` 保留，迁移完成后删除。

当 `university_id` 有值时优先使用关联院校信息，为空时回退到纯文本 `university` 字段。

## 2. 公共图片 API

### 2.1 读取接口（公开，无需认证）

**`GET /api/public/images/detail`**

- Query: `id`（图片 ID）
- Response: 二进制图片数据，`Content-Type` 按 mime_type
- 缓存: `Cache-Control: public, max-age=86400` + ETag
- 前端统一引用: `<img src="/api/public/images/detail?id=xxx">`

### 2.2 上传/删除（各业务自有接口）

无统一上传入口。各业务 service 调用 image repository 完成存储：

- 院校校徽/图片集 → `admin/web-settings/universities` 的接口
- 案例学生照片/录取通知书 → `admin/web-settings/cases` 的接口
- 后续用户头像等 → `portal/profile` 的接口

### 2.3 代码组织

| 层 | 位置 |
|---|------|
| Model | `shared/app/db/image/models.py` |
| Repository | `shared/app/db/image/repository.py`（存储、去重、引用检查、删除） |
| Public Router | `api/api/public/image/router.py`（只有读取） |

上传校验逻辑（MIME 类型限制、大小限制 5MB、SHA-256 去重）在各业务 service 中实现，调用 image repository 完成存储。去重逻辑（按 file_hash 查询已有记录）在 repository 层。

## 3. 学科分类管理

### 3.1 Admin 接口

**学科大分类**

- `GET /admin/web-settings/disciplines/categories/list`
- `POST /admin/web-settings/disciplines/categories/list/create`
- `POST /admin/web-settings/disciplines/categories/list/detail/edit`
- `POST /admin/web-settings/disciplines/categories/list/detail/delete` — 需检查下属学科是否有院校关联

**学科**

- `GET /admin/web-settings/disciplines/list` — 支持按 category_id 筛选
- `POST /admin/web-settings/disciplines/list/create` — 指定 category_id
- `POST /admin/web-settings/disciplines/list/detail/edit`
- `POST /admin/web-settings/disciplines/list/detail/delete` — 需检查是否有院校关联

### 3.2 Public 接口

- `GET /api/public/disciplines/list` — 树形结构 `[{category, disciplines: [...]}]`
- 缓存: `Cache-Control: public, max-age=3600` + ETag

### 3.3 代码组织

| 层 | 位置 |
|---|------|
| Models | `shared/app/db/discipline/models.py`（discipline_category + discipline + university_discipline） |
| Repository | `shared/app/db/discipline/repository.py` |
| Public Router | `api/api/public/discipline/router.py` |
| Admin Router | `api/api/admin/config/web_settings/disciplines/router.py` |
| Admin Service | `api/api/admin/config/web_settings/disciplines/service.py` |
| Admin Schemas | `api/api/admin/config/web_settings/disciplines/schemas.py` |

### 3.4 前端管理界面

学科分类管理集成在 Web Settings → 院校管理页面内（不是独立 tab）。管理员在院校管理的上下文中管理学科分类和为院校关联学科。

## 4. 院校功能增强

### 4.1 新增 Admin 接口

在 `admin/web-settings/universities` 下新增：

**图片**

- `POST /admin/web-settings/universities/list/detail/upload-logo` — 上传校徽
- `POST /admin/web-settings/universities/list/detail/upload-image` — 上传院校图片（service 层校验 ≤5 张）
- `POST /admin/web-settings/universities/list/detail/delete-image` — 删除某张院校图片

**学科关联**

- `POST /admin/web-settings/universities/list/detail/disciplines` — 设置关联学科（传入 discipline_id 数组，全量覆盖）

**批量导入**

- `POST /admin/web-settings/universities/list/import/preview` — 上传 Excel/zip，解析校验，返回预览
- `POST /admin/web-settings/universities/list/import/confirm` — 用户确认后执行导入
- `GET /admin/web-settings/universities/list/import/template` — 下载 Excel 模板

### 4.2 修改 Public 接口

**`GET /api/public/universities/list`** 新增筛选参数：

- `discipline_category_id` — 按大分类筛选
- `discipline_id` — 按学科筛选

**`GET /api/public/universities/detail`** 响应新增：

- logo_image_id、院校图片集 ID 列表、学科分类树
- admission_requirements、qs_rankings、scholarship_info
- latitude、longitude
- 关联成功案例列表（通过 success_case.university_id 反查）

### 4.3 前端院校详情页

重新设计为丰富展示页：

- **顶部**：校徽 + 名称/英文名 + 地址 + 网站链接 + QS 最新排名徽标
- **图片集**：轮播/画廊（≤5 张）
- **学科分类**：按大分类分组的标签展示
- **录取要求**：富文本渲染
- **奖学金信息**：富文本渲染
- **地图**：Leaflet + OpenStreetMap 定位（需 latitude/longitude）
- **关联成功案例**：卡片列表，点击跳转案例详情

### 4.4 前端院校列表页增强

**筛选增强**（在现有搜索 + 国家/省份/城市之上）：

- 学科大分类下拉 → 联动学科下拉
- QS 排名范围筛选（Top 50 / Top 100 / Top 200 / 不限）

**卡片增强**：校徽 + 名称/英文名 + 国家城市 + QS 最新排名徽标 + 学科标签（前几个）

## 5. 成功案例功能增强

### 5.1 新增 Admin 接口

在 `admin/web-settings/cases` 下新增：

- `POST /admin/web-settings/cases/list/detail/upload-avatar` — 上传学生照片
- `POST /admin/web-settings/cases/list/detail/upload-offer` — 上传录取通知书图片

编辑案例时新增 `university_id` 可选字段，管理员从下拉列表选择院校或留空。

### 5.2 修改 Public 接口

**`GET /api/public/cases/detail`** 响应新增：

- avatar_image_id、offer_image_id
- 当 `university_id` 有值时，附带关联院校基本信息（名称、校徽 image_id、ID）

### 5.3 前端案例详情页

- **顶部**：学生照片 + 姓名 + 年份
- **录取信息**：院校名（有关联时可点击跳转院校详情）+ 专业
- **录取通知书**：图片展示（可点击放大）
- **学生感言**：富文本渲染
- **CTA**：咨询按钮（保留现有）

## 6. 主页改造

### 替换「热门目的地」板块

当前硬编码的 3 个国家卡片替换为两个动态板块：

**精选院校**

- 数据源: `GET /api/public/universities/list?is_featured=true&page_size=6`
- 展示: 网格卡片 — 校徽 + 名称 + 国家/城市 + QS 排名（如有）
- 底部"查看更多"链接到 `/universities`

**精选案例**

- 数据源: `GET /api/public/cases/list?is_featured=true&page_size=4`
- 展示: 卡片 — 学生照片 + 姓名 + 录取院校 + 专业 + 年份
- 底部"查看更多"链接到 `/cases`

**降级**：精选数据为空时对应板块不渲染。

## 7. 批量导入

### 7.1 文件格式

每个院校一个 Excel 文件（`.xlsx`），多 Sheet：

- **Sheet1「基本信息」**：键值对形式

  | 字段 | 值 |
  |------|-----|
  | 名称 | 哈佛大学 |
  | 英文名 | Harvard University |
  | 国家 | 美国 |
  | 省份 | 马萨诸塞州 |
  | 城市 | 剑桥 |
  | 网站 | https://harvard.edu |
  | 描述 | ... |
  | 录取要求 | ... |
  | 奖学金信息 | ... |
  | 纬度 | 42.3770 |
  | 经度 | -71.1167 |

- **Sheet2「学科分类」**：每行一个学科

  | 大分类 | 学科 |
  |--------|------|
  | 工学 | 计算机科学 |
  | 商学 | 金融学 |

- **Sheet3「QS排名」**：每行一个年份

  | 年份 | 排名 |
  |------|------|
  | 2026 | 4 |
  | 2025 | 5 |

### 7.2 上传方式

- 单个 `.xlsx` → 导入一所院校
- `.zip` 压缩包 → 解压后批量导入多所院校

### 7.3 两阶段流程

**阶段一：预览校验**

`POST /admin/web-settings/universities/list/import/preview`

- 解析文件 → 校验格式和必填字段
- 返回：valid_rows、error_rows、unknown_disciplines（系统中不存在的学科分类）
- 前端展示预览，用户为未知学科选择"创建新分类"或"映射到已有分类"

**阶段二：执行导入**

`POST /admin/web-settings/universities/list/import/confirm`

- Body: `{rows, discipline_mappings: [{name, action: "create"} | {name, map_to: "discipline_id"}]}`
- 返回: `{imported, skipped, created_disciplines}`

### 7.4 模板下载

`GET /admin/web-settings/universities/list/import/template` — 下载含示例数据的 Excel 模板。

### 7.5 图片处理

批量导入只导入文字数据，图片在导入后通过管理后台逐个上传。

## 8. 前端依赖新增

| 包 | 用途 | 协议 |
|----|------|------|
| leaflet | 地图渲染 | BSD-2-Clause |
| react-leaflet | React 封装 | MIT |
| openpyxl（后端） | Excel 解析 | MIT |

## 9. 数据库迁移

通过 Alembic 迁移：

1. 创建 image、discipline_category、discipline、university_discipline、university_image 表
2. university 表新增 logo_image_id、admission_requirements、scholarship_info、qs_rankings、latitude、longitude
3. success_case 表新增 university_id、avatar_image_id、offer_image_id
4. 迁移完成后，后续版本删除 university.logo_url 和 success_case.avatar_url
