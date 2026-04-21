---
name: deploy-and-verify
description: 部署到生产环境并验证。在用户要求"部署"、"上线"、"推到 main"、"合并到 main 并推送"、"验证部署"、"检查线上"时使用。涵盖完整流程：合并 dev → main、推送触发 CI/CD、等待构建完成、验证所有容器版本和健康状态。
user_invocable: true
---

# 部署与验证

完整的生产部署流程：合并代码 → 推送触发 CI/CD → 等待构建 → 验证部署。

## 调用方式

| 命令 | 说明 |
|------|------|
| `/deploy-and-verify` | 完整流程：部署 + 验证 |
| `/deploy-and-verify push-dev` | 仅推送 dev 分支到远程，不触发部署 |
| `/deploy-and-verify deploy-only` | 仅部署：合并 dev → main，推送触发 CI/CD |
| `/deploy-and-verify verify-only` | 仅验证：检查版本、健康状态、CI 结果 |

根据参数决定执行哪些步骤：
- `push-dev`：只执行步骤 2（推送 dev）
- `deploy-only`：只执行「部署流程」（步骤 1-4）
- `verify-only`：只执行「验证流程」（步骤 5-7）
- 无参数：执行全部步骤

## 部署流程

### 1. 确认 dev 分支状态

检查 dev 上有哪些未合并到 main 的 commit：

```bash
git log --oneline main..dev
```

如果没有新 commit，不需要部署。

### 2. 推送 dev

确保 dev 分支已推送到远程：

```bash
git push origin dev
```

WSL 网络可能不稳定，失败后重试即可。

### 3. 合并到 main 并推送

**push main 会触发 CI/CD 部署，必须用户明确要求才能执行。**

```bash
git checkout main && git merge dev --no-edit
git push origin main
git checkout dev
```

推送后 CI/CD 自动执行：
- 检测改动的目录（gateway/frontend/backend/db）
- 只构建有改动的服务镜像
- scp 同步 docker-compose.yml 和 db/init.sql 到服务器
- 拉取新镜像 → 滚动更新 → 健康检查

### 4. 等待 CI 完成

```bash
gh run list -L 3
```

确认最新一次运行状态为 `completed` + `success`。如果 `in_progress`，等待后再查。如果失败，用 `gh run view <run-id>` 查看详情。

## 验证流程

### 5. 检查版本

```bash
curl -sf http://${PRODUCTION_HOST}/api/version
```

返回四个容器的版本号（格式 `YYYYMMDD-<7位hash>`）。对比 main 分支的 commit hash，确认各容器是否更新。版本不一致是正常的 — CI 按路径过滤，只构建有改动的服务。

### 6. 健康检查

```bash
curl -sf http://${PRODUCTION_HOST}/api/health
```

预期返回 `{"status":"ok","version":"..."}`。

### 7. 深入检查（按需）

如果版本或健康检查异常，SSH 到服务器排查：

```bash
# 查看容器状态
ssh mudasky "docker ps --format '{{.Names}} {{.Status}}'"

# 查看某个容器日志（替换 SERVICE 为 gateway/api/frontend/db）
ssh mudasky "docker logs mudasky-SERVICE-1 --tail 20"

# 检查 db 时区
ssh mudasky "docker exec mudasky-db-1 psql -U mudasky -c 'SHOW timezone;'"
```

## 输出格式

以表格汇总结果：

| 项目 | 状态 | 详情 |
|------|------|------|
| CI | ✓/✗ | 运行状态 |
| gateway | ✓/✗ | 版本号 |
| api | ✓/✗ | 版本号 |
| frontend | ✓/✗ | 版本号 |
| db | ✓/✗ | 版本号 |
| health | ✓/✗ | 响应内容 |
