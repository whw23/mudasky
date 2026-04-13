# 多端会话管理设计

## 背景

当前 refresh token 管理存在三个问题：

1. **单端登录**：`refresh` 续签时调用 `revoke_user_refresh_tokens` 撤销该用户所有 token，导致其他设备被踢下线。
2. **logout 影响全部设备**：退出时也是全删，A 设备退出会导致 B 设备也需要重新登录。
3. **过期 token 堆积**：没有自动清理机制，`refresh_token` 和 `sms_code` 表会无限增长。

## 目标

- 支持多端同时登录，互不影响
- 用户可以查看活跃会话、踢掉指定设备、一键踢掉所有其他设备
- 管理员强制下线仍然撤销全部 token（权限变更场景）
- 过期数据由数据库自动清理

## 数据模型变更

`refresh_token` 表新增两个字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `user_agent` | String(256) | 浏览器/设备标识 |
| `ip_address` | String(45) | 登录时的 IP 地址 |

## 后端接口变更

### 现有接口改动

| 接口 | 改动 |
|---|---|
| `POST /auth/refresh` | 只删当前 token（按 token hash 匹配），不再全删 |
| `POST /auth/logout` | 只删当前设备的 token（按 token hash），不影响其他设备 |
| `POST /auth/refresh-token-hash` | 请求体新增 `user_agent` 和 `ip_address` 字段 |
| `POST /admin/users/force-logout/{user_id}` | 不变，仍然撤销全部 token |

### 新增接口

| 接口 | 方法 | 说明 |
|---|---|---|
| `GET /portal/profile/sessions` | GET | 返回当前用户所有活跃会话列表 |
| `POST /portal/profile/sessions/revoke/{token_id}` | POST | 踢掉指定设备（按 token id 删除） |
| `POST /portal/profile/sessions/revoke-all` | POST | 踢掉所有其他设备（删除除当前 token 外的所有 token） |

### 会话列表响应格式

```json
{
  "sessions": [
    {
      "id": "token-uuid",
      "user_agent": "Mozilla/5.0 ...",
      "ip_address": "192.168.1.1",
      "created_at": "2026-04-13T10:00:00Z",
      "is_current": true
    }
  ]
}
```

`is_current` 通过请求中的 `X-Refresh-Token-Hash` 与数据库中的 `token_hash` 匹配来判断。

## 网关变更

### logout location

`access_by_lua` 中除了注入 `X-User-Id`（从 access token JWT 解析），还需：

- 从 cookie 读取 `refresh_token`
- 做 SHA-256 哈希
- 注入 `X-Refresh-Token-Hash` 请求头

### session 相关接口

`/portal/profile/sessions`、`/portal/profile/sessions/revoke-all` 需要注入 `X-Refresh-Token-Hash`（用于标记当前设备、排除当前设备）。`/portal/profile/sessions/revoke/{token_id}` 不需要（按 id 指定）。

这些接口走 `location /api/` 的 `auth.lua`，已有 `X-User-Id` 注入。`X-Refresh-Token-Hash` 需要在 `auth.lua` 中对 `/portal/profile/sessions` 路径额外注入。

### auth_proxy.lua（登录/注册）

保存 token 时在请求体中额外传：

- `user_agent`：从 `ngx.var.http_user_agent` 获取
- `ip_address`：从 `ngx.var.remote_addr` 获取

## 前端变更

在 `ProfileInfo` 卡片的 2FA 区块下方新增"登录设备"区块：

- 调用 `GET /portal/profile/sessions` 获取会话列表
- 每条显示：设备信息（从 user_agent 解析为简短描述）、IP 地址、登录时间
- 当前设备标记"当前"标签，不可踢出
- 其他设备每条右侧一个"踢出"按钮
- 列表上方一个"退出所有其他设备"按钮
- 操作后刷新列表，toast 提示成功

## 数据库定时清理

使用 PostgreSQL `pg_cron` 扩展，每天凌晨 3 点自动清理：

```sql
SELECT cron.schedule('clean_expired_tokens', '0 3 * * *',
  $$DELETE FROM refresh_token WHERE expires_at < now()$$);
```

短信验证码（`sms_code`）不清理，留存用于和服务商对账。

Docker PostgreSQL 镜像需确认已安装 `pg_cron` 扩展，未安装则在初始化脚本中启用。

## Repository 层变更

新增方法：

| 方法 | 说明 |
|---|---|
| `revoke_refresh_token_by_hash(session, token_hash)` | 按 hash 删除单条 token |
| `revoke_other_refresh_tokens(session, user_id, current_hash)` | 删除该用户除当前 hash 外的所有 token |
| `list_user_refresh_tokens(session, user_id)` | 查询该用户所有未过期的 token |
| `revoke_refresh_token_by_id(session, token_id, user_id)` | 按 id 删除单条 token（校验 user_id 防越权） |

现有方法保留：

- `revoke_user_refresh_tokens`：管理员强制下线继续使用
- `delete_expired_refresh_tokens`：保留但不再由后端调用，改由 pg_cron 执行

## 不涉及的变更

- 管理员强制下线逻辑不变
- access token 机制不变（仍为短期 JWT）
- 前端 PanelGuard 和网关 page_guard.lua 不变
