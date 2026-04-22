# 全页面可编辑配置 设计文档

## 背景

web-settings 预览已与实际页面视觉同步（共享组件），但大量页面内容仍从翻译文件硬编码，无法通过后台编辑。本次改造将所有公开页面的文字内容改为后端配置驱动，支持通过 EditableOverlay 直接编辑，翻译值作 fallback。

## 目标

1. 所有公开页面的文字内容可通过 web-settings 编辑
2. 数组类内容（流程步骤、材料清单等）支持可增减/排序
3. 所有字段有翻译 fallback，防止水合失败和空白
4. 不改后端 API，所有新字段存入现有 `site_info` JSON

## 数据模型

所有新字段加到 `site_info` JSON 中。多语言字段用 `LocalizedField`（`{ zh: "...", en: "..." }`）。

### 简单字段（标题+描述）

| 字段 key | 类型 | 页面 | 用途 |
|----------|------|------|------|
| `home_intro_title` | LocalizedField | 首页 | 公司简介标题 |
| `home_intro_content` | LocalizedField | 首页 | 公司简介内容 |
| `home_cta_title` | LocalizedField | 首页 | CTA 标题 |
| `home_cta_desc` | LocalizedField | 首页 | CTA 描述 |
| `about_cta_title` | LocalizedField | 关于 | CTA 标题 |
| `about_cta_desc` | LocalizedField | 关于 | CTA 描述 |
| `universities_intro_title` | LocalizedField | 院校 | 介绍标题 |
| `universities_intro_desc` | LocalizedField | 院校 | 介绍描述 |
| `universities_cta_title` | LocalizedField | 院校 | CTA 标题 |
| `universities_cta_desc` | LocalizedField | 院校 | CTA 描述 |
| `cases_intro_title` | LocalizedField | 案例 | 介绍标题 |
| `cases_intro_desc` | LocalizedField | 案例 | 介绍描述 |
| `cases_cta_title` | LocalizedField | 案例 | CTA 标题 |
| `cases_cta_desc` | LocalizedField | 案例 | CTA 描述 |
| `study_abroad_intro_title` | LocalizedField | 出国留学 | 介绍标题 |
| `study_abroad_intro_desc` | LocalizedField | 出国留学 | 介绍描述 |
| `study_abroad_cta_title` | LocalizedField | 出国留学 | CTA 标题 |
| `study_abroad_cta_desc` | LocalizedField | 出国留学 | CTA 描述 |
| `visa_cta_title` | LocalizedField | 签证 | CTA 标题 |
| `visa_cta_desc` | LocalizedField | 签证 | CTA 描述 |
| `requirements_cta_title` | LocalizedField | 申请条件 | CTA 标题 |
| `requirements_cta_desc` | LocalizedField | 申请条件 | CTA 描述 |
| `life_intro_title` | LocalizedField | 留学生活 | 介绍标题 |
| `life_intro_desc` | LocalizedField | 留学生活 | 介绍描述 |
| `life_cta_title` | LocalizedField | 留学生活 | CTA 标题 |
| `life_cta_desc` | LocalizedField | 留学生活 | CTA 描述 |

### 数组字段（可增减）

| 字段 key | 每项结构 | 页面 | 用途 |
|----------|---------|------|------|
| `about_office_images` | `{ image_id: string, caption: LocalizedField }` | 关于 | 办公环境图片墙 |
| `study_abroad_programs` | `{ name: LocalizedField, country: LocalizedField, desc: LocalizedField, features: LocalizedField[] }` | 出国留学 | 留学项目卡片 |
| `visa_process_steps` | `{ title: LocalizedField, desc: LocalizedField }` | 签证 | 签证流程 |
| `visa_required_docs` | `{ text: LocalizedField }` | 签证 | 所需材料 |
| `visa_timeline` | `{ title: LocalizedField, time: LocalizedField, desc: LocalizedField }` | 签证 | 办理周期 |
| `visa_tips` | `{ text: LocalizedField }` | 签证 | 注意事项 |
| `requirements_countries` | `{ country: LocalizedField, items: LocalizedField[] }` | 申请条件 | 各国条件 |
| `requirements_languages` | `{ language: LocalizedField, items: LocalizedField[] }` | 申请条件 | 语言要求 |
| `requirements_docs` | `{ text: LocalizedField }` | 申请条件 | 材料清单 |
| `requirements_steps` | `{ title: LocalizedField, desc: LocalizedField }` | 申请条件 | 申请流程 |
| `life_guide_cards` | `{ icon: string, title: LocalizedField, desc: LocalizedField }` | 留学生活 | 生活板块 |
| `life_city_cards` | `{ city: LocalizedField, country: LocalizedField, desc: LocalizedField, image_id: string }` | 留学生活 | 城市指南 |

