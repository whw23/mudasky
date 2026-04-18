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
- [x] 权限树重构：PermissionTree 从后端 API 获取层级数据
- [x] 所有原生 select 换 shadcn Select + confirm 换 AlertDialog
- [x] 首页性能：config 请求合并（6→1）+ countryCodes/panelConfig 按需加载
- [x] Token 即时撤销（X-Revoke-User + gateway 黑名单）
- [ ] 网页设置所见即所得：E2E CRUD 选择器调试（11 个任务待修）
- [ ] E2E 架构优化：信号文件改 SQLite
- [ ] E2E 架构优化：关键任务重试 + 级联熔断收窄
- [ ] E2E 架构优化：W1 任务拆分到空闲 worker
- [ ] 压力测试

---

## 网页设置所见即所得：E2E CRUD 选择器调试

后端路由迁移 + 前端预览组件已完成，但 E2E 的 admin-crud.ts 中 11 个任务需要用 Playwright MCP 调试 DOM 选择器：

- 分类创建/删除（NavEditor 的增删操作）
- 文章创建/编辑/删除（ArticleListPreview 中操作）
- 院校/案例编辑/删除（hover 后编辑按钮）

设计文档：`docs/superpowers/specs/2026-04-18-wysiwyg-web-settings-design.md`

## E2E 架构优化：信号文件改 SQLite

当前跨 worker 协调靠文件读写，7 worker 每 2 秒轮询。改为 SQLite：

- 原子事务替代文件 `wx` flag
- 前置条件检查从读 N 个文件变为一条 SQL
- 轮询间隔可缩短到 200ms（WAL 模式并发读）

## E2E 架构优化：关键任务重试 + 级联熔断收窄

一个任务失败会级联 50+ breaker。优化：

- 关键任务失败后自动重试 1 次
- 熔断只传播直接依赖，不递归

## E2E 架构优化：W1 任务拆分到空闲 worker

W1 有 42 个任务，其他 worker 做完后在空转。CRUD 验证任务可拆给 W5。

## 压力测试

- 并发用户模拟（k6 / locust）
- 网关限流阈值验证
- 数据库连接池压力
- 文件上传并发
- SSR 页面渲染在高并发下的表现
- 长时间运行稳定性（内存泄漏检测）
