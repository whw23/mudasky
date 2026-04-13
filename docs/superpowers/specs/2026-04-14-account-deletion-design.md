# 注销账号功能设计

## 背景

项目当前没有用户删除功能，只有 `is_active` 禁用。需要新增两个入口的硬删除功能：用户自己注销 + 管理员删除，并全面清理关联数据。同时将管理员用户管理界面从弹窗改为行内展开面板。

## 后端 API

### 端点

| 端点 | 入口 | 请求体 | 验证方式 |
|------|------|--------|----------|
| `POST /api/portal/profile/delete-account` | 用户自删 | `{ code: string }` | 短信验证码 |
| `POST /api/admin/users/delete/{user_id}` | 管理员删 | 无 | 网关权限 |

### 约束

- superuser 角色不可删除，两个入口都拒绝，返回 `SUPERUSER_CANNOT_BE_DELETED`
- 用户自删时无手机号 → 拒绝，返回 `PHONE_NOT_BOUND`
- 管理员不能删除自己（防止误操作），返回 `CANNOT_DELETE_SELF`

### 数据清理

在同一数据库事务中按依赖顺序硬删除：

1. **RefreshToken** — 该用户所有会话令牌
2. **SmsCode** — 该用户手机号相关的验证码记录（如果有手机号）
3. **Document** — 数据库记录 + 磁盘文件（删除 `/data/uploads/{user_id}/` 整个目录）
4. **User** — 用户记录本身

磁盘文件删除在事务提交后执行，事务失败不删文件。

### 错误码

| 错误码 | 场景 |
|--------|------|
| `SUPERUSER_CANNOT_BE_DELETED` | 尝试删除 superuser 角色用户 |
| `PHONE_NOT_BOUND` | 用户自删时无手机号 |
| `CANNOT_DELETE_SELF` | 管理员尝试删除自己 |

### 代码组织

在 `user/service.py` 中新增 `delete_user(session, user_id)` 方法处理数据清理逻辑，两个 router 端点共用。

## 前端 — 用户自删

### 位置

个人资料页（ProfileInfo 组件）底部新增"注销账号"危险操作区。

### 交互流程

1. 显示"注销账号"按钮（destructive 样式）
2. 点击后弹出确认弹窗：
   - 警告文案（操作不可恢复、数据将被永久删除）
   - 短信验证码输入（复用 SmsCodeButton）
   - 确认删除按钮
3. 调用 `POST /portal/profile/delete-account`
4. 成功后清除本地认证状态，跳转回首页
5. 无手机号的用户不显示注销按钮（或显示但提示需先绑定手机号）

## 前端 — 管理员用户管理改版

### 用户表格行内展开

将现有 UserDrawer（Dialog 弹窗）改为行内展开面板：

- 点击用户行 → 该行下方展开编辑面板（手风琴式，同时只展开一行）
- 再次点击同一行或点击其他行 → 收起当前面板
- 面板内容与现有 UserDrawer 一致：基本信息展示、状态切换、角色分配、存储配额、重置密码、强制登出
- 新增"删除用户"按钮（destructive），位于面板底部

### 删除用户交互

1. 点击"删除用户"按钮
2. 弹出二次确认弹窗（AlertDialog）：警告文案 + 确认/取消
3. 确认后调用 `POST /admin/users/delete/{user_id}`
4. 成功后关闭面板，刷新用户列表
5. superuser 角色的用户不显示删除按钮

### 组件变更

- 删除 `UserDrawer.tsx`
- 新增 `UserExpandPanel.tsx`（行内展开面板，内容从 UserDrawer 迁移）
- 修改用户列表页，将表格行点击事件从打开弹窗改为展开/收起面板
