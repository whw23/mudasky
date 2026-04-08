# 系统配置管理模块设计

## 概述

新增通用系统配置管理模块，首个配置项为手机号国家码管理。管理员可自由增删国家码，前端 PhoneInput 组件从后端动态获取可用国家码列表。

## 数据层

### system_config 表

| 字段 | 类型 | 说明 |
|------|------|------|
| key | VARCHAR(100) PK | 配置键 |
| value | JSONB | 配置值 |
| description | VARCHAR(255) | 配置描述 |
| updated_at | TIMESTAMP | 最后更新时间 |

### phone_country_codes 数据结构

value 为 JSON 数组：

```json
[
  { "code": "+86", "country": "CN", "label": "中国", "digits": 11 },
  { "code": "+81", "country": "JP", "label": "日本", "digits": 10 },
  { "code": "+49", "country": "DE", "label": "德国", "digits": 10 },
  { "code": "+65", "country": "SG", "label": "新加坡", "digits": 8 },
  { "code": "+1", "country": "US", "label": "US/CA", "digits": 10 },
  { "code": "+44", "country": "GB", "label": "英国", "digits": 10 },
  { "code": "+82", "country": "KR", "label": "韩国", "digits": 10 },
  { "code": "+33", "country": "FR", "label": "法国", "digits": 9 }
]
```

初始化时预填以上 8 个国家码。

## 后端

### 新建 config 领域模块

目录：`backend/shared/src/app/config/`，包含 models.py、repository.py、service.py、router.py。

遵循项目分层架构：Router -> Service -> Repository -> Models。

### API 端点

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/config/{key}` | 公开 | 获取单个配置值 |
| GET | `/admin/config` | superuser | 获取所有配置列表 |
| PUT | `/admin/config/{key}` | superuser | 更新配置值 |

- 读取接口公开：前端在未登录页面（注册/登录）需要获取国家码列表
- 写入接口限 superuser：系统配置影响面大，不走 RBAC 权限组

### 初始化

在 `init_superuser.py` 脚本中新增 `init_system_config()` 函数，初始化 `phone_country_codes` 配置项。仅在配置不存在时插入，不覆盖已有数据。

### Alembic 迁移

新增迁移创建 `system_config` 表。

## 前端

### PhoneInput 改造

- 移除硬编码的 `COUNTRY_CODES` 常量
- 组件从 React Context 获取国家码列表
- 加载完成前显示默认中国（+86）兜底
- `isValidPhone`、`getDigitsForCode` 改为接收动态列表参数

### ConfigProvider

新增 `contexts/ConfigContext.tsx`：

- 应用启动时调 `GET /config/phone_country_codes` 获取国家码
- 缓存在 Context 中，避免重复请求
- 提供 `useConfig()` hook

### 管理后台

新增"系统设置"页面 `/admin/settings`：

- AdminSidebar 添加菜单项，仅 superuser 可见（通过 `is_superuser` 判断）
- 页面展示所有配置项卡片
- 国家码配置用专用编辑组件：表格形式增删改条目（code、country、label、digits 四个字段）
- 操作按钮：添加国家码、删除、保存

### i18n

四语言文件添加 AdminSettings 命名空间（系统设置页面相关文本）。
