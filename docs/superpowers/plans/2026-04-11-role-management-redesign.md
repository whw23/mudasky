# 角色管理面板重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将角色管理从卡片网格改为数据表格，新增 `is_builtin` / `sort_order` 字段，支持拖拽排序

**Architecture:** 后端 Role 模型新增两个字段 + reorder 接口；前端 RoleList 从卡片改为表格 + dnd-kit 拖拽排序

**Tech Stack:** SQLAlchemy (async) / Alembic / FastAPI / Pydantic / React / @dnd-kit/core + @dnd-kit/sortable / next-intl

---

## 文件变更清单

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `backend/shared/src/app/rbac/models.py` | Role 模型新增 `is_builtin`、`sort_order` |
| 修改 | `backend/shared/src/app/rbac/schemas.py` | 新增 `ReorderItem`、`RoleReorder`，`RoleResponse` 增字段 |
| 修改 | `backend/shared/src/app/rbac/repository.py` | `list_roles` 按 `sort_order` 排序，新增 `get_max_sort_order`、`bulk_update_sort_order` |
| 修改 | `backend/shared/src/app/rbac/service.py` | `create_role` 自动设 `sort_order`，新增 `reorder_roles` |
| 修改 | `backend/shared/src/app/rbac/router.py` | 新增 `PATCH /roles/reorder` 端点 |
| 修改 | `backend/api/scripts/init_superuser.py` | 角色定义加 `is_builtin=True` 和 `sort_order` |
| 创建 | `backend/api/alembic/versions/<auto>_role_添加_is_builtin_sort_order.py` | 数据库迁移 |
| 修改 | `backend/api/tests/test_rbac_service.py` | 新增 reorder 测试，更新 `_make_role` |
| 修改 | `frontend/types/index.ts` | `Role` 接口增 `is_builtin`、`sort_order` |
| 修改 | `frontend/components/admin/RoleList.tsx` | 卡片网格 → 表格 + 拖拽排序 |
| 修改 | `frontend/messages/zh.json` | 新增 i18n 键 |
| 修改 | `frontend/messages/en.json` | 新增 i18n 键 |
| 修改 | `frontend/messages/ja.json` | 新增 i18n 键 |
| 修改 | `frontend/messages/de.json` | 新增 i18n 键 |

---

## Task 1: 后端 — Role 模型新增字段

**Files:**
- Modify: `backend/shared/src/app/rbac/models.py:38-69`

- [ ] **Step 1: 修改 Role 模型，新增 `is_builtin` 和 `sort_order` 字段**

在 `backend/shared/src/app/rbac/models.py` 的 `Role` 类中，在 `updated_at` 字段之后、`permissions` 关系之前，新增：

```python
from sqlalchemy import Boolean, DateTime, Integer, String, func
```

更新 import，然后在 Role 类中添加：

```python
    is_builtin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
```

- [ ] **Step 2: 提交**

```bash
git add backend/shared/src/app/rbac/models.py
git commit -m "feat: Role 模型新增 is_builtin 和 sort_order 字段"
```

---

## Task 2: 后端 — Schemas 更新

**Files:**
- Modify: `backend/shared/src/app/rbac/schemas.py`

- [ ] **Step 1: RoleResponse 新增字段，新增 ReorderItem 和 RoleReorder**

在 `RoleResponse` 中新增：

```python
class RoleResponse(BaseModel):
    """角色信息响应。"""

    id: str
    name: str
    description: str
    is_builtin: bool = False
    sort_order: int = 0
    permissions: list[PermissionResponse]
    user_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
```

在文件末尾新增：

```python
class ReorderItem(BaseModel):
    """单个排序项。"""

    id: str
    sort_order: int


class RoleReorder(BaseModel):
    """角色排序请求。"""

    items: list[ReorderItem] = Field(
        ..., description="角色 ID 与新排序值列表"
    )
```

- [ ] **Step 2: 提交**

```bash
git add backend/shared/src/app/rbac/schemas.py
git commit -m "feat: RoleResponse 增加 is_builtin/sort_order，新增 RoleReorder schema"
```

---

## Task 3: 后端 — Repository 层更新

**Files:**
- Modify: `backend/shared/src/app/rbac/repository.py`

- [ ] **Step 1: `list_roles` 改为按 `sort_order` 排序**

将 `repository.py` 中 `list_roles` 函数的 `.order_by(Role.name)` 改为 `.order_by(Role.sort_order)`。

- [ ] **Step 2: 新增 `get_max_sort_order` 函数**

