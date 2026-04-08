# System Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generic system configuration module with admin management UI, starting with phone country codes as the first config item.

**Architecture:** A new `config` domain module (models/schemas/repository/service/router) with a `system_config` key-value table using JSONB values. Frontend reads config via a `ConfigProvider` context, admin manages via a settings page. Public GET with Cache-Control, superuser-only PUT.

**Tech Stack:** SQLAlchemy (model), FastAPI (API), Pydantic (validation), Alembic (migration), React Context (frontend state), shadcn/ui (admin UI)

**Spec:** `docs/superpowers/specs/2026-04-08-system-config-design.md`

---

### Task 1: Backend — Config Domain Model + Migration

**Files:**
- Create: `backend/shared/src/app/config/__init__.py`
- Create: `backend/shared/src/app/config/models.py`
- Modify: `backend/api/src/api/main.py` (import config models)

- [ ] **Step 1: Create config domain directory and `__init__.py`**

```bash
mkdir -p backend/shared/src/app/config
touch backend/shared/src/app/config/__init__.py
```

- [ ] **Step 2: Create `models.py`**

```python
"""系统配置数据模型。"""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SystemConfig(Base):
    """系统配置键值对。"""

    __tablename__ = "system_config"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 3: Import config models in `main.py`**

In `backend/api/src/api/main.py`, add import alongside other model imports (after RBAC models import):

```python
import app.config.models  # noqa: F401 — 注册 ORM 映射
```

- [ ] **Step 4: Generate Alembic migration**

```bash
docker compose exec api alembic revision --autogenerate -m "add system_config table"
```

Verify migration creates `system_config` table with columns: key, value, description, created_at, updated_at.

- [ ] **Step 5: Run migration**

```bash
docker compose exec api alembic upgrade head
```

- [ ] **Step 6: Commit**

```bash
git add backend/shared/src/app/config/ backend/api/src/api/main.py backend/shared/alembic/versions/
git commit -m "feat: 新增 system_config 数据模型和迁移"
```

---

### Task 2: Backend — Schemas + Repository

**Files:**
- Create: `backend/shared/src/app/config/schemas.py`
- Create: `backend/shared/src/app/config/repository.py`

- [ ] **Step 1: Create `schemas.py`**

```python
"""系统配置请求/响应 schema 和验证器。"""

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


class CountryCodeItem(BaseModel):
    """国家码条目。"""

    code: str = Field(..., description="国家码，如 +86")
    country: str = Field(..., description="国旗 emoji，如 🇨🇳")
    label: str = Field(..., description="国家名称，如 中国")
    digits: int = Field(..., ge=6, le=15, description="号码位数")

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        """校验国家码格式。"""
        if not re.match(r"^\+\d{1,4}$", v):
            raise ValueError("国家码格式不正确，应为 +数字（1-4位）")
        return v


class PhoneCountryCodesValue(BaseModel):
    """phone_country_codes 配置值验证。"""

    items: list[CountryCodeItem]

    @model_validator(mode="before")
    @classmethod
    def wrap_list(cls, data: Any) -> Any:
        """接收原始 list 并包装为 dict。"""
        if isinstance(data, list):
            return {"items": data}
        return data

    @field_validator("items")
    @classmethod
    def validate_unique_codes(cls, v: list[CountryCodeItem]) -> list[CountryCodeItem]:
        """校验国家码不重复。"""
        codes = [item.code for item in v]
        if len(codes) != len(set(codes)):
            raise ValueError("国家码不能重复")
        return v

    def to_list(self) -> list[dict]:
        """转为存储格式。"""
        return [item.model_dump() for item in self.items]


# 配置键 → 验证器映射
CONFIG_VALIDATORS: dict[str, type[BaseModel]] = {
    "phone_country_codes": PhoneCountryCodesValue,
}


class ConfigResponse(BaseModel):
    """单个配置响应。"""

    key: str
    value: Any
    description: str

    model_config = {"from_attributes": True}


class ConfigDetailResponse(ConfigResponse):
    """配置详情响应（含时间戳，管理后台用）。"""

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConfigUpdateRequest(BaseModel):
    """配置更新请求。"""

    value: Any = Field(..., description="配置值")
