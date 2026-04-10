# 角色管理面板重构设计

## 背景

当前角色管理页面使用卡片网格展示，存在两个问题：

1. 无法区分内置角色和自定义角色
2. 不支持自定义排序

## 变更范围

### 1. 后端：Role 模型新增字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `is_builtin` | `bool` | `False` | 标记是否为内置角色 |
| `sort_order` | `int` | `0` | 排序序号，升序排列 |

**数据库迁移：**

- 新增 `is_builtin` 列，默认 `False`
- 新增 `sort_order` 列，默认 `0`
- 迁移脚本中将现有 5 个内置角色（superuser、website_admin、student_advisor、student、visitor）的 `is_builtin` 设为 `True`
- 按现有顺序为所有角色赋初始 `sort_order`（0, 1, 2, ...）

**初始化脚本调整：**

- `init_superuser.py` 中创建角色时设置 `is_builtin=True` 和对应的 `sort_order`

**API 变更：**

- `GET /roles`：响应中包含 `is_builtin` 和 `sort_order` 字段，按 `sort_order` 升序返回
- `POST /roles`：创建角色时 `is_builtin` 固定为 `False`，`sort_order` 自动取当前最大值 +1
- `PATCH /roles/{role_id}`：不允许修改 `is_builtin` 字段
- 新增 `PATCH /roles/reorder`：接收 `[{id, sort_order}]` 数组，批量更新排序，需要 `admin.role.edit` 权限

**业务规则不变：**

- 内置角色可编辑权限和描述，但不可删除、不可改名（原有 `PROTECTED_ROLE_NAMES` 逻辑保留）
- 通配符权限机制不变

### 2. 前端：卡片网格改为数据表格

将 `RoleList.tsx` 中的 `RoleGrid` 卡片组件替换为表格，复用现有 `UserTable`/`ArticleTable` 的表格风格。

**表格列定义：**

| 列 | 内容 | 样式 |
|----|------|------|
| 拖拽手柄 | `⠿` 图标 | `color: muted-foreground`，`cursor: grab` |
| 角色名 | `role.name` | `font-weight: 600` |
| 描述 | `role.description` | `text-muted-foreground` |
| 类型 | 内置/自定义标签 | 内置：灰色 `rounded-full` 标签；自定义：绿色 `rounded-full` 标签 |
| 权限数 | `role.permissions.length` | `text-muted-foreground` |
| 用户数 | `role.user_count` | `text-muted-foreground` |
| 操作 | 编辑/删除按钮 | `variant="ghost" size="sm"`，superuser 行显示 `—` |

**表格样式（复用现有规范）：**

- 容器：`overflow-x-auto rounded-lg border`
- 表格：`w-full text-sm`
- 表头行：`border-b bg-muted/50`，单元格 `px-4 py-3 text-left font-medium`
- 数据行：`border-b transition-colors hover:bg-muted/30`，单元格 `px-4 py-3`
- 状态标签：`rounded-full px-2 py-0.5 text-xs`

**拖拽排序：**

- 使用 `@dnd-kit/core` + `@dnd-kit/sortable`（MIT 协议）
- 拖拽释放后调用 `PATCH /roles/reorder` 持久化排序

**Type 定义更新：**

`Role` 接口新增 `is_builtin: boolean` 和 `sort_order: number` 字段。

### 3. 权限树与导航结构对齐（约束，无代码改动）

当前权限定义已按 `用户中心.*` / `admin.*` 两大模块组织，与侧边栏导航结构一致。未来新增面板或功能时，必须同步在 `init_superuser.py` 的 `PERMISSIONS` 列表中新增对应的权限定义。

## 不改动的部分

- 权限通配符存储机制
- RoleDialog 编辑弹窗（权限树形选择器）
- 权限检查逻辑
- 受保护角色名规则（`PROTECTED_ROLE_NAMES`）