## 各页面最终结构

### 首页

1. HomeBanner（✏ Banner 背景/品牌名/标语）——已有
2. StatsSection（✏ 统计数据）——已有
3. 公司简介（✏ `home_intro_title` + `home_intro_content`）——新增，用 PageIntroSection
4. FeaturedUniversities——已有（只读，在院校页管理）
5. FeaturedCases——已有（只读，在案例页管理）
6. NewsSection——已有（只读，在文章页管理）
7. CTA（✏ `home_cta_title` + `home_cta_desc`）——新增

去掉：ServicesSection（服务卡片）、AboutIntroSection

### 关于页

1. Banner（✏）——已有
2. ContactInfoSection（✏ 5 字段）——已有
3. 公司简介（✏ `aboutInfo.history`）——已有（HistorySection）
4. 使命愿景（✏ `aboutInfo.mission` + `aboutInfo.vision`）——已有（MissionVisionSection）
5. 办公环境（✏ `about_office_images` 图片墙）——新增 OfficeGallery
6. CTA（✏ `about_cta_title` + `about_cta_desc`）——新增

去掉：PartnershipSection、TeamSection、AboutStatsSection

### 院校页

1. Banner（✏）——已有
2. 页面介绍（✏ `universities_intro_title` + `universities_intro_desc`）——新增 PageIntroSection
3. 管理工具栏 + UniversityList（✏ CRUD）——已有
4. CTA（✏ `universities_cta_title` + `universities_cta_desc`）——新增

去掉：选校建议板块

### 案例页

1. Banner（✏）——已有
2. 页面介绍（✏ `cases_intro_title` + `cases_intro_desc`）——新增 PageIntroSection
3. 管理工具栏 + CaseGrid（✏ CRUD）——已有
4. CTA（✏ `cases_cta_title` + `cases_cta_desc`）——新增

去掉：统计条

### 出国留学

1. Banner（✏）——已有
2. 留学介绍（✏ `study_abroad_intro_title` + `study_abroad_intro_desc`）——新增 PageIntroSection
3. 留学项目卡片（✏ `study_abroad_programs` 数组）——新增 CardGridSection
4. 管理工具栏 + 文章列表（✏ CRUD）——已有
5. CTA（✏ `study_abroad_cta_title` + `study_abroad_cta_desc`）——新增

### 签证办理

1. Banner（✏）——已有
2. 签证流程（✏ `visa_process_steps` 数组）——新增 StepListSection
3. 所需材料（✏ `visa_required_docs` 数组）——新增 DocListSection
4. 办理周期（✏ `visa_timeline` 数组）——新增 CardGridSection
5. 注意事项（✏ `visa_tips` 数组）——新增 DocListSection
6. 管理工具栏 + 文章列表（✏ CRUD）——已有
7. CTA（✏ `visa_cta_title` + `visa_cta_desc`）——新增

### 申请条件

1. Banner（✏）——已有
2. 各国条件（✏ `requirements_countries` 数组）——新增 CountryRequirementsSection
3. 语言要求（✏ `requirements_languages` 数组）——新增 CountryRequirementsSection 复用
4. 材料清单（✏ `requirements_docs` 数组）——新增 DocListSection
5. 申请流程（✏ `requirements_steps` 数组）——新增 StepListSection
6. 管理工具栏 + 文章列表（✏ CRUD）——已有
7. CTA（✏ `requirements_cta_title` + `requirements_cta_desc`）——新增

### 留学生活

1. Banner（✏）——已有
2. 生活指南介绍（✏ `life_intro_title` + `life_intro_desc`）——新增 PageIntroSection
3. 生活板块卡片（✏ `life_guide_cards` 数组）——新增 CardGridSection
4. 城市指南卡片（✏ `life_city_cards` 数组）——新增 CardGridSection
5. 管理工具栏 + 文章列表（✏ CRUD）——已有
6. CTA（✏ `life_cta_title` + `life_cta_desc`）——新增

### 新闻页

1. Banner（✏）——已有
2. 文章列表 + 分类筛选（✏ CRUD）——已有

无 CTA，无介绍板块。

## 编辑交互

### 简单字段编辑

点击 EditableOverlay → 打开现有 `ConfigEditDialog`。和品牌名、标语用同一个弹窗。

在 `handleEditConfig` 中新增 case：

```
case 'home_intro_title': → fields: [{ key: 'home_intro_title', label: '简介标题', type: 'text', localized: true }]
case 'home_intro_content': → fields: [{ key: 'home_intro_content', label: '简介内容', type: 'textarea', localized: true }]
case 'home_cta': → fields: [
  { key: 'home_cta_title', label: 'CTA 标题', type: 'text', localized: true },
  { key: 'home_cta_desc', label: 'CTA 描述', type: 'text', localized: true },
]
```