```

- [ ] **Step 2: Create `repository.py`**

```python
"""系统配置数据访问层。"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.models import SystemConfig


async def get_by_key(
    session: AsyncSession, key: str
) -> SystemConfig | None:
    """按 key 获取配置。"""
    result = await session.execute(
        select(SystemConfig).where(SystemConfig.key == key)
    )
    return result.scalar_one_or_none()


async def list_all(
    session: AsyncSession,
) -> list[SystemConfig]:
    """获取所有配置。"""
    result = await session.execute(
        select(SystemConfig).order_by(SystemConfig.key)
    )
    return list(result.scalars().all())


async def update_value(
    session: AsyncSession, config: SystemConfig, value: dict | list
) -> None:
    """更新配置值。"""
    config.value = value
    await session.flush()


async def create(
    session: AsyncSession, key: str, value: dict | list, description: str
) -> SystemConfig:
    """创建配置项。"""
    config = SystemConfig(key=key, value=value, description=description)
    session.add(config)
    await session.flush()
    return config
```

- [ ] **Step 3: Commit**

```bash
git add backend/shared/src/app/config/schemas.py backend/shared/src/app/config/repository.py
git commit -m "feat: 系统配置 schemas 和 repository"
```

---

### Task 3: Backend — Service + Router

**Files:**
- Create: `backend/shared/src/app/config/service.py`
- Create: `backend/shared/src/app/config/router.py`
- Modify: `backend/api/src/api/main.py` (register router)

- [ ] **Step 1: Create `service.py`**

```python
"""系统配置业务逻辑层。"""

from typing import Any

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import repository
from app.config.schemas import CONFIG_VALIDATORS, ConfigResponse, ConfigDetailResponse
from app.core.exceptions import NotFoundException, BadRequestException


class ConfigService:
    """系统配置服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_value(self, key: str) -> ConfigResponse:
        """获取单个配置值。"""
        config = await repository.get_by_key(self.session, key)
        if not config:
            raise NotFoundException(message=f"配置项 {key} 不存在")
        return ConfigResponse.model_validate(config)

    async def list_all(self) -> list[ConfigDetailResponse]:
        """获取所有配置。"""
        configs = await repository.list_all(self.session)
        return [
            ConfigDetailResponse.model_validate(c) for c in configs
        ]

    async def update_value(self, key: str, value: Any) -> ConfigResponse:
        """更新配置值，按 key 查找对应验证器校验。"""
        config = await repository.get_by_key(self.session, key)
        if not config:
            raise NotFoundException(message=f"配置项 {key} 不存在")

        validator = CONFIG_VALIDATORS.get(key)
        if validator:
            try:
                validated = validator.model_validate(value)
                # 如果验证器有 to_list 方法，使用转换后的值
                if hasattr(validated, "to_list"):
                    value = validated.to_list()
            except ValidationError as e:
                raise BadRequestException(message=str(e))

        await repository.update_value(self.session, config, value)
        await self.session.commit()
        return ConfigResponse.model_validate(config)
```

Note: Check if `BadRequestException` exists in `app.core.exceptions`. If not, add it (HTTP 400). Based on existing pattern, it should be there or use `ConflictException` — verify and adjust.

- [ ] **Step 2: Create `router.py`**

First, add a `require_superuser` dependency to `backend/shared/src/app/core/dependencies.py`:

```python
def require_superuser():
    """创建超级管理员校验依赖。"""

    async def check_superuser(
        is_superuser: Annotated[bool, Depends(get_is_superuser)],
    ) -> bool:
        """校验当前用户是否为超级管理员。"""
        if not is_superuser:
            raise ForbiddenException(message="需要超级管理员权限")
        return True

    return check_superuser
```

Then create the router:

```python
"""系统配置路由层。"""

from fastapi import APIRouter, Depends, Response

from app.config.schemas import ConfigResponse, ConfigDetailResponse, ConfigUpdateRequest
from app.config.service import ConfigService
from app.core.dependencies import DbSession, require_superuser

router = APIRouter(tags=["config"])


@router.get("/config/{key}")
async def get_config(
    key: str,
    session: DbSession,
    response: Response,
) -> ConfigResponse:
    """获取单个配置值（公开接口）。"""
    svc = ConfigService(session)
    config = await svc.get_value(key)
    response.headers["Cache-Control"] = "public, max-age=300"
    return config