在 `list_roles` 函数之后添加：

```python
async def get_max_sort_order(
    session: AsyncSession,
) -> int:
    """查询当前最大排序值。"""
    stmt = select(func.coalesce(func.max(Role.sort_order), -1))
    result = await session.execute(stmt)
    return result.scalar_one()
```

- [ ] **Step 3: 新增 `bulk_update_sort_order` 函数**

在 `get_max_sort_order` 之后添加：

```python
async def bulk_update_sort_order(
    session: AsyncSession,
    items: list[tuple[str, int]],
) -> None:
    """批量更新角色排序。

    Args:
        items: [(role_id, sort_order), ...]
    """
    for role_id, sort_order in items:
        stmt = (
            select(Role)
            .where(Role.id == role_id)
        )
        result = await session.execute(stmt)
        role = result.scalar_one_or_none()
        if role:
            role.sort_order = sort_order
    await session.commit()
```

- [ ] **Step 4: 提交**

```bash
git add backend/shared/src/app/rbac/repository.py
git commit -m "feat: repository 层支持 sort_order 排序和批量更新"
```

---

## Task 4: 后端 — Service 层更新

**Files:**
- Modify: `backend/shared/src/app/rbac/service.py`

- [ ] **Step 1: `create_role` 自动设置 `sort_order`**

在 `create_role` 方法中，创建 `Role` 对象之前，查询当前最大排序值：

```python
    async def create_role(
        self, data: RoleCreate
    ) -> RoleResponse:
        """创建角色。

        检查名称唯一性，关联指定权限。
        """
        existing = await repository.get_role_by_name(
            self.session, data.name
        )
        if existing:
            raise ConflictException(message="角色名称已存在")

        permissions = await repository.get_permissions_by_ids(
            self.session, data.permission_ids
        )

        max_order = await repository.get_max_sort_order(
            self.session
        )

        role = Role(
            name=data.name,
            description=data.description,
            permissions=permissions,
            sort_order=max_order + 1,
        )
        await repository.create_role(self.session, role)
        return RoleResponse.model_validate(role)
```

- [ ] **Step 2: 新增 `reorder_roles` 方法**

在 `delete_role` 方法之后添加：

```python
    async def reorder_roles(
        self, data: "RoleReorder"
    ) -> None:
        """批量更新角色排序。"""
        items = [(item.id, item.sort_order) for item in data.items]
        await repository.bulk_update_sort_order(
            self.session, items
        )
```

同时在文件顶部 import 中添加 `RoleReorder`：

```python
from app.rbac.schemas import (
    PermissionResponse,
    RoleCreate,
    RoleReorder,
    RoleResponse,
    RoleUpdate,
)
```

- [ ] **Step 3: 提交**

```bash
git add backend/shared/src/app/rbac/service.py
git commit -m "feat: service 层支持自动排序和批量 reorder"
```

---

## Task 5: 后端 — Router 层新增 reorder 端点

**Files:**
- Modify: `backend/shared/src/app/rbac/router.py`

- [ ] **Step 1: 新增 `PATCH /roles/reorder` 端点**

在 `router.py` 中 `create_role` 路由之后、`get_role` 路由之前，添加（注意：必须在 `/roles/{role_id}` 之前注册，否则 `reorder` 会被当成 `role_id` 参数匹配）：

```python
@router.patch(
    "/roles/reorder",
    response_model=MessageResponse,
    dependencies=[
        Depends(require_permission("admin.role.edit"))
    ],
)
async def reorder_roles(
    data: RoleReorder,
    session: DbSession,
) -> MessageResponse:
    """批量更新角色排序。"""
    svc = RbacService(session)
    await svc.reorder_roles(data)
    return MessageResponse(message="排序已更新")
```

同时在顶部 import 中添加 `RoleReorder`：

```python
from app.rbac.schemas import (
    PermissionResponse,
    RoleCreate,
    RoleReorder,
    RoleResponse,
    RoleUpdate,
)
```

- [ ] **Step 2: 提交**

```bash
git add backend/shared/src/app/rbac/router.py
git commit -m "feat: 新增 PATCH /roles/reorder 端点"
```

---

## Task 6: 后端 — 数据库迁移

**Files:**
- Create: `backend/api/alembic/versions/<auto>_role_添加_is_builtin_sort_order.py`

- [ ] **Step 1: 在 backend 容器内生成迁移**

```bash
docker compose exec backend alembic revision --autogenerate -m "role 添加 is_builtin sort_order"
```