### 数组字段编辑

新建 `ArrayEditDialog` 组件。交互设计：

- 打开时显示当前数组的所有条目
- 每条可展开编辑（内含多语言字段）
- 可拖动排序（`@hello-pangea/dnd`，已有依赖）
- 底部"添加"按钮
- 每条有删除按钮
- 保存时将整个数组写回对应的 `site_info` key

Props：
```tsx
interface ArrayEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  configKey: string          // site_info 中的 key
  fields: FieldDef[]         // 每条的字段定义
  initialData: any[]         // 当前值
  onSave: (key: string, data: any[]) => Promise<void>
}
```

### CTA 编辑

`CtaSection` 改造：接收 `pageKey` prop，从 `useLocalizedConfig()` 读 `siteInfo[${pageKey}_cta_title]`，fallback 到翻译值。

预览中 CTA 用 EditableOverlay 包裹，点击打开 ConfigEditDialog 编辑两个字段。

```tsx
export function CtaSection({ pageKey, variant }: CtaSectionProps) {
  const { siteInfo } = useLocalizedConfig()
  const t = useTranslations(NAMESPACE_MAP[pageKey])
  const title = siteInfo[`${pageKey}_cta_title`] || t("ctaTitle")
  const desc = siteInfo[`${pageKey}_cta_desc`] || t("ctaDesc")
  // ...
}
```

## 通用渲染组件

### PageIntroSection

通用页面介绍（标题+描述），从 config 读取，翻译 fallback。

```tsx
interface PageIntroSectionProps {
  titleKey: string       // site_info 中的 key
  contentKey: string     // site_info 中的 key
  titleFallback: string  // 翻译 fallback
  contentFallback: string
  editable?: boolean
  onEditTitle?: () => void
  onEditContent?: () => void
}
```

### StepListSection

渲染编号步骤列表（签证流程、申请流程复用）。

```tsx
interface StepListSectionProps {
  configKey: string          // site_info 中的数组 key
  sectionTag: string         // 英文标签如 "Process"
  sectionTitle: string       // 标题如 "签证流程"
  fallbackSteps: Step[]      // 翻译 fallback 数据
  editable?: boolean
  onEdit?: () => void        // 打开 ArrayEditDialog
}
```

### DocListSection

渲染文档/材料列表（签证材料、申请材料复用）。

```tsx
interface DocListSectionProps {
  configKey: string
  sectionTag: string
  sectionTitle: string
  fallbackDocs: string[]
  icon?: LucideIcon          // 默认 FileText
  editable?: boolean
  onEdit?: () => void
}
```

### CardGridSection

渲染卡片网格（留学项目、生活板块、城市指南、办理周期复用）。

```tsx
interface CardGridSectionProps {
  configKey: string
  sectionTag: string
  sectionTitle: string
  fallbackCards: Card[]
  renderCard: (card: Card, index: number) => ReactNode  // 自定义卡片渲染
  editable?: boolean
  onEdit?: () => void
}
```

### CountryRequirementsSection

渲染带子列表的条件卡片（各国条件、语言要求复用）。

```tsx
interface CountryRequirementsSectionProps {
  configKey: string
  sectionTag: string
  sectionTitle: string
  fallbackData: CountryReq[]
  editable?: boolean
  onEdit?: () => void
}
```

### OfficeGallery

关于页办公环境图片墙。editable 模式下可上传/删除图片。

```tsx
interface OfficeGalleryProps {
  editable?: boolean
  onEdit?: () => void  // 打开图片管理弹窗
}
```

## 需要删除的组件

| 组件 | 原因 |
|------|------|
| ServicesSection | 首页去掉服务卡片 |
| AboutIntroSection | 改用 PageIntroSection |
| TeamSection | 关于页去掉团队 |
| PartnershipSection | 关于页去掉合作 |
| AboutStatsSection | 关于页去掉统计（与首页重复） |
| StudyAbroadIntro | 改为 config 驱动的通用组件 |
| VisaIntro | 同上 |
| RequirementsIntro | 同上 |
| LifeIntro | 同上 |
| SectionTitle | 不再需要（services_title 字段删除） |

## 种子数据

`seed_config.py` 中为所有新字段提供默认值，内容从当前翻译文件迁移。确保新建数据库时有完整的初始数据。

## 不变的部分

- 后端 API 不改（site_info 是 JSON 字段，自动保存/返回新字段）
- ConfigContext 的 `refreshConfig()` 机制不变
- EditableOverlay 组件不变
- ConfigEditDialog 组件不变
- PreviewContainer 交互拦截不变
- HomeBanner、StatsSection、ContactInfoSection、HistorySection、MissionVisionSection 不变
- 所有 CRUD 管理（院校/案例/文章/学科）不变
