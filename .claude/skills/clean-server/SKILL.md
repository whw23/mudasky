---
name: clean-server
description: 清理生产服务器。在用户要求"清理服务器"、"重置服务器"、"清空线上"、"服务器重建"时使用。停止容器、删除数据卷/镜像/env文件，等待 CI/CD 重新部署。
user_invocable: true
---

# 清理生产服务器

彻底清理服务器上的所有运行数据，等待 CI/CD 重新部署。

## 调用方式

| 命令 | 说明 |
|------|------|
| `/clean-server` | 完整清理（容器 + 数据卷 + 镜像 + env） |
| `/clean-server keep-env` | 保留 env 文件，只清理容器/数据卷/镜像 |
| `/clean-server status` | 仅查看服务器当前状态，不做清理 |

## 执行前确认

**此操作会删除数据库数据，不可恢复。** 执行前必须向用户确认。

## 流程

### 1. 查看当前状态

```bash
wsl --cd ~ -- bash -c 'ssh mudasky "
  echo === 容器 === &&
  docker ps --format \"table {{.Names}}\t{{.Status}}\" &&
  echo === 镜像 === &&
  docker images --format \"table {{.Repository}}\t{{.Size}}\" &&
  echo === 数据卷 === &&
  docker volume ls &&
  echo === env === &&
  ls -la ~/mudasky/env/ 2>/dev/null || echo 无
"'
```

### 2. 停止容器并删除数据卷

```bash
wsl --cd ~ -- bash -c 'ssh mudasky "cd ~/mudasky && docker compose down -v"'
```

### 3. 删除所有镜像和构建缓存

```bash
wsl --cd ~ -- bash -c 'ssh mudasky "docker image prune -af && docker builder prune -af"'
```

### 4. 删除 env 文件（除非 keep-env）

```bash
wsl --cd ~ -- bash -c 'ssh mudasky "rm -f ~/mudasky/env/*.env"'
```

### 5. 验证清理结果

```bash
wsl --cd ~ -- bash -c 'ssh mudasky "
  echo === 容器 === && docker ps -a &&
  echo === 镜像 === && docker images &&
  echo === 数据卷 === && docker volume ls &&
  echo === env === && ls ~/mudasky/env/ 2>/dev/null || echo 已清空
"'
```

## 清理后

服务器已清空，需要重新部署才能恢复服务：
- 使用 `/deploy-and-verify` 触发部署
- 或手动 push main 触发 CI/CD

CI/CD 会自动：从 Secrets/Variables 生成 env 文件 → 拉取镜像 → 启动容器 → 初始化数据库种子数据

## 输出格式

以表格汇总清理结果：

| 项目 | 清理前 | 清理后 |
|------|--------|--------|
| 容器 | N 个运行中 | 0 |
| 镜像 | xxxMB | 0 |
| 数据卷 | pgdata | 0 |
| env 文件 | N 个 | 0 / 保留 |