- [ ] **Step 2: 编辑生成的迁移文件，在 `upgrade()` 末尾加数据迁移**

在 `op.add_column` 之后，添加数据迁移逻辑：

```python
    # 数据迁移：标记现有内置角色
    builtin_names = [
        'superuser', 'website_admin', 'student_advisor',
        'student', 'visitor',
    ]
    role_table = sa.table(
        'role',
        sa.column('name', sa.String),
        sa.column('is_builtin', sa.Boolean),
        sa.column('sort_order', sa.Integer),
    )

    # 按名称为所有角色设置初始排序
    conn = op.get_bind()
    roles = conn.execute(
        sa.select(role_table.c.name).order_by(role_table.c.name)
    ).fetchall()

    for idx, (name,) in enumerate(roles):
        conn.execute(
            role_table.update()
            .where(role_table.c.name == name)
            .values(
                sort_order=idx,
                is_builtin=name in builtin_names,
            )
        )
```

- [ ] **Step 3: 执行迁移**

```bash
docker compose exec backend alembic upgrade head
```

- [ ] **Step 4: 提交**

```bash
git add backend/api/alembic/versions/
git commit -m "feat: 数据库迁移 — role 表新增 is_builtin 和 sort_order"
```

---

## Task 7: 后端 — 初始化脚本更新

**Files:**
- Modify: `backend/api/scripts/init_superuser.py:89-116`

- [ ] **Step 1: ROLES 定义加 `is_builtin` 和 `sort_order`**

将 `ROLES` 改为四元组 `(name, description, [perm_codes], sort_order)`：

```python
ROLES = [
    (
        "superuser",
        "超级管理员",
        ["*"],
        0,
    ),
    (
        "website_admin",
        "网站管理员",
        ["admin.*", "user_center.*"],
        1,
    ),
    (
        "student_advisor",
        "留学顾问",
        ["admin.user.*", "admin.content.*", "admin.case.*", "user_center.*"],
        2,
    ),
    (
        "student",
        "学员",
        ["user_center.*"],
        3,
    ),
    (
        "visitor",
        "访客",
        ["user_center.profile.view"],
        4,
    ),
]
```

- [ ] **Step 2: 更新 `init_roles` 函数**

```python
async def init_roles(session) -> None:
    """初始化系统角色。已存在的角色跳过。"""
    for name, description, perm_codes, sort_order in ROLES:
        stmt = select(Role).where(Role.name == name)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug("角色已存在，跳过: %s", name)
            continue

        role = Role(
            name=name,
            description=description,
            is_builtin=True,
            sort_order=sort_order,
        )
        session.add(role)

        # 先 flush 以获取 role.id
        await session.flush()

        # 关联权限
        if perm_codes:
            perm_stmt = select(Permission).where(
                Permission.code.in_(perm_codes)
            )
            perm_result = await session.execute(perm_stmt)
            permissions = perm_result.scalars().all()

            for perm in permissions:
                await session.execute(
                    role_permission.insert().values(
                        role_id=role.id,
                        permission_id=perm.id,
                    )
                )

        logger.info("创建角色: %s", name)
```

- [ ] **Step 3: 提交**

```bash
git add backend/api/scripts/init_superuser.py
git commit -m "feat: 初始化脚本设置内置角色 is_builtin 和 sort_order"
```

---

## Task 8: 后端 — 单元测试更新

**Files:**
- Modify: `backend/api/tests/test_rbac_service.py`

- [ ] **Step 1: 更新 `_make_role` 辅助函数**

```python
def _make_role(
    name: str,
    role_id: str = "",
    permissions: list | None = None,
    is_builtin: bool = False,
    sort_order: int = 0,
) -> Role:
    """创建模拟 Role 对象。"""
    r = MagicMock(spec=Role)
    r.id = role_id or f"role-{name}"
    r.name = name
    r.description = f"{name} 描述"
    r.permissions = permissions or []
    r.is_builtin = is_builtin
    r.sort_order = sort_order
    r.created_at = datetime.now(timezone.utc)
    r.updated_at = None
    return r
```

- [ ] **Step 2: 更新 `test_create_role`，验证 `sort_order` 自动设置**

