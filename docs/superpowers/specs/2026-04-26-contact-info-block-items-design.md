# ContactInfo Block 条目选择 + 自定义

## 背景

当前 ContactInfo Block 直接展示所有全局 `contactItems`，没有 Block 级别的条目选择能力。管理员无法选择在某个页面的联系信息区块中只展示部分条目，也无法添加仅属于该 Block 的自定义条目。

**目标**：ContactInfo Block 支持从全局 contactItems 中选择性引用 + 添加自定义条目，全局条目可就地编辑并同步更新。

## 数据模型

### 全局 ContactItem 加 `id`

每个全局联系信息条目增加 UUID 标识，作为 Block 引用的稳定键。

```typescript
interface ContactItem {
  id: string              // 新增，UUID
  icon: string
  label: LocalizedField
  content: LocalizedField
  image_id: string | null
  hover_zoom: boolean
}
```

### Block data 结构

ContactInfo Block 的 `data` 从 `null` 改为存储 `items` 数组：

```typescript
interface ContactInfoBlockData {
  items: ContactInfoBlockItem[]
}

type ContactInfoBlockItem =
  | { type: "global"; id: string }
  | { type: "custom"; icon: string; label: LocalizedField; content: LocalizedField; image_id: string | null; hover_zoom: boolean }
```

**向后兼容**：`data` 为 `null` 时，等价于引用所有全局条目（按原顺序），保持现有行为不变。

## 渲染逻辑

ContactInfoSection 接收解析后的条目列表：

1. 遍历 `block.data.items`（`data` 为 null 时遍历全部全局条目）
2. `type: "global"` → 在 ConfigContext 的 `contactItems` 中按 `id` 查找，找不到则跳过
3. `type: "custom"` → 直接使用自身数据渲染
4. 编辑模式下：
   - 全局条目铅笔 → 修改全局 `contactItems`（现有逻辑）
   - 自定义条目铅笔 → 修改 `block.data.items` 中对应条目

## 添加交互

在预览区域 ContactInfo Block 内，添加"+ 添加条目"按钮（编辑模式下可见）。

点击后弹出 **DropdownMenu**：
- 列出未被当前 Block 引用的全局条目（显示 icon + label），已引用的不显示
- 分隔线
- "自定义条目"选项

**选择全局条目**：直接追加 `{ type: "global", id }` 到 `items` 末尾，保存 `page_blocks`。

**选择自定义**：弹出 Dialog 表单，填写 icon / label / content / image_id / hover_zoom，确认后追加 `{ type: "custom", ... }` 到 `items` 末尾，保存 `page_blocks`。

## 删除交互

每个条目增加删除按钮（编辑模式下可见）：
- 全局条目：仅从 Block 移除引用（不删除全局数据）
- 自定义条目：直接从 `items` 数组删除

## 排序

`items` 数组的顺序即为渲染顺序。可通过现有 Block 编辑弹窗中的拖拽排序调整。

## 影响文件

### 后端

| 文件 | 变更 |
|------|------|
| `backend/scripts/init/seed_config.py` | 每个 contact_items 条目加 `id: uuid4()` |
| `backend/api/api/admin/config/service.py` | 新增/编辑 contact_items 时自动补 `id`（如缺失） |

### 数据库迁移

编写一次性脚本，给现有 `contact_items` 中无 `id` 的条目补充 UUID。通过 admin config API 或 psql 执行。

### 前端

| 文件 | 变更 |
|------|------|
| `frontend/types/config.ts` | ContactItem 接口加 `id: string` |
| `frontend/types/block.ts` | 新增 `ContactInfoBlockData` / `ContactInfoBlockItem` 类型 |
| `frontend/components/blocks/ContactInfoBlock.tsx` | 解析 `block.data.items`，区分 global/custom，传递解析后列表给 ContactInfoSection |
| `frontend/components/about/ContactInfoSection.tsx` | 接收解析后的条目列表 prop（不再直接读全局），保留编辑回调区分 global/custom |
| `frontend/components/admin/web-settings/UnifiedBlockEditor.tsx` | contact_info 类型的编辑逻辑适配新 data 结构 |
| `frontend/components/admin/web-settings/BlockContentTab.tsx` | contact_info 类型改为新的编辑模式（选择已有 + 自定义） |
| `frontend/app/[locale]/[panel]/web-settings/page.tsx` | handleEditConfig 中 contact_item 编辑区分 global/custom 保存路径 |

## 边界情况

- **全局条目被删除**：Block 中引用该 `id` 的条目找不到，渲染时静默跳过
- **data 为 null**：向后兼容，展示所有全局条目
- **全局 contactItems 新增条目时自动补 id**：admin config service 保存时检查并补充缺失的 `id`
- **同一全局条目在多个 Block 中引用**：允许，编辑时同步更新所有引用处

## 验证方式

1. 后端：种子数据重建后确认 contact_items 每项有 `id`
2. 前端：在网页设置页面的"关于我们"预览中操作 ContactInfo Block：
   - 添加全局条目（下拉选择）
   - 添加自定义条目（填写表单）
   - 编辑全局条目（确认同步更新）
   - 编辑自定义条目
   - 删除条目
   - `data` 为 null 时向后兼容显示
3. 公开页面：确认关于我们页面按 Block 配置的条目展示
