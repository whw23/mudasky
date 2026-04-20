# 网页设置字段级编辑改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将网页设置页面的编辑模式从"区域级"改为"字段级"，每个数据字段独立 EditableOverlay + 独立编辑弹窗，统一铅笔+虚线框交互模式。

**Architecture:** 纯前端改造。拆分现有大区域 EditableOverlay 为字段级，重构 `page.tsx` 的 handler 从 section 级到 field 级。ConfigEditDialog 新增 `defaultValues` 支持。翻译文件更新"办公时间"→"注册地址"。

**Tech Stack:** Next.js, React, TypeScript, shadcn/ui, Tailwind CSS, next-intl

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/messages/zh.json` | Modify | 更新 Contact 命名空间 hoursLabel/hours → registeredAddressLabel/registeredAddress |
| `frontend/messages/en.json` | Modify | 同上（英文） |
| `frontend/messages/ja.json` | Modify | 同上（日文） |
| `frontend/messages/de.json` | Modify | 同上（德文） |
| `frontend/components/admin/ConfigEditDialog.tsx` | Modify | 新增 defaultValues prop，打开时自动填充空的多语言中文栏 |
| `frontend/components/about/ContactInfoSection.tsx` | Modify | 每个联系项独立 EditableOverlay，"办公时间"→"注册地址"，Clock→Building |
| `frontend/components/about/AboutContent.tsx` | Modify | MissionVisionSection 拆为 onEditMission + onEditVision 两个独立回调 |
| `frontend/components/admin/web-settings/PagePreview.tsx` | Modify | HomePreview 移除绿色按钮，Banner 内嵌字段级 EditableOverlay，services/destinations 独立 |
| `frontend/components/layout/Footer.tsx` | Modify | 拆分 contact 大框为 phone/email/brand 各自独立 EditableOverlay |
| `frontend/components/layout/Header.tsx` | Modify | 调整 EditableOverlay 包裹范围（已基本符合，微调） |
| `frontend/app/[locale]/[panel]/web-settings/page.tsx` | Modify | 重构所有 handler 为字段级，传 defaultValues |

---

### Task 1: 翻译文件更新 — "办公时间" → "注册地址"

**Files:**
- Modify: `frontend/messages/zh.json:905-906`
- Modify: `frontend/messages/en.json:905-906`
- Modify: `frontend/messages/ja.json:886-887`
- Modify: `frontend/messages/de.json:885-886`

- [ ] **Step 1: 更新 zh.json**

将 Contact 命名空间中的 `hoursLabel` 和 `hours` 改为注册地址：

```json
"hoursLabel": "办公时间",
"hours": "周一至周五 9:00-18:00 / 周六 9:00-12:00",
```

改为：

```json
"registeredAddressLabel": "注册地址",
"registeredAddress": "中国(江苏)自由贸易试验区苏州片区苏州工业园区苏州大道东398号太平金融大厦5层5112室",
```

- [ ] **Step 2: 更新 en.json**

```json
"hoursLabel": "Office Hours",
"hours": "Mon-Fri 9:00-18:00 / Sat 9:00-12:00",
```

改为：

```json
"registeredAddressLabel": "Registered Address",
"registeredAddress": "Room 5112, 5th Floor, Taiping Financial Building, No. 398 Suzhou Avenue East, Suzhou Industrial Park, China (Jiangsu) Pilot Free Trade Zone",
```

- [ ] **Step 3: 更新 ja.json**

```json
"hoursLabel": "営業時間",
"hours": "月〜金 9:00-18:00 / 土 9:00-12:00",
```

改为：

```json
"registeredAddressLabel": "登記住所",
"registeredAddress": "中国(江蘇)自由貿易試験区蘇州エリア蘇州工業園区蘇州大道東398号太平金融ビル5階5112室",
```

- [ ] **Step 4: 更新 de.json**

```json
"hoursLabel": "Öffnungszeiten",
"hours": "Mo-Fr 9:00-18:00 / Sa 9:00-12:00",
```

改为：

```json
"registeredAddressLabel": "Registrierte Adresse",
"registeredAddress": "Zimmer 5112, 5. Stock, Taiping Financial Building, Nr. 398 Suzhou Avenue East, Suzhou Industrial Park, China (Jiangsu) Pilot-Freihandelszone",
```

- [ ] **Step 5: Commit**

```bash
git add frontend/messages/zh.json frontend/messages/en.json frontend/messages/ja.json frontend/messages/de.json
git commit -m "refactor: 翻译文件 办公时间→注册地址"
```

---

### Task 2: ConfigEditDialog 新增 defaultValues 支持

**Files:**
- Modify: `frontend/components/admin/ConfigEditDialog.tsx`

- [ ] **Step 1: 新增 defaultValues prop**

在 `ConfigEditDialogProps` 接口中新增：

```typescript
interface ConfigEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  fields: FieldDefinition[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (data: Record<string, any>) => Promise<void>
  defaultValues?: Record<string, string>
}
```

在组件参数解构中加入 `defaultValues`：

```typescript
export function ConfigEditDialog({
  open,
  onOpenChange,
  title,
  fields,
  data,
  onSave,
  defaultValues,
}: ConfigEditDialogProps) {
```

- [ ] **Step 2: 在 useEffect 中应用默认值填充**

修改打开弹窗时的 `useEffect`，当多语言字段的中文值为空时，从 `defaultValues` 填入：

```typescript
useEffect(() => {
  if (open) {
    const merged = { ...data }
    if (defaultValues) {
      for (const field of fields) {
        if (field.localized && defaultValues[field.key]) {
          const val = merged[field.key]
          const zhValue = typeof val === "string" ? val : val?.zh
          if (!zhValue?.trim()) {
            merged[field.key] = typeof val === "object" && val !== null
              ? { ...val, zh: defaultValues[field.key] }
              : { zh: defaultValues[field.key], en: "", ja: "", de: "" }
          }
        }
      }
    }
    setFormData(merged)
  }
}, [open, data, defaultValues, fields])
```

- [ ] **Step 3: 验证构建通过**

Run: `pnpm --prefix frontend build 2>&1 | tail -5`
Expected: 构建成功，无类型错误

- [ ] **Step 4: Commit**

```bash
git add frontend/components/admin/ConfigEditDialog.tsx
git commit -m "feat: ConfigEditDialog 支持 defaultValues 自动填充"
```

---

### Task 3: ContactInfoSection 字段级 EditableOverlay

**Files:**
- Modify: `frontend/components/about/ContactInfoSection.tsx`

- [ ] **Step 1: 更新 import 和 props 接口**

```typescript
"use client"

import { MapPin, Phone, Mail, MessageCircle, Building } from "lucide-react"
import { useTranslations } from "next-intl"
import { useLocalizedConfig } from "@/contexts/ConfigContext"
import { EditableOverlay } from "@/components/admin/EditableOverlay"

interface ContactInfoSectionProps {
  editable?: boolean
  onEditField?: (field: string) => void
}
```

- [ ] **Step 2: 重写组件，每个联系项独立 EditableOverlay**

```typescript
export function ContactInfoSection({ editable, onEditField }: ContactInfoSectionProps) {
  const t = useTranslations("Contact")
  const { contactInfo } = useLocalizedConfig()

  const items = [
    {
      icon: MapPin,
      label: t("addressLabel"),
      value: contactInfo.address || t("address"),
      field: "address",
    },
    {
      icon: Phone,
      label: t("phoneLabel"),
      value: contactInfo.phone || t("phone"),
      field: "phone",
    },
    {
      icon: Mail,
      label: t("emailLabel"),
      value: contactInfo.email || t("email"),
      field: "email",
    },
    {
      icon: MessageCircle,
      label: t("wechatLabel"),
      value: contactInfo.wechat || t("wechat"),
      field: "wechat",
    },
    {
      icon: Building,
      label: t("registeredAddressLabel"),
      value: contactInfo.registered_address || t("registeredAddress"),
      field: "registered_address",
    },
  ]

  return (
    <section id="contact-info" className="bg-gray-50 py-10 md:py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-8 text-center text-2xl font-bold">
          {t("infoTitle")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const content = (
              <div className="flex items-start gap-3 rounded-lg bg-white p-5">
                <item.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm text-foreground">{item.value}</div>
                </div>
              </div>
            )

            if (editable) {
              return (
                <EditableOverlay
                  key={item.field}
                  onClick={() => onEditField?.(item.field)}
                  label={`编辑${item.label}`}
                >
                  {content}
                </EditableOverlay>
              )
            }

            return <div key={item.field}>{content}</div>
          })}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: 验证构建通过**

Run: `pnpm --prefix frontend build 2>&1 | tail -5`
Expected: 构建成功（可能有 PagePreview 中旧调用方式的 warning，Task 7 会修复）

- [ ] **Step 4: Commit**

```bash
git add frontend/components/about/ContactInfoSection.tsx
git commit -m "refactor: ContactInfoSection 字段级 EditableOverlay + 办公时间→注册地址"
```

---

### Task 4: AboutContent MissionVisionSection 拆分

**Files:**
- Modify: `frontend/components/about/AboutContent.tsx`

- [ ] **Step 1: 修改 MissionVisionSection 接口和实现**

将 `EditableProps` 接口中的 `onEdit` 拆为两个独立回调：

```typescript
interface MissionVisionProps {
  editable?: boolean
  onEditMission?: () => void
  onEditVision?: () => void
}

export function MissionVisionSection({ editable, onEditMission, onEditVision }: MissionVisionProps) {
  const t = useTranslations('About')
  const { aboutInfo } = useLocalizedConfig()

  const missionContent = (
    <div className="rounded-lg border bg-white p-8">
      <Award className="h-10 w-10 text-primary" />
      <h3 className="mt-4 text-xl font-bold">{t('missionTitle')}</h3>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {aboutInfo.mission || t('missionContent')}
      </p>
    </div>
  )

  const visionContent = (
    <div className="rounded-lg border bg-white p-8">
      <Globe className="h-10 w-10 text-primary" />
      <h3 className="mt-4 text-xl font-bold">{t('visionTitle')}</h3>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {aboutInfo.vision || t('visionContent')}
      </p>
    </div>
  )

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {editable ? (
        <EditableOverlay onClick={() => onEditMission?.()} label="编辑使命">
          {missionContent}
        </EditableOverlay>
      ) : missionContent}
      {editable ? (
        <EditableOverlay onClick={() => onEditVision?.()} label="编辑愿景">
          {visionContent}
        </EditableOverlay>
      ) : visionContent}
    </div>
  )
}
```

- [ ] **Step 2: 验证构建通过**

Run: `pnpm --prefix frontend build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add frontend/components/about/AboutContent.tsx
git commit -m "refactor: MissionVisionSection 拆分为独立 mission/vision 编辑回调"
```

---

### Task 5: Footer 字段级 EditableOverlay

**Files:**
- Modify: `frontend/components/layout/Footer.tsx`

- [ ] **Step 1: 修改 onEdit 回调的调用方式**

将 Footer 中现有的大区域 EditableOverlay 拆分为字段级。替换第一栏（品牌简介+联系方式）的 `wrapEditable` 包裹：

当前代码（第 57-78 行）将整个第一栏包裹在 `wrapEditable(..., "contact", "编辑联系方式")` 中。拆分为：

```typescript
{/* 栏 1：品牌简介 + 联系方式 */}
<div className="sm:col-span-2 lg:col-span-1">
  {wrapEditable(
    <h3 className="mb-3 text-lg font-bold tracking-wide text-foreground">
      {siteInfo.brand_name || t("brandName")}
    </h3>,
    "brand_name",
    "编辑品牌名称"
  )}
  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
    {t("description")}
  </p>
  <ul className="space-y-2 text-sm text-muted-foreground">
    <li className="flex items-center gap-2">
      <Phone className="size-4 shrink-0 text-primary" />
      {wrapEditable(
        <span>{contactInfo.phone || t("phone")}</span>,
        "phone",
        "编辑电话",
        true
      )}
    </li>
    <li className="flex items-center gap-2">
      <Mail className="size-4 shrink-0 text-primary" />
      {wrapEditable(
        <span>{contactInfo.email || t("email")}</span>,
        "email",
        "编辑邮箱",
        true
      )}
    </li>
  </ul>
</div>
```

- [ ] **Step 2: 验证构建通过**

Run: `pnpm --prefix frontend build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add frontend/components/layout/Footer.tsx
git commit -m "refactor: Footer 字段级 EditableOverlay（品牌名/电话/邮箱独立）"
```

---

### Task 6: Header EditableOverlay 微调

**Files:**
- Modify: `frontend/components/layout/Header.tsx`

- [ ] **Step 1: 确认 Header 现有包裹范围**

Header 现有的 3 个 EditableOverlay 已基本符合字段级要求：
- `brand`：包裹 Logo + 品牌名中文 + 英文（同一 brand_name LocalizedField + logo_url）✓
- `tagline`：包裹标语文字 ✓
- `hotline`：包裹热线号码 + 联系人 ✓

无需大改。唯一需确认的是 `onEdit` 回调中 section 名称与 `page.tsx` 新 handler 的对接（在 Task 8 统一处理）。

- [ ] **Step 2: 标记完成，无代码改动**

Header 组件已符合字段级要求，不需要修改。

---

### Task 7: PagePreview 字段级改造

**Files:**
- Modify: `frontend/components/admin/web-settings/PagePreview.tsx`

- [ ] **Step 1: 更新 HomePreview — 移除绿色按钮，Banner 区域叠加字段级 overlay**

Banner 组件内部会渲染 `【{title}】`，不能传空字符串。正确方案：Banner 正常渲染标题/副标题，外层 EditableOverlay 包裹整个 Banner（编辑背景），然后用绝对定位的 EditableOverlay 叠加在标题和副标题文字上方。

替换 HomePreview 函数中的 Banner 区域（当前第 66-83 行）：

```typescript
function HomePreview({ onEditConfig, onBannerEdit }: { onEditConfig: (s: string) => void; onBannerEdit: (k: string) => void }) {
  const t = useTranslations("Home")

  const services = [
    { icon: "🎓", title: t("service.studyAbroad"), desc: t("service.studyAbroadDesc") },
    { icon: "🌍", title: t("service.universities"), desc: t("service.universitiesDesc") },
    { icon: "📋", title: t("service.visa"), desc: t("service.visaDesc") },
    { icon: "👥", title: t("service.cases"), desc: t("service.casesDesc") },
  ]

  const countries = [
    { key: "germany", name: t("germany") },
    { key: "japan", name: t("japan") },
    { key: "singapore", name: t("singapore") },
  ]

  return (
    <>
      {/* Banner 区域：背景编辑包裹整个 Banner，标题/副标题各自叠加独立 overlay */}
      <div className="relative">
        <EditableOverlay onClick={() => onBannerEdit("home")} label="编辑 Banner 背景">
          <Banner title={t("heroTitle")} subtitle={t("heroSubtitle")} large />
        </EditableOverlay>
        {/* 标题 overlay — 绝对定位叠加在 Banner 标题文字上方 */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
          <EditableOverlay onClick={() => onEditConfig("hero_title")} label="编辑标题" inline>
            <span className="pointer-events-auto text-3xl md:text-4xl font-bold tracking-widest text-transparent select-none">
              【{t("heroTitle")}】
            </span>
          </EditableOverlay>
          <EditableOverlay onClick={() => onEditConfig("hero_subtitle")} label="编辑副标题" inline>
            <span className="pointer-events-auto text-xs md:text-sm tracking-[0.3em] text-transparent select-none">
              {t("heroSubtitle")}
            </span>
          </EditableOverlay>
        </div>
      </div>

      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <StatsSection />
      </EditableOverlay>

      {/* 服务区域 — 标题独立编辑 */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              {t("servicesTag")}
            </h2>
            <EditableOverlay onClick={() => onEditConfig("services_title")} label="编辑服务标题" inline>
              <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("servicesTitle")}</h3>
            </EditableOverlay>
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <div key={s.title} className="rounded-lg border bg-white p-6 shadow-sm">
                <span className="text-3xl">{s.icon}</span>
                <h4 className="mt-4 text-lg font-bold">{s.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 热门留学国家 — 标题独立编辑 */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t("destinationsTag")}
          </h2>
          <EditableOverlay onClick={() => onEditConfig("destinations_title")} label="编辑留学国家标题" inline>
            <h3 className="mt-2 text-2xl md:text-3xl font-bold">{t("destinationsTitle")}</h3>
          </EditableOverlay>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-8 md:mt-12 grid gap-4 md:gap-6 md:grid-cols-3">
          {countries.map((c) => (
            <div key={c.key} className="group relative overflow-hidden rounded-lg" style={{ backgroundImage: "linear-gradient(135deg, #374151 0%, #1f2937 100%)" }}>
              <div className="flex h-48 items-center justify-center">
                <div className="text-center text-white">
                  <h4 className="text-2xl font-bold">{c.name}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <NewsPreview />
    </>
  )
}
```

注意：Banner 组件需要检查是否支持 `children` prop。如果不支持，则在 Banner 外层叠加文字 overlay，使用 absolute 定位。

- [ ] **Step 2: 更新 AboutPreview — ContactInfoSection 和 MissionVisionSection 新接口**

```typescript
function AboutPreview({ onEditConfig, onBannerEdit }: { onEditConfig: (s: string) => void; onBannerEdit: (k: string) => void }) {
  const t = useTranslations("Pages")
  return (
    <>
      <EditableOverlay onClick={() => onBannerEdit("about")} label="编辑 Banner">
        <Banner title={t("about")} subtitle={t("aboutSubtitle")} />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("about_history")} label="编辑历史">
        <HistorySection />
      </EditableOverlay>
      <MissionVisionSection
        editable
        onEditMission={() => onEditConfig("about_mission")}
        onEditVision={() => onEditConfig("about_vision")}
      />
      <EditableOverlay onClick={() => onEditConfig("about_partnership")} label="编辑合作">
        <PartnershipSection />
      </EditableOverlay>
      <EditableOverlay onClick={() => onEditConfig("stats")} label="编辑统计">
        <AboutStatsSection />
      </EditableOverlay>
      <ContactInfoSection
        editable
        onEditField={(field) => onEditConfig(`contact_${field}`)}
      />
    </>
  )
}
```

- [ ] **Step 3: 验证构建通过**

Run: `pnpm --prefix frontend build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add frontend/components/admin/web-settings/PagePreview.tsx
git commit -m "refactor: PagePreview 字段级 EditableOverlay（Banner/services/destinations/contact/mission-vision）"
```

---

### Task 8: page.tsx 重构 handler 为字段级

**Files:**
- Modify: `frontend/app/[locale]/[panel]/web-settings/page.tsx`

这是最核心的改造。将 `handleEditConfig`、`handleHeaderEdit`、`handleFooterEdit` 从 section 级重构为字段级。

- [ ] **Step 1: 定义默认值常量**

在文件顶部（STAT_FIELDS 之前）添加翻译 key 到默认值的映射。使用 `useTranslations` 在组件内获取：

```typescript
/** 各 configKey 的翻译命名空间和字段映射 */
const CONTACT_DEFAULTS_KEYS: Record<string, { ns: string; key: string }> = {
  address: { ns: "Contact", key: "address" },
  phone: { ns: "Contact", key: "phone" },
  email: { ns: "Contact", key: "email" },
  wechat: { ns: "Contact", key: "wechat" },
  registered_address: { ns: "Contact", key: "registeredAddress" },
}
```

- [ ] **Step 2: 在组件内获取翻译默认值**

在 `WebSettingsPage` 组件内添加翻译 hooks：

```typescript
const tHeader = useTranslations("Header")
const tHome = useTranslations("Home")
const tContact = useTranslations("Contact")
const tAbout = useTranslations("About")
```

- [ ] **Step 3: 重写 handleHeaderEdit**

```typescript
function handleHeaderEdit(section: string): void {
  switch (section) {
    case 'brand':
      setDialogState({
        open: true,
        title: '编辑品牌',
        fields: [
          { key: 'brand_name', label: '品牌名称', type: 'text' as const, localized: true },
          { key: 'logo_url', label: 'Logo', type: 'image' as const, localized: false },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
        defaultValues: { brand_name: tHeader("brandName") },
      })
      break
    case 'tagline':
      setDialogState({
        open: true,
        title: '编辑标语',
        fields: [
          { key: 'tagline', label: '品牌标语', type: 'text' as const, localized: true },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
        defaultValues: { tagline: tHeader("tagline") },
      })
      break
    case 'hotline':
      setDialogState({
        open: true,
        title: '编辑热线',
        fields: [
          { key: 'hotline', label: '服务热线', type: 'text' as const, localized: false },
          { key: 'hotline_contact', label: '热线联系人', type: 'text' as const, localized: true },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
      })
      break
    default:
      break
  }
}
```

- [ ] **Step 4: 重写 handleFooterEdit — 字段级**

```typescript
function handleFooterEdit(section: string): void {
  switch (section) {
    case 'brand_name':
      setDialogState({
        open: true,
        title: '编辑品牌名称',
        fields: [
          { key: 'brand_name', label: '品牌名称', type: 'text' as const, localized: true },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
        defaultValues: { brand_name: tHeader("brandName") },
      })
      break
    case 'phone':
      setDialogState({
        open: true,
        title: '编辑电话',
        fields: [
          { key: 'phone', label: '电话', type: 'text' as const, localized: false },
        ],
        configKey: 'contact_info',
        data: rawConfig.contactInfo,
        defaultValues: { phone: tContact("phone") },
      })
      break
    case 'email':
      setDialogState({
        open: true,
        title: '编辑邮箱',
        fields: [
          { key: 'email', label: '邮箱', type: 'text' as const, localized: false },
        ],
        configKey: 'contact_info',
        data: rawConfig.contactInfo,
        defaultValues: { email: tContact("email") },
      })
      break
    case 'wechat_qr':
      setDialogState({
        open: true,
        title: '编辑微信二维码',
        fields: [
          { key: 'wechat_qr_url', label: '微信二维码', type: 'image' as const, localized: false },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
      })
      break
    case 'company':
      setDialogState({
        open: true,
        title: '编辑公司名称',
        fields: [
          { key: 'company_name', label: '公司名称', type: 'text' as const, localized: false },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
      })
      break
    case 'icp':
      setDialogState({
        open: true,
        title: '编辑 ICP 备案',
        fields: [
          { key: 'icp_filing', label: 'ICP备案号', type: 'text' as const, localized: false },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
      })
      break
    default:
      break
  }
}
```

- [ ] **Step 5: 重写 handleEditConfig — 字段级**

```typescript
function handleEditConfig(section: string): void {
  switch (section) {
    case 'hero_title':
      setDialogState({
        open: true,
        title: '编辑 Banner 标题',
        fields: [
          { key: 'hero_title', label: '标题', type: 'text' as const, localized: true },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
        defaultValues: { hero_title: tHome("heroTitle") },
      })
      break
    case 'hero_subtitle':
      setDialogState({
        open: true,
        title: '编辑 Banner 副标题',
        fields: [
          { key: 'hero_subtitle', label: '副标题', type: 'text' as const, localized: true },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
        defaultValues: { hero_subtitle: tHome("heroSubtitle") },
      })
      break
    case 'stats':
      setDialogState({
        open: true,
        title: '编辑统计数据',
        fields: STAT_FIELDS,
        configKey: 'homepage_stats',
        data: rawConfig.homepageStats[0] ?? { value: '', label: '' },
      })
      break
    case 'services_title':
      setDialogState({
        open: true,
        title: '编辑服务标题',
        fields: [
          { key: 'services_title', label: '服务标题', type: 'text' as const, localized: true },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
        defaultValues: { services_title: tHome("servicesTitle") },
      })
      break
    case 'destinations_title':
      setDialogState({
        open: true,
        title: '编辑热门留学国家标题',
        fields: [
          { key: 'destinations_title', label: '板块标题', type: 'text' as const, localized: true },
        ],
        configKey: 'site_info',
        data: rawConfig.siteInfo,
        defaultValues: { destinations_title: tHome("destinationsTitle") },
      })
      break
    case 'about_history':
      setDialogState({
        open: true,
        title: '编辑公司历史',
        fields: [
          { key: 'history', label: '公司历史', type: 'textarea' as const, localized: true, rows: 5 },
        ],
        configKey: 'about_info',
        data: rawConfig.aboutInfo,
        defaultValues: { history: tAbout("historyContent") },
      })
      break
    case 'about_mission':
      setDialogState({
        open: true,
        title: '编辑使命',
        fields: [
          { key: 'mission', label: '使命', type: 'textarea' as const, localized: true, rows: 5 },
        ],
        configKey: 'about_info',
        data: rawConfig.aboutInfo,
        defaultValues: { mission: tAbout("missionContent") },
      })
      break
    case 'about_vision':
      setDialogState({
        open: true,
        title: '编辑愿景',
        fields: [
          { key: 'vision', label: '愿景', type: 'textarea' as const, localized: true, rows: 5 },
        ],
        configKey: 'about_info',
        data: rawConfig.aboutInfo,
        defaultValues: { vision: tAbout("visionContent") },
      })
      break
    case 'about_partnership':
      setDialogState({
        open: true,
        title: '编辑合作介绍',
        fields: [
          { key: 'partnership', label: '合作介绍', type: 'textarea' as const, localized: true, rows: 5 },
        ],
        configKey: 'about_info',
        data: rawConfig.aboutInfo,
        defaultValues: { partnership: tAbout("partnershipContent") },
      })
      break
    // contact_* 前缀处理联系信息各字段
    default:
      if (section.startsWith('contact_')) {
        const field = section.replace('contact_', '')
        const fieldDefs: Record<string, { label: string; localized: boolean }> = {
          address: { label: '办公地址', localized: true },
          phone: { label: '咨询热线', localized: false },
          email: { label: '电子邮箱', localized: false },
          wechat: { label: '微信咨询', localized: false },
          registered_address: { label: '注册地址', localized: true },
        }
        const def = fieldDefs[field]
        if (def) {
          const defaultKey = CONTACT_DEFAULTS_KEYS[field]
          setDialogState({
            open: true,
            title: `编辑${def.label}`,
            fields: [
              { key: field, label: def.label, type: 'text' as const, localized: def.localized },
            ],
            configKey: 'contact_info',
            data: rawConfig.contactInfo,
            defaultValues: defaultKey ? { [field]: tContact(defaultKey.key) } : undefined,
          })
        }
      }
      break
  }
}
```

- [ ] **Step 6: 更新 DialogState 类型，加入 defaultValues**

```typescript
interface DialogState {
  open: boolean
  title: string
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'textarea' | 'image'
    localized: boolean
    rows?: number
  }>
  configKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customSave?: (data: Record<string, any>) => Promise<void>
  defaultValues?: Record<string, string>
}
```

- [ ] **Step 7: 传 defaultValues 到 ConfigEditDialog**

在 JSX 中更新 ConfigEditDialog 调用：

```typescript
{dialogState && (
  <ConfigEditDialog
    open={dialogState.open}
    onOpenChange={(open) => { if (!open) setDialogState(null) }}
    title={dialogState.title}
    fields={dialogState.fields}
    data={dialogState.data}
    onSave={handleSave}
    defaultValues={dialogState.defaultValues}
  />
)}
```

- [ ] **Step 8: 删除不再需要的常量和函数**

- 删除 `HERO_FIELDS` 常量（hero_title 和 hero_subtitle 已在 handleEditConfig 内各自定义）
- 删除 `SERVICES_FIELDS` 常量（services_title 已在 handleEditConfig 内定义）
- 删除 `openAboutDialog` 函数（about_history/mission/vision/partnership 已在 handleEditConfig 内各自处理）
- `STAT_FIELDS` 保留（仍在 stats case 中使用）

- [ ] **Step 9: 验证构建通过**

Run: `pnpm --prefix frontend build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 10: Commit**

```bash
git add frontend/app/[locale]/[panel]/web-settings/page.tsx
git commit -m "refactor: page.tsx handler 重构为字段级 + defaultValues 支持"
```

---

### Task 9: 端到端验证

**Files:** 无新增/修改

- [ ] **Step 1: 启动开发环境**

Run: `./scripts/dev.sh start`

- [ ] **Step 2: 浏览器验证 — 首页预览**

导航到 `http://localhost/zh/admin/web-settings`，验证：
1. Banner 区域无绿色"编辑文字"按钮
2. Banner 标题和副标题各有独立铅笔+虚线框（hover 显示）
3. 服务标题有独立铅笔图标
4. 热门留学国家标题有独立铅笔图标
5. 点击各铅笔图标弹出只含对应字段的编辑弹窗
6. 多语言字段弹窗中文栏预填默认值

- [ ] **Step 3: 浏览器验证 — 关于页预览**

切换到"关于我们" tab，验证：
1. 使命和愿景各有独立铅笔图标（不再合并）
2. 联系信息 5 个字段各有独立铅笔图标
3. "办公时间"已改为"注册地址"，图标为 Building
4. 点击任意联系字段弹出只含该字段的编辑弹窗

- [ ] **Step 4: 浏览器验证 — Footer**

验证 Footer 区域：
1. 品牌名有独立铅笔图标
2. 电话和邮箱各有独立铅笔图标
3. 微信二维码、公司名称、ICP 各有独立铅笔图标

- [ ] **Step 5: 浏览器验证 — Header**

验证 Header 区域：
1. 品牌（Logo+中英文名）有铅笔图标
2. 标语有独立铅笔图标
3. 热线有铅笔图标

- [ ] **Step 6: 浏览器验证 — 数据同步**

1. 在 Footer 中编辑电话号码并保存
2. 切换到"关于我们"页，验证联系信息中的电话同步更新
3. 在 Header 中编辑品牌名称并保存
4. 验证 Footer 中的品牌名同步更新

- [ ] **Step 7: 浏览器验证 — 默认值填充**

1. 找一个未编辑过的多语言字段（如 hero_title）
2. 点击铅笔图标打开弹窗
3. 验证中文栏已预填默认值（如"慕大国际教育"）
4. 英/日/德栏为空，placeholder 显示"（可选）"