@router.get(
    "/admin/config",
    response_model=list[ConfigDetailResponse],
    dependencies=[Depends(require_superuser())],
)
async def list_configs(
    session: DbSession,
) -> list[ConfigDetailResponse]:
    """获取所有配置（仅超级管理员）。"""
    svc = ConfigService(session)
    return await svc.list_all()


@router.put(
    "/admin/config/{key}",
    response_model=ConfigResponse,
    dependencies=[Depends(require_superuser())],
)
async def update_config(
    key: str,
    data: ConfigUpdateRequest,
    session: DbSession,
) -> ConfigResponse:
    """更新配置值（仅超级管理员）。"""
    svc = ConfigService(session)
    return await svc.update_value(key, data.value)
```

- [ ] **Step 3: Register router in `main.py`**

In `backend/api/src/api/main.py`, import and include the config router alongside existing routers:

```python
from app.config.router import router as config_router
# ...
api.include_router(config_router)
```

- [ ] **Step 4: Verify `BadRequestException` exists**

Check `backend/shared/src/app/core/exceptions.py` for `BadRequestException` (HTTP 400). If missing, add:

```python
class BadRequestException(AppException):
    """请求参数错误。"""
    def __init__(self, message: str = "请求参数错误") -> None:
        super().__init__(status_code=400, code="BAD_REQUEST", message=message)
```

- [ ] **Step 5: Rebuild and test API**

```bash
docker compose build api && docker compose up -d api
```

Wait for startup, then test:

```bash
# Should return 404 (no data yet)
curl http://localhost/api/config/phone_country_codes
```

- [ ] **Step 6: Commit**

```bash
git add backend/shared/src/app/config/service.py backend/shared/src/app/config/router.py backend/api/src/api/main.py backend/shared/src/app/core/exceptions.py backend/shared/src/app/core/dependencies.py
git commit -m "feat: 系统配置 service 和 router"
```

---

### Task 4: Backend — Init Script + Seed Data

**Files:**
- Modify: `backend/api/scripts/init_superuser.py`

- [ ] **Step 1: Add `init_system_config()` function**

Add to `init_superuser.py`, after `init_superuser()`:

```python
async def init_system_config(session: AsyncSession) -> None:
    """初始化系统配置。"""
    from app.config.models import SystemConfig

    # 手机号国家码
    existing = await session.execute(
        select(SystemConfig).where(SystemConfig.key == "phone_country_codes")
    )
    if not existing.scalar_one_or_none():
        session.add(SystemConfig(
            key="phone_country_codes",
            value=[
                {"code": "+86", "country": "🇨🇳", "label": "中国", "digits": 11},
                {"code": "+81", "country": "🇯🇵", "label": "日本", "digits": 10},
                {"code": "+49", "country": "🇩🇪", "label": "德国", "digits": 10},
                {"code": "+65", "country": "🇸🇬", "label": "新加坡", "digits": 8},
                {"code": "+1", "country": "🇺🇸", "label": "US/CA", "digits": 10},
                {"code": "+44", "country": "🇬🇧", "label": "英国", "digits": 10},
                {"code": "+82", "country": "🇰🇷", "label": "韩国", "digits": 10},
                {"code": "+33", "country": "🇫🇷", "label": "法国", "digits": 9},
            ],
            description="启用的手机号国家码列表",
        ))
        await session.flush()
        print("  ✓ phone_country_codes 已初始化")
    else:
        print("  - phone_country_codes 已存在，跳过")
```

- [ ] **Step 2: Call `init_system_config()` in main**

In the `main()` function, add call after `init_superuser()`:

```python
print("初始化系统配置...")
await init_system_config(session)
```

- [ ] **Step 3: Rebuild and test**

```bash
docker compose build api && docker compose up -d api
sleep 5
curl http://localhost/api/config/phone_country_codes
```

Expected: JSON response with 8 country codes and `Cache-Control: public, max-age=300` header.

- [ ] **Step 4: Commit**

```bash
git add backend/api/scripts/init_superuser.py
git commit -m "feat: 初始化 phone_country_codes 配置数据"
```

---

### Task 5: Frontend — ConfigProvider Context

**Files:**
- Create: `frontend/contexts/ConfigContext.tsx`
- Create: `frontend/types/config.ts`
- Modify: `frontend/app/[locale]/layout.tsx` (wrap with ConfigProvider)

- [ ] **Step 1: Create `types/config.ts`**

```typescript
/**
 * 系统配置相关类型定义。
 */

