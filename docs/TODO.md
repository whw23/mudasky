# 待办事项

- [x] 推送未推的代码
- [x] 验证线上登录修复
- [x] E2E 测试全覆盖
- [x] 清理过期文档
- [x] 重启服务器 db 容器
- [x] 合并 dev 到 main
- [x] WSL 网络代理
- [x] CI 路径过滤补全
- [x] 前端 UI 审查
- [x] 部署 dev 到 main（含 gzip/内部密钥/种子用户/E2E 框架）
- [x] 对接阿里云短信服务
- [x] Docker 镜像压缩
- [x] 代码混淆与知识产权保护
- [x] GitHub Secrets 管理 env 密钥（含 SMS AccessKey）
- [x] GitHub 转公开仓库（转公开前处理敏感信息）
- [ ] E2E 架构优化：信号文件改 SQLite
- [ ] E2E 架构优化：关键任务重试 + 级联熔断收窄
- [ ] E2E 架构优化：W1 任务拆分到空闲 worker
- [ ] 首页性能：config 请求延迟加载（phone_country_codes / panel-config）
- [x] 权限树重构：PermissionTree 从后端 permission_tree API 获取层级数据，替代 OpenAPI + 硬编码
- [ ] 角色分配换 shadcn Select（当前 E2E 操作不稳定，已回退原生 select）
- [ ] 压力测试

---

## E2E 架构优化：信号文件改 SQLite

当前跨 worker 协调靠 `/tmp/e2e-signals/` 文件读写，7 worker 每 2 秒轮询。改为 SQLite：

- 原子事务替代文件 `wx` flag
- 前置条件检查从读 N 个文件变为一条 SQL
- 任务抢占用事务保证
- 轮询间隔可缩短到 200ms（WAL 模式并发读）
- 调试时可直接查库看所有任务状态

## E2E 架构优化：关键任务重试 + 级联熔断收窄

当前一个任务失败会级联 50+ breaker（如 W1 角色分配失败 → 4 个 worker 全部 breaker）。优化：

- 关键任务（角色分配、reload_auth）失败后自动重试 1 次
- 熔断只传播直接依赖，不递归（减少 breaker 范围）

## E2E 架构优化：W1 任务拆分到空闲 worker

W1 有 42 个任务，其他 worker 做完后在空转等 W1。可以把 CRUD 验证任务（分类/文章/案例/院校）拆给 W5（content_admin），W1 专注角色分配和管理功能。

## 首页性能：config 请求延迟加载

已完成 6→1 合并（/config/all）。剩余优化：

- `phone_country_codes`：已移到 PhoneInput 按需加载
- `panel-config`：已移到面板 layout 按需加载
- 可进一步加 `Cache-Control: public, max-age=3600` 到 config 接口

## 角色分配换 shadcn Select

base-ui 的 Select 组件在 E2E 中操作不稳定（trigger 显示 UUID、option click 不生效）。已回退到原生 `<select>` + native setter。待 base-ui Select API 稳定后重新尝试。

## 压力测试

E2E 和安全测试完成后，进行性能/压力测试：

- 并发用户模拟（k6 / locust）
- 网关限流阈值验证（精确边界：第 N+1 次请求被拒）
- 数据库连接池压力
- 文件上传并发
- SSR 页面渲染在高并发下的表现
- 长时间运行稳定性（内存泄漏检测）