```python
@pytest.mark.asyncio
@patch(REPO)
async def test_create_role(mock_repo, service):
    """创建角色并关联权限，自动设置 sort_order。"""
    mock_repo.get_role_by_name = AsyncMock(return_value=None)
    perm = _make_permission("admin.user.list")
    mock_repo.get_permissions_by_ids = AsyncMock(
        return_value=[perm]
    )
    mock_repo.get_max_sort_order = AsyncMock(return_value=4)

    async def _fake_create(session, role):
        role.id = "new-role-id"
        role.created_at = datetime.now(timezone.utc)
        role.updated_at = None

    mock_repo.create_role = AsyncMock(side_effect=_fake_create)

    data = RoleCreate(
        name="测试角色",
        description="测试描述",
        permission_ids=["perm-admin.user.list"],
    )
    result = await service.create_role(data)

    assert result.name == "测试角色"
    assert result.sort_order == 5
    mock_repo.get_max_sort_order.assert_awaited_once()
    mock_repo.create_role.assert_awaited_once()
```

- [ ] **Step 3: 新增 `test_reorder_roles` 测试**

在文件末尾添加：

```python
@pytest.mark.asyncio
@patch(REPO)
async def test_reorder_roles(mock_repo, service):
    """批量更新角色排序。"""
    mock_repo.bulk_update_sort_order = AsyncMock()

    from app.rbac.schemas import RoleReorder

    data = RoleReorder(items=[
        {"id": "r1", "sort_order": 0},
        {"id": "r2", "sort_order": 1},
        {"id": "r3", "sort_order": 2},
    ])
    await service.reorder_roles(data)

    mock_repo.bulk_update_sort_order.assert_awaited_once_with(
        service.session,
        [("r1", 0), ("r2", 1), ("r3", 2)],
    )
```

- [ ] **Step 4: 运行测试**

```bash
docker compose exec backend pytest tests/test_rbac_service.py -v
```

预期：全部通过。

- [ ] **Step 5: 提交**

```bash
git add backend/api/tests/test_rbac_service.py
git commit -m "test: 更新 RBAC 测试覆盖 sort_order 和 reorder"
```

---

## Task 9: 前端 — 安装 dnd-kit 依赖

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: 安装 @dnd-kit/core 和 @dnd-kit/sortable**

```bash
cd frontend && pnpm add @dnd-kit/core @dnd-kit/sortable
```

- [ ] **Step 2: 提交**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore: 安装 @dnd-kit/core 和 @dnd-kit/sortable"
```

---

## Task 10: 前端 — Type 定义和 i18n 更新

**Files:**
- Modify: `frontend/types/index.ts:27-35`
- Modify: `frontend/messages/zh.json`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ja.json`
- Modify: `frontend/messages/de.json`

- [ ] **Step 1: Role 接口新增字段**

在 `frontend/types/index.ts` 的 `Role` 接口中新增：

```typescript
export interface Role {
  id: string
  name: string
  description: string
  is_builtin: boolean
  sort_order: number
  permissions: Permission[]
  user_count: number
  created_at: string
  updated_at: string | null
}
```

- [ ] **Step 2: zh.json 新增 i18n 键**

在 `AdminGroups` 对象中新增：

```json
"col_drag": "",
"col_name": "角色名",
"col_description": "描述",
"col_type": "类型",
"col_permissions": "权限数",
"col_users": "用户数",
"col_actions": "操作",
"builtin": "内置",
"custom": "自定义",
"reorderError": "排序更新失败"
```

- [ ] **Step 3: en.json 新增对应 i18n 键**

```json
"col_drag": "",
"col_name": "Role",
"col_description": "Description",
"col_type": "Type",
"col_permissions": "Permissions",
"col_users": "Users",
"col_actions": "Actions",
"builtin": "Built-in",
"custom": "Custom",
"reorderError": "Reorder failed"
```

- [ ] **Step 4: ja.json 和 de.json 新增对应 i18n 键**

ja.json:
```json
"col_drag": "",
"col_name": "ロール名",
"col_description": "説明",
"col_type": "タイプ",
"col_permissions": "権限数",
"col_users": "ユーザー数",
"col_actions": "操作",
"builtin": "組み込み",
"custom": "カスタム",
"reorderError": "並べ替え失敗"
```

de.json:
```json
"col_drag": "",
"col_name": "Rollenname",
"col_description": "Beschreibung",
"col_type": "Typ",
"col_permissions": "Berechtigungen",
"col_users": "Benutzer",
"col_actions": "Aktionen",
"builtin": "Integriert",
"custom": "Benutzerdefiniert",
"reorderError": "Neuordnung fehlgeschlagen"
```

- [ ] **Step 5: 提交**

