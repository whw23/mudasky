# 导航栏 Tab 改名功能设计

## 背景

管理后台"网页设置"中的导航栏编辑器（NavEditor）支持拖动排序、新增/删除自定义导航项，但预设导航项（网站首页、院校选择、出国留学等）和自定义导航项的名称均不可在编辑器中直接修改。管理员需要能够随时修改任意导航项的显示名称，且修改后页面 Banner 标题应自动同步。

## 需求

1. 每个导航栏 tab（预设项 + 自定义项）都可以改名
2. 改名后导航栏显示新名称
3. 改名后对应页面的 Banner 标题自动同步显示新名称
4. 支持多语言（zh/en/ja/de）

## 方案

### 数据结构

`NavConfig` 增加 `item_names` 字段，存储导航项的名称覆盖：

```python
class NavConfig(BaseModel):
    """导航栏配置。"""

    order: list[str]                           # 导航项排序（保持不变）
    custom_items: list[NavCustomItem] = []     # 自定义导航项（保持不变）
    item_names: dict[str, str | dict] = {}     # 新增：slug → 覆盖名称
```

示例：

```json
{
  "order": ["home", "universities", "study-abroad", "requirements", "cases", "visa", "life", "news", "about"],
  "custom_items": [],
  "item_names": {
    "universities": {"zh": "名校推荐", "en": "Top Universities"},
    "visa": {"zh": "签证攻略"}
  }
}
```

**向后兼容**：`item_names` 默认空字典，现有数据无需迁移（无覆盖时回退到 i18n 翻译）。

### 前端渲染

#### 导航栏标题 — Header.tsx

`getItemName` 函数增加 `item_names` 优先查找：

```
getItemName(key):
  1. 查 item_names[key] → 有则用（数据库覆盖名称）
  2. 查 NAV_KEY_TO_I18N[key] → 预设项默认名称
  3. 查 custom_items → 自定义项名称
  4. 回退 key
```

#### Banner 标题 — PageBanner.tsx

修改 `PageBanner` 组件内部逻辑，根据 `pageKey` 自动查找覆盖标题：**所有 page.tsx 无需改动**。

```
PageBanner({ pageKey, title, subtitle }):
  override = navConfig?.item_names?.[pageKey]
  displayTitle = override ? getLocalizedValue(override, locale) : title
  return <Banner title={displayTitle} subtitle={subtitle} ... />
```

效果：将"签证办理"改名为"签证攻略"后：
- 导航栏显示"签证攻略"
- `/visa` 列表页 Banner 标题同步为"签证攻略"
- `/visa/[id]` 详情页 Banner 标题同步为"签证攻略"

### 后端 API

#### 新增端点

`POST /admin/web-settings/nav/rename-item`

- **权限**：admin
- **参数**：
  - `slug: str` — 导航项标识
  - `name: str | dict` — 新名称（支持多语言字典或字符串）
- **逻辑**：
  - 验证 slug 在 `order` 中（预设项或自定义项均可）
  - 如果是预设项 → 写入 `item_names[slug] = name`
  - 如果是自定义项 → 更新 `custom_items` 中对应项的 `name`
- **响应**：完整的 `NavConfig`

#### 修改文件

| 文件 | 改动 |
|------|------|
| `backend/api/api/admin/config/web_settings/nav/schemas.py` | NavConfig 增加 `item_names` 字段；新增 `NavRenameItemRequest` |
| `backend/api/api/admin/config/web_settings/nav/service.py` | 新增 `rename_item(slug, name)` 方法 |
| `backend/api/api/admin/config/web_settings/nav/router.py` | 新增 `rename-item` 端点 |

### NavEditor UI

- 每个导航项右侧增加**铅笔图标**按钮（编辑名称）
- 点击打开 `RenameNavItemDialog` 弹窗
- 弹窗内容：多语言名称输入（zh/en/ja/de，中文必填）
- 预设项和自定义项共用同一个弹窗和接口
- 保存后刷新列表

### 测试覆盖

| 层级 | 内容 |
|------|------|
| 后端 service | 预设项改名、自定义项改名、无效 slug 报错 |
| 后端 router | 正向测试、权限拒绝、边界测试 |
| 前端单元测试 | NavEditor 铅笔按钮点击、弹窗打开、保存调用 API |
| E2E | 预设项改名 → 确认导航栏和 Banner 同步更新 |

## 关键决策

1. **`item_names` 单独字段 vs `order` 改为对象数组**：选择前者，完全向后兼容，无需数据迁移，改动范围最小。
2. **一个接口处理两种类型**：`rename-item` 内部判断是预设项还是自定义项，前端无需区分。
3. **PageBanner 内部自动同步**：利用已有的 `pageKey` 参数，零改动各 page.tsx 即可实现 Banner 标题同步。
