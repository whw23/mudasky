# 导航栏 Tab 改名功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为导航栏每个 tab（预设项 + 自定义项）增加改名功能，改名后导航栏显示名称和页面 Banner 标题自动同步。

**Architecture:** `NavConfig` 增加 `item_names` 字段存储名称覆盖。`Header.tsx` 和 `PageBanner.tsx` 优先读取 `item_names`。NavEditor 增加铅笔图标打开改名弹窗。后端提供统一的 `rename-item` 接口处理预设项和自定义项的改名。

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy, React, TypeScript, Next.js App Router, Vitest, pytest

---

## 文件结构

### 后端修改

| 文件 | 职责 |
|------|------|
| `backend/api/api/admin/config/web_settings/nav/schemas.py` | `NavConfig` 增加 `item_names`；新增 `NavRenameItemRequest` |
| `backend/api/api/admin/config/web_settings/nav/service.py` | 新增 `rename_item()` 方法 |
| `backend/api/api/admin/config/web_settings/nav/router.py` | 新增 `POST /rename-item` 端点 |

### 后端测试

| 文件 | 职责 |
|------|------|
| `backend/api/tests/admin/config/web_settings/nav/test_service.py` | `rename_item` 单元测试 |
| `backend/api/tests/admin/config/web_settings/nav/test_router.py` | `rename-item` 接口测试 |

### 前端修改

| 文件 | 职责 |
|------|------|
| `frontend/contexts/ConfigContext.tsx` | `NavConfig` 类型增加 `item_names`；`DEFAULT_NAV_CONFIG` 增加 `item_names: {}` |
| `frontend/components/layout/Header.tsx` | `navItems` 生成逻辑优先查 `item_names` |
| `frontend/components/layout/PageBanner.tsx` | 根据 `pageKey` 查 `item_names` 覆盖标题 |
| `frontend/components/admin/web-settings/RenameNavItemDialog.tsx` | **新建**改名弹窗组件 |
| `frontend/components/admin/web-settings/NavEditor.tsx` | 增加铅笔图标按钮、集成 RenameNavItemDialog |

### 前端测试

| 文件 | 职责 |
|------|------|
| `frontend/tests/components/admin/NavEditor.test.tsx` | 增加铅笔按钮、改名弹窗相关测试 |

---

## Task 1: 后端 Schema — NavConfig 增加 item_names

**Files:**
- Modify: `backend/api/api/admin/config/web_settings/nav/schemas.py`

- [ ] **Step 1: 修改 NavConfig 增加 item_names，新增 NavRenameItemRequest**

在 `schemas.py` 中，`NavConfig` 增加 `item_names` 字段；文件末尾新增 `NavRenameItemRequest`：

```python
class NavConfig(BaseModel):
    """导航栏配置。"""

    order: list[str]
    custom_items: list[NavCustomItem] = []
    item_names: dict[str, str | dict] = {}     # 新增


class NavRenameItemRequest(BaseModel):
    """重命名导航项请求。"""

    slug: str
    name: str | dict
```

- [ ] **Step 2: 验证修改无语法错误**

Run: `cd /home/whw23/code/mudasky/backend/api && python -c "from api.admin.config.web_settings.nav.schemas import NavConfig, NavRenameItemRequest; print('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/api/api/admin/config/web_settings/nav/schemas.py
git commit -m "feat: NavConfig 增加 item_names，新增 NavRenameItemRequest"
```

---

## Task 2: 后端 Service — rename_item 方法

**Files:**
- Modify: `backend/api/api/admin/config/web_settings/nav/service.py`

- [ ] **Step 1: 写 Service 单元测试（先写测试）**

在 `test_service.py` 末尾、commit 之前添加以下内容（测试文件会在 Task 4 中完整写入，此处先在 service.py 同级临时验证思路）：

