# 通用配置面板设计

## 背景

当前"网页设置"页面混合了页面可视化编辑和非可视化的功能配置（国家码、favicon）。将无法在页面预览中所见即所得编辑的配置项独立为"通用配置"面板。

## 变更范围

### 1. 新增管理后台面板："通用配置"

- 侧边栏新增菜单项"通用配置"，位于"角色管理"和"网页设置"之间
- 权限复用 `admin.settings.*`
- 路由：`/admin/general-settings`
- 页面标题：通用配置

### 2. 通用配置页面内容

简单的表单页面，两个 section：

**Section 1：网站图标 (Favicon)**
- 图片上传组件，读写 `site_info.favicon_url` 字段
- 调用 `PUT /admin/config/site_info` 更新（与现有 site_info 编辑接口一致）

**Section 2：国家码管理**
- 直接复用现有 `CountryCodeEditor` 组件
- 数据源：`phone_country_codes` 配置项

### 3. 网页设置页面调整

- 移除底部"通用配置"section（包含国家码编辑器的区域）
- `favicon_url` 字段从 `SITE_INFO_FIELDS` 定义中移除（不再出现在网页设置的品牌信息编辑弹窗中）

### 4. 侧边栏导航更新

在 `AdminSidebar.tsx` 的 `MENU_KEYS` 中，在 `roleManagement` 之后、`webSettings` 之前新增：

```
{ key: "generalSettings", href: "/admin/general-settings", icon: Wrench, permissions: ["admin.settings.*"] }
```

### 5. i18n 更新

四个语言文件新增 `AdminGeneral` namespace 的翻译键：
- `title`：通用配置
- `faviconTitle`：网站图标
- `faviconDesc`：浏览器标签页显示的图标
- `countryCodeTitle`：国家码管理
- `countryCodeDesc`：登录和注册时可用的手机号国家码

侧边栏菜单项翻译键 `AdminSidebar.generalSettings`。

## 不改动的部分

- 后端 API 接口（无任何后端改动）
- `CountryCodeEditor` 组件本身
- `ConfigEditDialog` 组件
- 权限定义
