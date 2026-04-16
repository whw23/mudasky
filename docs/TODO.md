# 待办事项

- [x] 推送未推的代码
- [x] 验证线上登录修复
- [ ] E2E 测试全覆盖
- [ ] 前端 UI 审查
- [ ] 压力测试
- [ ] Docker 镜像压缩
- [ ] 代码混淆与知识产权保护
- [x] 清理过期文档
- [x] 重启服务器 db 容器
- [x] 合并 dev 到 main
- [x] WSL 网络代理
- [x] CI 路径过滤补全

---

## ~~推送未推的代码~~

~~dev 和 main 分支的未推送 commit 已全部推送。~~

## ~~验证线上登录修复~~

~~node-forge 替换 crypto.subtle 的代码已部署。验证步骤：~~

- ~~访问 `http://REDACTED_HOST`~~
- ~~点击登录，输入 mudasky / mudasky@12321.~~
- ~~确认登录成功~~

## E2E 测试全覆盖

### 已完成

- 线上首次完整跑通：197 passed, 2 failed, 16 flaky（2026-04-16）
- 修复 `getSmsCode` 检查 HTTP 状态码
- 修复 `global-setup` 传 INTERNAL_SECRET（cookie 方式）
- gateway 限流对 `internal_secret` cookie 放行
- 后端 sms-code 接口支持 `skip_sms`（cookie 模式跳过短信发送）
- gateway 开启 gzip 压缩（首次加载提速）
- 线上环境 playwright 超时自动增大（`actionTimeout` 5s→15s, `navigationTimeout` 15s→30s）
- 修复 `navigation.spec.ts` 搜索框 `waitFor` 问题

### 待完成

- 部署 gateway + 后端改动到线上
- 补全缺失的 E2E 测试覆盖：
  - 文章详情页：`/study-abroad/[id]`、`/visa/[id]`、`/life/[id]`、`/requirements/[id]`
  - 管理员文档页：`/admin/documents`
  - 展开面板完整交互：UserExpandPanel、StudentExpandPanel、ContactExpandPanel
  - ConfigEditDialog 配置编辑弹窗
- 重跑线上 E2E 确认 0 failed, 0 skipped

## 前端 UI 审查

前端新增了 3 个页面还没有人工审查：

- 案例详情页 `/cases/[id]`
- 院校详情页 `/universities/[id]`
- 文章栏目分流（study-abroad/visa/life/requirements 各有 `[id]` 页面）

需要在浏览器中实际查看这些页面的 UI 效果。

## 清理过期文档

以下文档在功能完成后应删除（按项目规范）：

- `docs/superpowers/specs/2026-04-15-frontend-missing-features-design.md`
- `docs/superpowers/specs/2026-04-15-production-deployment-design.md`
- `docs/superpowers/plans/2026-04-15-frontend-features-and-e2e.md`
- `docs/superpowers/plans/2026-04-15-production-deployment.md`

## 重启服务器 db 容器

docker-compose.yml 已设 `TZ=Asia/Shanghai`，但 db 容器未重建，PostgreSQL timezone 仍为 UTC。需要重启 db 容器使时区生效。

```bash
ssh mudasky "cd ~/mudasky && docker compose restart db"
```

## ~~合并 dev 到 main~~

~~dev 上的所有 commit 已合并到 main 并推送：~~

- ~~gateway 版本号从 shared dict 读取~~
- ~~cleanup-registry 去掉 delete-only-untagged-versions 限制~~
- ~~CI 路径过滤补全~~
- ~~短信验证码接口支持 INTERNAL_SECRET~~

## ~~WSL 网络代理~~

~~已将 `.wslconfig` 改为 `networkingMode=mirrored`，`wsl --shutdown` 重启后验证通过：~~

- ~~WSL 内 `127.0.0.1:7897` 代理可用~~
- ~~`autoProxy=true` 自动注入 `http_proxy`/`https_proxy` 环境变量~~
- ~~git push 到 GitHub 稳定~~

## ~~CI 路径过滤补全~~

