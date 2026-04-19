---
name: dev-env
description: 管理开发环境。当用户说"启动开发环境"、"重启容器"、"清理重建"、"停止容器"、"看日志"、"启动生产容器"、"dev start"、"dev --prod"、"dev --clean"、"dev --down"、"dev --logs"时触发。
---

# 开发环境管理

通过 `./scripts/dev.sh` 管理 Docker 开发环境。

## 触发时机

用户提到以下任何一种：
- "启动开发环境"、"dev start"、"start dev"
- "清理重建"、"重置数据库"、"dev --clean"
- "停止容器"、"关容器"、"dev --down"
- "看日志"、"查日志"、"dev --logs"
- "启动生产容器"、"跑 E2E"、"dev --prod"

## 命令映射

| 用户意图 | 命令 | 说明 |
|----------|------|------|
| 启动开发环境 | `./scripts/dev.sh start` | 构建并启动（自动 rebuild） |
| 清理数据卷重建 | `./scripts/dev.sh --clean` | 重置数据库后重新启动 |
| 停止容器 | `./scripts/dev.sh --down` | 停止并移除容器 |
| 查看日志 | `./scripts/dev.sh --logs [服务名]` | 实时日志，可指定服务 |
| 启动生产容器 | `./scripts/dev.sh --prod` | 构建生产镜像并启动（E2E 用） |

## 工作流程

### 1. 判断操作

根据用户意图选择正确的命令。常见场景：

- 修改了种子数据 → `--clean`（需要 down -v 重建数据库）
- 修改了代码想测试 → `start`（自动 rebuild）
- 要跑 E2E 测试 → `--prod`（生产容器）
- 要释放资源 → `--down`
- 调试问题 → `--logs api` 或 `--logs gateway`

### 2. 执行

在项目根目录执行对应命令。

**注意**：`start`、`--clean`、`--prod` 都会先 `docker compose down`，是安全的。

### 3. 前台/后台

- `--down` 和 `--logs` 可直接前台运行
- `start` 和 `--clean` 会占用终端（docker compose up），根据用户需求决定是否后台运行
- `--prod` 已自带 `-d` 后台运行

## 注意事项

- `--clean` 会删除数据卷，所有数据库数据会丢失，执行前确认用户意图
- `--prod` 构建的是生产镜像，耗时较长
- 日志查看支持指定服务名：`--logs api`、`--logs gateway`、`--logs frontend`、`--logs db`