/** 国家码条目 */
export interface CountryCode {
  code: string
  country: string
  label: string
  digits: number
}
```

- [ ] **Step 2: Create `contexts/ConfigContext.tsx`**

```typescript
'use client'

/**
 * 系统配置 Context。
 * 应用启动时获取配置并缓存，提供 useConfig hook。
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import api from '@/lib/api'
import type { CountryCode } from '@/types/config'

/** 默认国家码（兜底） */
const DEFAULT_COUNTRY_CODES: CountryCode[] = [
  { code: '+86', country: '🇨🇳', label: '中国', digits: 11 },
]

interface ConfigContextType {
  /** 启用的手机号国家码列表 */
  countryCodes: CountryCode[]
}

const ConfigContext = createContext<ConfigContextType>({
  countryCodes: DEFAULT_COUNTRY_CODES,
})

/** 系统配置 Provider */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>(DEFAULT_COUNTRY_CODES)

  useEffect(() => {
    api.get('/config/phone_country_codes')
      .then((res) => {
        if (Array.isArray(res.data.value)) {
          setCountryCodes(res.data.value)
        }
      })
      .catch(() => {
        // 请求失败时使用默认值，不阻塞渲染
      })
  }, [])

  return (
    <ConfigContext value={{ countryCodes }}>
      {children}
    </ConfigContext>
  )
}

/** 获取系统配置 */
export function useConfig(): ConfigContextType {
  return useContext(ConfigContext)
}
```

- [ ] **Step 3: Wrap layout with ConfigProvider**

In `frontend/app/[locale]/layout.tsx`, import `ConfigProvider` and wrap it around children (inside `AuthProvider`, outside page content):

```typescript
import { ConfigProvider } from '@/contexts/ConfigContext'
// ...
<AuthProvider>
  <ConfigProvider>
    {children}
  </ConfigProvider>
</AuthProvider>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/contexts/ConfigContext.tsx frontend/types/config.ts frontend/app/
git commit -m "feat: ConfigProvider 上下文和国家码类型定义"
```

---

### Task 6: Frontend — PhoneInput Refactor

**Files:**
- Modify: `frontend/components/auth/PhoneInput.tsx`
- Modify: `frontend/components/auth/LoginModal.tsx` (update isValidPhone calls)

- [ ] **Step 1: Refactor `PhoneInput.tsx`**

Replace hardcoded `COUNTRY_CODES` with dynamic list from context. Keep `isValidPhone` and `getDigitsForCode` accepting an optional list parameter:

```typescript
'use client'

/**
 * 国际手机号输入组件。
 * 带国家码选择器，从系统配置动态获取国家码列表。
 */

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useConfig } from '@/contexts/ConfigContext'
import type { CountryCode } from '@/types/config'

interface PhoneInputProps {
  /** 完整手机号值（含国家码，如 +8613800138000） */
  value: string
  /** 值变化回调，返回完整手机号 */
  onChange: (fullPhone: string) => void
  /** 输入框 id */
  id?: string
  /** 占位文本 */
  placeholder?: string
  /** 是否必填 */
  required?: boolean
  /** 是否禁用 */
  disabled?: boolean
}

/** 从完整号码中解析国家码和本地号码 */
function parsePhone(full: string, codes: CountryCode[]): { countryCode: string; local: string } {
  for (const c of codes) {
    if (full.startsWith(c.code)) {
      return { countryCode: c.code, local: full.slice(c.code.length) }
    }
  }
  return { countryCode: codes[0]?.code ?? '+86', local: full.replace(/^\+?\d{1,4}/, '') }
}

/** 获取国家码对应的号码位数要求 */
export function getDigitsForCode(code: string, codes: CountryCode[]): number {
  const found = codes.find((c) => c.code === code)
  return found?.digits ?? 10
}