```python
# ---- rename_item ----

@pytest.mark.asyncio
@patch(REPO)
async def test_rename_item_builtin(mock_repo, service):
    """重命名预设导航项成功（写入 item_names）。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)
    mock_repo.create = AsyncMock()

    result = await service.rename_item("visa", {"zh": "签证攻略"})

    assert result.item_names["visa"] == {"zh": "签证攻略"}


@pytest.mark.asyncio
@patch(REPO)
async def test_rename_item_custom(mock_repo, service):
    """重命名自定义导航项成功（更新 custom_items.name）。"""
    nav = _nav_with_custom()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(nav.model_dump())
    )
    mock_repo.update_value = AsyncMock()

    result = await service.rename_item("custom-1", {"zh": "新版自定义页"})

    item = next(i for i in result.custom_items if i.slug == "custom-1")
    assert item.name == {"zh": "新版自定义页"}


@pytest.mark.asyncio
@patch(REPO)
async def test_rename_item_invalid_slug(mock_repo, service):
    """重命名不存在的导航项抛出 BadRequestException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(BadRequestException) as exc_info:
        await service.rename_item("nonexistent", "不存在")

    assert exc_info.value.code == "INVALID_NAV_KEY"
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/admin/config/web_settings/nav/test_service.py -v -k "rename_item"`

Expected: 3 FAILED — `AttributeError: 'NavService' object has no attribute 'rename_item'`

- [ ] **Step 3: 实现 rename_item 方法**

在 `service.py` 中 `remove_item` 方法之后、`_save` 方法之前插入：

```python
    async def rename_item(
        self,
        slug: str,
        name: str | dict,
    ) -> NavConfig:
        """重命名导航项。

        预设项：写入 item_names 覆盖。
        自定义项：更新 custom_items 中的 name。
        """
        nav = await self.get_nav_config()
        custom_slugs = {
            item.slug for item in nav.custom_items
        }
        valid_keys = BUILTIN_KEYS | custom_slugs

        if slug not in valid_keys:
            raise BadRequestException(
                message=f"无效的导航项: {slug}",
                code="INVALID_NAV_KEY",
            )

        if slug in BUILTIN_KEYS:
            nav.item_names[slug] = name
        else:
            for item in nav.custom_items:
                if item.slug == slug:
                    item.name = name
                    break

        await self._save(nav)
        return nav
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/admin/config/web_settings/nav/test_service.py -v -k "rename_item"`

Expected: 3 PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/api/api/admin/config/web_settings/nav/service.py
git add backend/api/tests/admin/config/web_settings/nav/test_service.py
git commit -m "feat: 导航栏 Service 增加 rename_item 方法及测试"
```

---

## Task 3: 后端 Router — rename-item 端点

**Files:**
- Modify: `backend/api/api/admin/config/web_settings/nav/router.py`

- [ ] **Step 1: 修改 router.py 导入和新增端点**

在导入部分增加 `NavRenameItemRequest`：

```python
from .schemas import (
    NavAddItemRequest,
    NavConfig,
    NavRemoveItemRequest,
    NavRenameItemRequest,     # 新增
    NavReorderRequest,
)
```

在文件末尾、`remove_nav_item` 端点之后新增：

```python
@router.post(
    "/rename-item",
    response_model=NavConfig,
    summary="重命名导航项",
)
async def rename_nav_item(
    data: NavRenameItemRequest, session: DbSession
) -> NavConfig:
    """重命名导航项（预设项覆盖名称 / 自定义项修改名称）。"""
    svc = NavService(session)
    return await svc.rename_item(data.slug, data.name)
```

- [ ] **Step 2: 验证导入无错误**

Run: `cd /home/whw23/code/mudasky/backend/api && python -c "from api.admin.config.web_settings.nav.router import router; print('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/api/api/admin/config/web_settings/nav/router.py
git commit -m "feat: 导航栏 Router 增加 rename-item 端点"
```

---

## Task 4: 后端 Service 测试补全

**Files:**
- Modify: `backend/api/tests/admin/config/web_settings/nav/test_service.py`

> 注：Task 2 中已添加了 rename_item 的测试代码。此任务确保测试与最终代码一致并运行全部通过。

- [ ] **Step 1: 确认测试文件包含完整的 rename_item 测试**

在 `test_service.py` 末尾（`_save` 测试之后）添加以下测试（如果 Task 2 已添加则跳过此步，直接验证）：

```python
# ---- rename_item ----