```bash
git add frontend/types/index.ts frontend/messages/
git commit -m "feat: 前端 Role 类型和 i18n 更新"
```

---

## Task 11: 前端 — RoleList 改为表格 + 拖拽排序

**Files:**
- Modify: `frontend/components/admin/RoleList.tsx`

- [ ] **Step 1: 替换 RoleList.tsx 全部内容**

将整个文件替换为以下实现（表格 + dnd-kit 拖拽）：

```tsx
"use client"

/**
 * 角色列表组件。
 * 表格展示，支持拖拽排序、创建、编辑和删除。
 */

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { RoleDialog } from "@/components/admin/RoleDialog"
import api from "@/lib/api"
import type { Role } from "@/types"

/** 可排序的表格行 */
function SortableRow({
  role,
  onEdit,
  onDelete,
  t,
}: {
  role: Role
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
  t: ReturnType<typeof useTranslations>
}) {
  const isSuperuser = role.permissions.some((p) => p.code === "*")

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b transition-colors hover:bg-muted/30"
    >
      <td
        className="px-4 py-3 text-muted-foreground cursor-grab"
        {...attributes}
        {...listeners}
      >
        ⠿
      </td>
      <td className="px-4 py-3 font-semibold">{role.name}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {role.description}
      </td>
      <td className="px-4 py-3">
        {role.is_builtin ? (
          <span className="rounded-full px-2 py-0.5 text-xs bg-secondary text-muted-foreground">
            {t("builtin")}
          </span>
        ) : (
          <span className="rounded-full px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            {t("custom")}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {role.permissions.length}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {role.user_count}
      </td>
      <td className="px-4 py-3">
        {isSuperuser ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(role)}
            >
              {t("edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(role)}
            >
              {t("delete")}
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}

/** 角色列表 */
export function RoleList() {
  const t = useTranslations("AdminGroups")

  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  /** 获取角色列表 */
  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<Role[]>("/roles")
      setRoles(data)
    } catch {
      toast.error(t("fetchError"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  /** 拖拽排序结束 */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = roles.findIndex((r) => r.id === active.id)
    const newIndex = roles.findIndex((r) => r.id === over.id)
    const reordered = arrayMove(roles, oldIndex, newIndex)

    setRoles(reordered)

    try {
      await api.patch("/roles/reorder", {
        items: reordered.map((r, i) => ({
          id: r.id,
          sort_order: i,
        })),
      })
    } catch {
      toast.error(t("reorderError"))
      fetchRoles()
    }
  }

  /** 打开创建对话框 */
  const handleCreate = () => {
    setEditingRole(null)
    setDialogOpen(true)
  }

  /** 打开编辑对话框 */
  const handleEdit = (role: Role) => {
    setEditingRole(role)
    setDialogOpen(true)
  }

  /** 删除角色 */
  const handleDelete = async (role: Role) => {
    if (!confirm(t("deleteConfirm", { name: role.name }))) return
    try {
      await api.delete(`/roles/${role.id}`)
      toast.success(t("deleteSuccess"))
      fetchRoles()
    } catch {
      toast.error(t("deleteError"))
    }
  }

  /** 对话框保存后刷新列表 */
  const handleSaved = () => {
    setDialogOpen(false)
    fetchRoles()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>
          {t("createGroup")}
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">
          {t("loading")}
        </p>
      ) : roles.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {t("noData")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium w-10">
                  {t("col_drag")}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t("col_name")}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t("col_description")}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t("col_type")}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t("col_permissions")}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t("col_users")}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t("col_actions")}
                </th>
              </tr>
            </thead>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={roles.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {roles.map((role) => (
                    <SortableRow
                      key={role.id}
                      role={role}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      t={t}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>
      )}

      <RoleDialog
        role={editingRole}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaved}
      />
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/components/admin/RoleList.tsx
git commit -m "feat: 角色管理改为表格 + 拖拽排序"
```

---

## Task 12: 验证与重启

- [ ] **Step 1: 重启前端容器**

```bash
docker compose restart frontend
```

- [ ] **Step 2: 浏览器验证**

打开管理后台 → 角色管理页面，验证：
1. 角色以表格形式展示
2. 内置角色显示灰色"内置"标签，自定义角色显示绿色"自定义"标签
3. 拖拽行可以改变排序，刷新后排序保持
4. superuser 行无编辑/删除按钮
5. 创建、编辑、删除功能正常

- [ ] **Step 3: 提交最终验证通过**

确认一切正常后，无需额外提交。