当前 paths-filter 配置：

```yaml
gateway:
  - 'gateway/**'
frontend:
  - 'frontend/**'
api:
  - 'backend/**'
db:
  - 'db/**'
```

### 问题 1：测试文件触发了不必要的构建

改测试不应触发镜像构建和部署，需要排除：

| 过滤器 | 需排除 |
|--------|--------|
| frontend | `frontend/e2e/**`、`frontend/**/*.test.*`、`frontend/vitest.config.ts`、`frontend/test-results/**` |
| api | `backend/api/tests/**` |

### 问题 2：db 过滤器过于宽泛

`db/init.sql` 是挂载的，改动不需要重新构建 db 镜像。db 构建只在 `db/Dockerfile` 改动时触发：

| 文件 | 当前行为 | 应该 |
|------|----------|------|
| `db/Dockerfile` | 触发 db 构建 ✓ | 正确 |
| `db/init.sql` | 触发 db 构建 ✗ | 只需 scp，不需要构建 |

### 问题 3：部署配置改动不触发部署

以下文件改动时应触发 deploy（scp + restart），但不触发 build：

| 文件 | 影响 |
|------|------|
| `docker-compose.yml` | 所有容器启动参数 |
| `db/init.sql` | 数据库初始化脚本 |

### 问题 4：其他不需要触发的文件

以下文件在各目录下但不影响构建：

| 文件 | 当前行为 | 应该 |
|------|----------|------|
| `frontend/CLAUDE.md`、`frontend/AGENTS.md` | 触发 frontend 构建 | 不触发 |
| `backend/api/CLAUDE.md` 等文档 | 触发 api 构建 | 不触发 |
| `docs/**` | 不触发 | 正确 |
| `.github/workflows/build.yml` | push 时自动用最新 | 不需要额外处理 |

### 预期修改

新增一个 `deploy` 过滤器，修改后的 paths-filter：

```yaml
gateway:
  - 'gateway/**'
  - '!gateway/**/*.md'
frontend:
  - 'frontend/**'
  - '!frontend/e2e/**'
  - '!frontend/**/*.test.*'
  - '!frontend/vitest.config.ts'
  - '!frontend/test-results/**'
  - '!frontend/**/*.md'
api:
  - 'backend/**'
  - '!backend/api/tests/**'
  - '!backend/**/*.md'
db:
  - 'db/Dockerfile'
deploy:
  - 'docker-compose.yml'
  - 'db/init.sql'
```

同时修改 `any` 输出和 deploy job 的条件，`deploy` 过滤器为 true 时也触发部署（scp + restart）。

## 压力测试

E2E 和安全测试完成后，进行性能/压力测试：

- 并发用户模拟（k6 / locust）
- 网关限流阈值验证（精确边界：第 N+1 次请求被拒）
- 数据库连接池压力
- 文件上传并发
- SSR 页面渲染在高并发下的表现
- 长时间运行稳定性（内存泄漏检测）

## Docker 镜像压缩

- 多阶段构建优化（builder → runner 分离）
- 清理构建缓存和不必要的依赖
- 使用 Alpine 基础镜像
- 镜像层合并减少层数
- 评估 distroless 基础镜像

## 代码混淆与知识产权保护

面向客户交付的 Docker 镜像，所有层的代码都需要保护：

| 层 | 语言 | 保护方案 |
|----|------|----------|
| Frontend | JS/TS | Next.js 生产构建混淆 + 不含 source map |
| Backend | Python | pyc 编译 + pyarmor/cython 混淆 + 删除 .py 源文件 |
| Gateway | Lua | luac 编译 + 混淆 + 删除 .lua 源文件 |
| Database | SQL | init.sql 最小化，敏感逻辑移到后端 |

其他措施：

- Docker 镜像不含 .git、docs、tests 等开发文件
- 环境变量注入敏感配置（密钥、连接串），不硬编码
- 评估 Docker 镜像加密方案（registry 级别）
- 客户拿到的镜像只有运行时产物，无源码