@pytest.mark.asyncio
@patch(REPO)
async def test_rename_item_builtin(mock_repo, service):
    """重命名预设导航项成功（写入 item_names）。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)
    mock_repo.create = AsyncMock()

    result = await service.rename_item("visa", {"zh": "签证攻略"})

    assert result.item_names["visa"] == {"zh": "签证攻略"}


@pytest.mark.asyncio
@patch(REPO)
async def test_rename_item_custom(mock_repo, service):
    """重命名自定义导航项成功（更新 custom_items.name）。"""
    nav = _nav_with_custom()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(nav.model_dump())
    )
    mock_repo.update_value = AsyncMock()

    result = await service.rename_item("custom-1", {"zh": "新版自定义页"})

    item = next(i for i in result.custom_items if i.slug == "custom-1")
    assert item.name == {"zh": "新版自定义页"}


@pytest.mark.asyncio
@patch(REPO)
async def test_rename_item_invalid_slug(mock_repo, service):
    """重命名不存在的导航项抛出 BadRequestException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(BadRequestException) as exc_info:
        await service.rename_item("nonexistent", "不存在")

    assert exc_info.value.code == "INVALID_NAV_KEY"
```

- [ ] **Step 2: 运行全部 service 测试**

Run: `cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/admin/config/web_settings/nav/test_service.py -v`

Expected: 全部 PASSED（包括原有的 get_nav_config、reorder、add_item、remove_item、_save 和新增的 rename_item 测试）

- [ ] **Step 3: Commit**

```bash
git add backend/api/tests/admin/config/web_settings/nav/test_service.py
git commit -m "test: 导航栏 rename_item Service 单元测试"
```

---

## Task 5: 后端 Router 测试

**Files:**
- Modify: `backend/api/tests/admin/config/web_settings/nav/test_router.py`

- [ ] **Step 1: 添加 rename-item 接口测试**

在文件末尾添加：

```python
class TestRenameNavItem:
    """POST /nav/rename-item 端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 NavService。"""
        with patch(SVC_PATH) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_rename_item_success(
        self, client, superuser_headers
    ):
        """重命名导航项成功返回 200。"""
        nav = _nav_with_custom()
        nav.item_names = {"visa": {"zh": "签证攻略"}}
        self.mock_svc.rename_item.return_value = nav

        resp = await client.post(
            "/admin/web-settings/nav/rename-item",
            json={
                "slug": "visa",
                "name": {"zh": "签证攻略"},
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["item_names"]["visa"] == {"zh": "签证攻略"}
        self.mock_svc.rename_item.assert_awaited_once_with(
            "visa", {"zh": "签证攻略"}
        )

    async def test_rename_item_invalid_slug(
        self, client, superuser_headers
    ):
        """重命名无效导航项返回 400。"""
        self.mock_svc.rename_item.side_effect = (
            BadRequestException(
                message="无效的导航项: bad",
                code="INVALID_NAV_KEY",
            )
        )
        resp = await client.post(
            "/admin/web-settings/nav/rename-item",
            json={"slug": "bad", "name": "bad-name"},
            headers=superuser_headers,
        )
        assert resp.status_code == 400

    async def test_rename_item_missing_slug(
        self, client, superuser_headers
    ):
        """缺少 slug 字段返回 422。"""
        resp = await client.post(
            "/admin/web-settings/nav/rename-item",
            json={"name": "只有名称"},
            headers=superuser_headers,
        )
        assert resp.status_code == 422

    async def test_rename_item_missing_name(
        self, client, superuser_headers
    ):
        """缺少 name 字段返回 422。"""
        resp = await client.post(
            "/admin/web-settings/nav/rename-item",
            json={"slug": "visa"},
            headers=superuser_headers,
        )
        assert resp.status_code == 422
```

- [ ] **Step 2: 运行全部 router 测试**

Run: `cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/admin/config/web_settings/nav/test_router.py -v`

Expected: 全部 PASSED

- [ ] **Step 3: Commit**

```bash
git add backend/api/tests/admin/config/web_settings/nav/test_router.py
git commit -m "test: 导航栏 rename-item Router 接口测试"
```

---

## Task 6: 前端类型 — ConfigContext.tsx 更新 NavConfig

**Files:**
- Modify: `frontend/contexts/ConfigContext.tsx`

- [ ] **Step 1: 更新 NavConfig 接口和 DEFAULT_NAV_CONFIG**

找到 `NavConfig` 接口（约第 55-58 行），修改为：

```tsx
/** 导航栏配置 */
interface NavConfig {
  order: string[]
  custom_items: NavCustomItem[]
  item_names?: Record<string, string | Record<string, string>>
}
```

找到 `DEFAULT_NAV_CONFIG`（约第 61-64 行），修改为：

```tsx
/** 默认导航配置（兜底） */
const DEFAULT_NAV_CONFIG: NavConfig = {
  order: ['home', 'universities', 'study-abroad', 'requirements', 'cases', 'visa', 'life', 'news', 'about'],
  custom_items: [],
  item_names: {},
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `cd /home/whw23/code/mudasky/frontend && pnpm tsc --noEmit --skipLibCheck 2>&1 | head -20`

Expected: 无与 NavConfig 相关的错误（可能有其他已有错误，只要没有新增的即可）

- [ ] **Step 3: Commit**

```bash
git add frontend/contexts/ConfigContext.tsx
git commit -m "feat: NavConfig 类型增加 item_names 字段"
```

---

## Task 7: 前端 Header — 导航栏标题优先查 item_names

**Files:**
- Modify: `frontend/components/layout/Header.tsx`

- [ ] **Step 1: 修改 navItems 生成逻辑**

找到 `navItems` 的生成代码（约第 122-134 行），替换为：

```tsx
  /** 根据 navConfig 生成导航项列表 */
  const navItems = navConfig.order.map((key) => {
    // 1. 先查 item_names 覆盖
    const override = navConfig.item_names?.[key]
    if (override) {
      const label = getLocalizedValue(override, locale)
      return { key, href: BUILTIN_HREF[key] || `/${key}`, label }
    }
    // 2. 预设项：从 i18n 读取
    const i18nKey = NAV_KEY_TO_I18N[key]
    if (i18nKey) {
      return { key, href: BUILTIN_HREF[key] || `/${key}`, label: tNav(i18nKey) }
    }
    // 3. 自定义项
    const custom = navConfig.custom_items.find((c) => c.slug === key)
    const name = custom?.name
    const label = typeof name === 'string' ? name : (name as Record<string, string>)?.[locale] || key
    return { key, href: `/${key}`, label }
  })
```

- [ ] **Step 2: 运行前端类型检查**

Run: `cd /home/whw23/code/mudasky/frontend && pnpm tsc --noEmit --skipLibCheck 2>&1 | grep -i "Header.tsx" || echo "No Header errors"`

Expected: `No Header errors`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/layout/Header.tsx
git commit -m "feat: Header 导航栏标题优先读取 item_names 覆盖"
```

---

## Task 8: 前端 PageBanner — Banner 标题自动同步

**Files:**
- Modify: `frontend/components/layout/PageBanner.tsx`

- [ ] **Step 1: 修改 PageBanner 组件支持 item_names 覆盖**

替换整个文件内容为：

```tsx
"use client"

/**
 * 从配置读取 Banner 图片的页面横幅。
 * 自动从 ConfigContext 中读取对应页面的 banner 图片 ID。
 * 支持从 navConfig.item_names 读取覆盖后的页面标题。
 */

import { useLocale } from "next-intl"
import { useConfig } from "@/contexts/ConfigContext"
import { getLocalizedValue } from "@/lib/i18n-config"
import { Banner } from "./Banner"

interface PageBannerProps {
  /** 页面标识（对应 page_banners 配置的 key） */
  pageKey: string
  /** 默认标题（i18n 翻译值，当 item_names 无覆盖时使用） */
  title: string
  /** 英文副标题 */
  subtitle?: string
}

/** 从配置读取 Banner 图片的页面横幅 */
export function PageBanner({ pageKey, title, subtitle }: PageBannerProps) {
  const { pageBanners, navConfig } = useConfig()
  const locale = useLocale()

  // 如果 navConfig.item_names 中有覆盖，使用覆盖的标题
  const overrideName = navConfig?.item_names?.[pageKey]
  const displayTitle = overrideName
    ? getLocalizedValue(overrideName, locale)
    : title

  const imageIds = pageBanners?.[pageKey]?.image_ids || []
  return <Banner title={displayTitle} subtitle={subtitle} imageIds={imageIds} />
}
```

- [ ] **Step 2: 运行前端类型检查**

Run: `cd /home/whw23/code/mudasky/frontend && pnpm tsc --noEmit --skipLibCheck 2>&1 | grep -i "PageBanner" || echo "No PageBanner errors"`

Expected: `No PageBanner errors`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/layout/PageBanner.tsx
git commit -m "feat: PageBanner 支持 navConfig.item_names 标题覆盖"
```

---

## Task 9: 前端 RenameNavItemDialog — 新建改名弹窗组件

**Files:**
- Create: `frontend/components/admin/web-settings/RenameNavItemDialog.tsx`

- [ ] **Step 1: 创建弹窗组件文件**

```tsx
"use client"

/**
 * 重命名导航项弹窗。
 * 输入多语言名称，调用 API 更新导航项名称。
 */

import { useState, useEffect } from "react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { LocalizedInput } from "@/components/admin/LocalizedInput"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"

interface RenameNavItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  currentName: string | Record<string, string>
  onSuccess: () => void
}

export function RenameNavItemDialog({
  open,
  onOpenChange,
  slug,
  currentName,
  onSuccess,
}: RenameNavItemDialogProps) {
  const [name, setName] = useState<Record<string, string>>({ zh: "", en: "", ja: "", de: "" })
  const [saving, setSaving] = useState(false)

  /** 打开时填充当前名称 */
  useEffect(() => {
    if (open) {
      if (typeof currentName === "string") {
        setName({ zh: currentName, en: "", ja: "", de: "" })
      } else {
        setName({ zh: "", en: "", ja: "", de: "", ...currentName })
      }
    }
  }, [open, currentName])

  /** 提交改名 */
  async function handleSubmit(): Promise<void> {
    const zhName = name.zh?.trim()
    if (!zhName) {
      toast.error("中文名称不能为空")
      return
    }

    setSaving(true)
    try {
      await api.post("/admin/web-settings/nav/rename-item", {
        slug,
        name,
      })
      toast.success("导航项已重命名")
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error("重命名失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名导航项</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <LocalizedInput
            value={name}
            onChange={setName}
            label="名称"
          />
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: 运行前端类型检查**

Run: `cd /home/whw23/code/mudasky/frontend && pnpm tsc --noEmit --skipLibCheck 2>&1 | grep -i "RenameNavItemDialog" || echo "No errors"`

Expected: `No errors`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/admin/web-settings/RenameNavItemDialog.tsx
git commit -m "feat: 新增 RenameNavItemDialog 导航项改名弹窗"
```

---

## Task 10: 前端 NavEditor — 集成铅笔按钮和改名弹窗

**Files:**
- Modify: `frontend/components/admin/web-settings/NavEditor.tsx`

- [ ] **Step 1: 修改 NavEditor 增加 item_names 支持和铅笔按钮**

**导入部分**：增加 `Pencil` 图标和 `RenameNavItemDialog` 导入：

```tsx
import { GripVertical, Plus, X, Pencil } from "lucide-react"
```

```tsx
import { RenameNavItemDialog } from "./RenameNavItemDialog"
```

**NavConfig 接口**：增加 `item_names`：

```tsx
/** API 返回的导航配置 */
interface NavConfig {
  order: string[]
  custom_items: CustomItem[]
  item_names?: Record<string, string | Record<string, string>>
}
```

**State**：增加 `renameTarget` 和 `itemNames`：

```tsx
  const [itemNames, setItemNames] = useState<Record<string, string | Record<string, string>>>({})
  const [renameTarget, setRenameTarget] = useState<{
    slug: string
    name: string | Record<string, string>
  } | null>(null)
```

**fetchNavConfig**：解析 `item_names`：

```tsx
  const fetchNavConfig = useCallback(async () => {
    try {
      const res = await api.get("/admin/web-settings/nav/list")
      const data = res.data as NavConfig
      setNavOrder(data.order)
      setCustomItems(data.custom_items)
      setItemNames(data.item_names || {})
    } catch {
      toast.error("获取导航配置失败")
    }
  }, [])
```

**getItemName**：优先查 `item_names`：

```tsx
  /** 获取导航项显示名称 */
  function getItemName(key: string): string {
    // 1. 先查 item_names 覆盖
    const override = itemNames[key]
    if (override) {
      return getLocalizedValue(override, locale)
    }
    // 2. 预设项：从 i18n 读取
    const i18nKey = NAV_KEY_TO_I18N[key]
    if (i18nKey) {
      return tNav(i18nKey)
    }
    // 3. 自定义项
    const custom = customItems.find((item) => item.slug === key)
    if (custom) {
      return getLocalizedValue(custom.name, locale)
    }
    return key
  }
```

**获取当前名称（用于弹窗默认值）**：

```tsx
  /** 获取导航项的原始名称（用于弹窗编辑） */
  function getItemRawName(key: string): string | Record<string, string> {
    const override = itemNames[key]
    if (override) return override
    const custom = customItems.find((item) => item.slug === key)
    if (custom) return custom.name
    return ""
  }
```

**渲染部分**：在删除按钮之前（或导航按钮之后）增加铅笔按钮：

在导航项按钮 `</button>` 和 `{/* 自定义项删除按钮 */}` 之间插入：

```tsx
                          {/* 重命名按钮 */}
                          <button
                            onClick={() => {
                              const rawName = getItemRawName(key)
                              setRenameTarget({ slug: key, name: rawName })
                            }}
                            className="text-muted-foreground/40 hover:text-primary transition-colors"
                            aria-label={`重命名 ${getItemName(key)}`}
                          >
                            <Pencil className="size-3" />
                          </button>
```

**弹窗部分**：在 `RemoveNavItemDialog` 之后添加 RenameNavItemDialog：

```tsx
      {/* 重命名导航项弹窗 */}
      {renameTarget && (
        <RenameNavItemDialog
          open={!!renameTarget}
          onOpenChange={(open) => { if (!open) setRenameTarget(null) }}
          slug={renameTarget.slug}
          currentName={renameTarget.name}
          onSuccess={fetchNavConfig}
        />
      )}
```

- [ ] **Step 2: 运行前端类型检查**

Run: `cd /home/whw23/code/mudasky/frontend && pnpm tsc --noEmit --skipLibCheck 2>&1 | grep -i "NavEditor" || echo "No NavEditor errors"`

Expected: `No NavEditor errors`

- [ ] **Step 3: Commit**

```bash
git add frontend/components/admin/web-settings/NavEditor.tsx
git commit -m "feat: NavEditor 增加铅笔改名按钮和 RenameNavItemDialog 集成"
```

---

## Task 11: 前端单元测试更新

**Files:**
- Modify: `frontend/tests/components/admin/NavEditor.test.tsx`

- [ ] **Step 1: 更新 mock 和测试用例**

在现有 mock 之后添加 RenameNavItemDialog 的 mock：

```tsx
vi.mock("@/components/admin/web-settings/RenameNavItemDialog", () => ({
  RenameNavItemDialog: ({ open, slug }: { open: boolean; slug: string }) =>
    open ? <div data-testid={`rename-dialog-${slug}`} /> : null,
}))
```

在测试用例中增加改名相关测试（在文件末尾 `})` 之前添加）：

```tsx
  it("item_names 覆盖预设项名称", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        order: ["home", "visa"],
        custom_items: [],
        item_names: { visa: { zh: "签证攻略" } },
      },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText("签证攻略")).toBeInTheDocument()
    })
  })

  it("预设项和自定义项都显示重命名按钮", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        order: ["home", "custom-page"],
        custom_items: [{ slug: "custom-page", name: "自定义页" }],
        item_names: {},
      },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByLabelText("重命名 home")).toBeInTheDocument()
      expect(screen.getByLabelText("重命名 自定义页")).toBeInTheDocument()
    })
  })

  it("点击重命名按钮打开 RenameNavItemDialog", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        order: ["home", "visa"],
        custom_items: [],
        item_names: {},
      },
    })

    render(<NavEditor {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByLabelText("重命名 visa")).toBeInTheDocument()
    })

    await userEvent.click(screen.getByLabelText("重命名 visa"))

    expect(screen.getByTestId("rename-dialog-visa")).toBeInTheDocument()
  })
```

- [ ] **Step 2: 运行前端单元测试**

Run: `cd /home/whw23/code/mudasky/frontend && pnpm test -- --run tests/components/admin/NavEditor.test.tsx`

Expected: 全部 PASSED（原有 9 个 + 新增 3 个 = 12 个测试通过）

- [ ] **Step 3: Commit**

```bash
git add frontend/tests/components/admin/NavEditor.test.tsx
git commit -m "test: NavEditor 增加 item_names 和重命名按钮测试"
```

---

## Task 12: 集成验证

**Files:** 无新增文件，验证已有改动

- [ ] **Step 1: 运行后端全部 nav 相关测试**

Run: `cd /home/whw23/code/mudasky && uv run --project backend/api python -m pytest backend/api/tests/admin/config/web_settings/nav/ -v`

Expected: 全部 PASSED

- [ ] **Step 2: 运行前端全部单元测试**

Run: `cd /home/whw23/code/mudasky/frontend && pnpm test -- --run`

Expected: 全部 PASSED（包括 NavEditor 测试）

- [ ] **Step 3: 验证开发容器可正常启动**

Run: `cd /home/whw23/code/mudasky && ./scripts/dev.sh start`

Wait for: `docker compose ps` 显示 gateway/api/frontend/db 均为 healthy/up

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "feat: 导航栏 Tab 改名功能完成"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| 设计文档要求 | 对应 Task |
|-------------|----------|
| NavConfig 增加 `item_names` 字段 | Task 1 (backend), Task 6 (frontend) |
| 后端 `rename-item` 接口 | Task 2, Task 3 |
| Header 优先读取 item_names | Task 7 |
| PageBanner 自动同步标题 | Task 8 |
| NavEditor 铅笔按钮 | Task 10 |
| RenameNavItemDialog 弹窗 | Task 9 |
| 后端 Service 测试 | Task 4 |
| 后端 Router 测试 | Task 5 |
| 前端单元测试 | Task 11 |
| 集成验证 | Task 12 |

**无遗漏。**

### 2. Placeholder Scan

- 无 TBD / TODO / "implement later" / "fill in details"
- 无 "add appropriate error handling" 等模糊描述
- 每个测试都有具体代码
- 每个步骤都有具体命令和预期输出

### 3. Type Consistency

- `NavConfig.item_names` 后端: `dict[str, str | dict]` — 前端: `Record<string, string | Record<string, string>>` ✅
- `NavRenameItemRequest.name` 后端: `str | dict` — 前端弹窗: `Record<string, string>`（提交时即为此类型）✅
- `rename_item` 方法签名前后一致 ✅
- `pageKey` 在 PageBanner 中用于查找 `item_names` 的 key，与 Header 中使用的 slug 一致 ✅
