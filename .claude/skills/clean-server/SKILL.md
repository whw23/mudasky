---
name: clean-server
description: 清理生产服务器。在用户要求"清理服务器"、"重置服务器"、"清空线上"、"服务器重建"时使用。停止容器、删除数据卷/镜像/env文件，等待 CI/CD 重新部署。
user_invocable: true
---

# 清理生产服务器

彻底清理服务器上的运行数据，等待 CI/CD 重新部署。

## 调用方式

| 命令 | 说明 |
|------|------|
| `/clean-server` | 默认清理：容器 + 数据卷 + CI/CD 生成文件（保留镜像） |
| `/clean-server full` | 完整清理：容器 + 数据卷 + CI/CD 生成文件 + 镜像 |
| `/clean-server status` | 仅查看服务器当前状态，不做清理 |

默认保留镜像，这样重新部署只需拉增量层（秒级），而非全量拉取（分钟级）。
CI/CD 生成文件（docker-compose.yml、.env、env/、db/）每次部署都会重新 scp 覆盖，删除无影响。

## 执行前确认

**此操作会删除数据库数据，不可恢复。** 执行前必须向用户确认。

## 流程

### 1. 查看当前状态

```bash
ssh mudasky "
  echo === 容器 === &&
  docker ps --format 'table {{.Names}}\t{{.Status}}' &&
  echo === 镜像 === &&
  docker images --format 'table {{.Repository}}\t{{.Size}}' &&
  echo === 数据卷 === &&
  docker volume ls &&
  echo === env === &&
  ls -la ~/mudasky/env/ 2>/dev/null || echo 无
"
```

### 2. 停止容器并删除数据卷

```bash
ssh mudasky "cd ~/mudasky && docker compose down -v"
```

### 3. 删除 CI/CD 生成文件

```bash
ssh mudasky "rm -f ~/mudasky/docker-compose.yml ~/mudasky/.env && rm -rf ~/mudasky/env ~/mudasky/db"
```

### 4. 删除项目镜像（仅 full 模式）

保留基础镜像和构建缓存，只删项目镜像：

```bash
ssh mudasky "docker rmi ghcr.io/whw23/mudasky-gateway:latest ghcr.io/whw23/mudasky-api:latest ghcr.io/whw23/mudasky-frontend:latest ghcr.io/whw23/mudasky-db:latest 2>/dev/null; docker image prune -f"
```

### 5. 验证清理结果

```bash
ssh mudasky "
  echo === 容器 === && docker ps -a &&
  echo === 镜像 === && docker images &&
  echo === 数据卷 === && docker volume ls &&
  echo === env === && ls ~/mudasky/env/*.env 2>/dev/null || echo 已清空
"
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
| 数据卷 | pgdata | 0 |
| 镜像 | xxxMB | 保留 / 已删 |
| env 文件 | N 个 | 保留 / 已删 |