/** 校验手机号是否合法（含国家码） */
export function isValidPhone(fullPhone: string, codes: CountryCode[]): boolean {
  const { countryCode, local } = parsePhone(fullPhone, codes)
  const digits = getDigitsForCode(countryCode, codes)
  return /^\d+$/.test(local) && local.length === digits
}

/** 国际手机号输入框 */
export function PhoneInput({
  value,
  onChange,
  id,
  placeholder,
  required,
  disabled,
}: PhoneInputProps) {
  const { countryCodes } = useConfig()
  const parsed = parsePhone(value, countryCodes)
  const [countryCode, setCountryCode] = useState(parsed.countryCode)
  const localNumber = parsed.local

  /** 国家码变更 */
  function handleCodeChange(newCode: string): void {
    setCountryCode(newCode)
    onChange(newCode + localNumber)
  }

  /** 号码变更（只允许数字） */
  function handleNumberChange(num: string): void {
    const cleaned = num.replace(/\D/g, '')
    onChange(countryCode + cleaned)
  }

  const currentCountry = countryCodes.find((c) => c.code === countryCode)
  const maxDigits = currentCountry?.digits ?? 10

  return (
    <div className="flex gap-1.5 w-full">
      <select
        value={countryCode}
        onChange={(e) => handleCodeChange(e.target.value)}
        disabled={disabled}
        className="h-9 w-28 shrink-0 rounded-md border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      >
        {countryCodes.map((c) => (
          <option key={c.code} value={c.code}>
            {c.country} {c.code}
          </option>
        ))}
      </select>
      <Input
        id={id}
        type="tel"
        value={localNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxDigits}
      />
    </div>
  )
}
```

- [ ] **Step 2: Update `LoginModal.tsx`**

Find where `isValidPhone` is called and pass `countryCodes` from `useConfig()`:

```typescript
import { useConfig } from '@/contexts/ConfigContext'
// ...
const { countryCodes } = useConfig()
// ...
// Change: isValidPhone(phone) → isValidPhone(phone, countryCodes)
```

- [ ] **Step 3: Update any other files importing `isValidPhone` or `getDigitsForCode`**

Search and update all call sites to pass the `countryCodes` parameter.

- [ ] **Step 4: Restart frontend and test**

```bash
docker compose restart frontend
```

Verify PhoneInput works in login, register, and profile pages with country codes loaded from API.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/auth/PhoneInput.tsx frontend/components/auth/LoginModal.tsx
git commit -m "feat: PhoneInput 从系统配置动态获取国家码"
```

---

### Task 7: Frontend — Admin Settings Page

**Files:**
- Create: `frontend/app/[locale]/(admin)/admin/settings/page.tsx`
- Create: `frontend/components/admin/CountryCodeEditor.tsx`
- Modify: `frontend/components/layout/AdminSidebar.tsx` (add menu item)
- Modify: `frontend/messages/zh.json`, `en.json`, `ja.json`, `de.json` (add translations)

- [ ] **Step 1: Add i18n translations**

Add `AdminSettings` namespace to all 4 locale files.

**zh.json:**
```json
"AdminSettings": {
  "title": "系统设置",
  "phoneCountryCodes": "手机号国家码",
  "phoneCountryCodesDesc": "管理用户可选的手机号国家码",
  "code": "区号",
  "codePlaceholder": "+86",
  "country": "旗帜",
  "countryPlaceholder": "🇨🇳",
  "labelField": "名称",
  "labelPlaceholder": "中国",
  "digits": "位数",
  "digitsPlaceholder": "11",
  "add": "添加",
  "delete": "删除",
  "save": "保存",
  "saving": "保存中...",
  "saveSuccess": "保存成功",
  "saveError": "保存失败",
  "fetchError": "获取配置失败",
  "noData": "暂无国家码",
  "deleteConfirm": "确定删除 {code} 吗？"
}
```

