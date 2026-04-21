---
name: run-tests
description: 运行测试。当用户说"跑测试"、"运行测试"、"单元测试"、"E2E测试"、"网关测试"、"前端测试"、"全部测试"、"重跑失败"、"线上测试"、"test unit"、"test e2e"、"test all"时触发。
---

# 统一测试

通过 `./scripts/test.sh` 运行各类测试，结果保存在 `test-results/<时间戳>/`。

## 触发时机

用户提到以下任何一种：
- "跑测试"、"运行测试"、"测试一下"
- "单元测试"、"unit test"
- "前端测试"、"vitest"
- "网关测试"、"gateway test"
- "E2E 测试"、"e2e"、"端到端测试"
- "全部测试"、"test all"
- "重跑失败"、"lnp"
- "线上测试"、"e2e:prod"

## 命令映射

| 用户意图 | 命令 | 环境要求 |
|----------|------|----------|
| 后端单元测试 | `./scripts/test.sh unit` | 无需容器 |
| 前端单元测试 | `./scripts/test.sh vitest` | 无需容器 |
| 网关集成测试 | `./scripts/test.sh gateway` | 需要开发容器 |
| 本地 E2E | `./scripts/test.sh e2e` | 需要生产容器 |
| E2E 重跑失败 | `./scripts/test.sh e2e:lnp` | 需要生产容器 |
| 线上 E2E | `./scripts/test.sh e2e:prod` | 需要 PRODUCTION_HOST |
| 线上 E2E 重跑失败 | `./scripts/test.sh e2e:prod:lnp` | 需要 PRODUCTION_HOST |
| 全部本地测试 | `./scripts/test.sh all` | 需要生产容器 |
| 全部线上测试 | `./scripts/test.sh all:prod` | 需要 PRODUCTION_HOST |

## 工作流程

### 1. 判断测试类型

根据用户意图选择正确的命令。如果用户说"跑测试"但不明确类型，根据上下文判断：

- 刚改了后端代码 → `unit`
- 刚改了前端组件 → `vitest`
- 刚改了网关配置 → `gateway`
- 要全面验证 → `all`
- 部署后验证 → `e2e:prod`
- 上次有失败 → `e2e:lnp` 或 `e2e:prod:lnp`

### 2. 检查环境

- `gateway` 需要容器运行（`./scripts/dev.sh start`）
- `e2e` 需要生产容器（`./scripts/dev.sh --prod`）
- `e2e:prod` 需要 `env/backend.env` 中配置 `PRODUCTION_HOST`

如果环境不满足，提示用户先准备环境。

### 3. 执行

在项目根目录执行命令。测试通常耗时较长，建议后台运行并重定向输出：

```bash
./scripts/test.sh <type> > test-results/output.log 2>&1
```

或使用 Bash 工具的 `run_in_background` 参数。

### 4. 报告结果

测试完成后：

1. 读取 `test-results/latest/` 下的 summary JSON 文件
2. 向用户汇报结果，必须包含：
   - 通过/失败数量
   - 覆盖率（如果有）
   - 失败的测试名称和原因（如果有失败）

### summary 文件

| 测试类型 | summary 文件 | 关键字段 |
|----------|-------------|----------|
| unit | `unit-summary.json` | passed, failed, coverage |
| vitest | `vitest-summary.json` | tests_passed, tests_failed |
| gateway | `gateway-summary.json` | passed, failed |
| e2e | `e2e-summary.json` | pass, fail, breaker, timeout |

## 注意事项

- 测试结果自动保存在 `test-results/<时间戳>/`，`latest` 软链接指向最新
- 自动清理超过 10 次的旧结果
- E2E 测试不重试，首次通过为标准
- 后台运行时用重定向而非 `&`，避免输出混乱