**en.json:**
```json
"AdminSettings": {
  "title": "System Settings",
  "phoneCountryCodes": "Phone Country Codes",
  "phoneCountryCodesDesc": "Manage available phone country codes for users",
  "code": "Code",
  "codePlaceholder": "+86",
  "country": "Flag",
  "countryPlaceholder": "🇨🇳",
  "labelField": "Name",
  "labelPlaceholder": "China",
  "digits": "Digits",
  "digitsPlaceholder": "11",
  "add": "Add",
  "delete": "Delete",
  "save": "Save",
  "saving": "Saving...",
  "saveSuccess": "Saved successfully",
  "saveError": "Failed to save",
  "fetchError": "Failed to fetch config",
  "noData": "No country codes",
  "deleteConfirm": "Delete {code}?"
}
```

**ja.json:**
```json
"AdminSettings": {
  "title": "システム設定",
  "phoneCountryCodes": "電話番号の国コード",
  "phoneCountryCodesDesc": "ユーザーが選択できる国コードを管理",
  "code": "国コード",
  "codePlaceholder": "+86",
  "country": "国旗",
  "countryPlaceholder": "🇨🇳",
  "labelField": "名前",
  "labelPlaceholder": "中国",
  "digits": "桁数",
  "digitsPlaceholder": "11",
  "add": "追加",
  "delete": "削除",
  "save": "保存",
  "saving": "保存中...",
  "saveSuccess": "保存しました",
  "saveError": "保存に失敗しました",
  "fetchError": "設定の取得に失敗しました",
  "noData": "国コードがありません",
  "deleteConfirm": "{code} を削除しますか？"
}
```

**de.json:**
```json
"AdminSettings": {
  "title": "Systemeinstellungen",
  "phoneCountryCodes": "Telefonländercodes",
  "phoneCountryCodesDesc": "Verfügbare Telefonländercodes verwalten",
  "code": "Code",
  "codePlaceholder": "+86",
  "country": "Flagge",
  "countryPlaceholder": "🇨🇳",
  "labelField": "Name",
  "labelPlaceholder": "China",
  "digits": "Ziffern",
  "digitsPlaceholder": "11",
  "add": "Hinzufügen",
  "delete": "Löschen",
  "save": "Speichern",
  "saving": "Speichern...",
  "saveSuccess": "Erfolgreich gespeichert",
  "saveError": "Speichern fehlgeschlagen",
  "fetchError": "Konfiguration konnte nicht geladen werden",
  "noData": "Keine Ländercodes",
  "deleteConfirm": "{code} löschen?"
}
```

- [ ] **Step 2: Create `CountryCodeEditor.tsx`**

Table-style editor for country codes with add/delete/save. Uses `api.get('/admin/config')` to fetch and `api.put('/admin/config/phone_country_codes')` to save.

Component should:
- Load current country codes on mount via admin config API
- Render editable table rows (code, country emoji, label, digits)
- Add button to insert new empty row
- Delete button per row
- Save button sends PUT request with full list
- Toast on success/error

- [ ] **Step 3: Create admin settings page**

```typescript
'use client'

/**
 * 系统设置管理页面。
 */

import { useTranslations } from 'next-intl'
import { CountryCodeEditor } from '@/components/admin/CountryCodeEditor'

export default function AdminSettingsPage() {
  const t = useTranslations('AdminSettings')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <CountryCodeEditor />
    </div>
  )
}
```

- [ ] **Step 4: Add settings menu item to AdminSidebar**

In `AdminSidebar.tsx`:
- Import `Settings` icon from lucide-react
- Add menu item with `superuserOnly: true` flag
- Update filter logic: items pass if `!item.permissions || hasAnyPermission(...)` AND `!item.superuserOnly || user?.is_superuser`

```typescript
{ key: 'settings', href: '/admin/settings', icon: Settings, superuserOnly: true },
```

- [ ] **Step 5: Restart frontend and test**

```bash
docker compose restart frontend
```

Verify:
1. Superuser sees "系统设置" in admin sidebar
2. Non-superuser does not see it
3. Settings page loads country codes
4. Can add/delete/save country codes
5. After save, PhoneInput in login/register/profile reflects changes (after page refresh or 300s cache expiry)

- [ ] **Step 6: Commit**

```bash
git add frontend/app/ frontend/components/admin/ frontend/components/layout/AdminSidebar.tsx frontend/messages/
git commit -m "feat: 管理后台系统设置页面和国家码编辑器"
```
