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
- [ ] 部署 dev 到 main（含 gzip/内部密钥/种子用户/E2E 框架）
- [ ] 压力测试
- [ ] 对接阿里云短信服务
- [ ] Docker 镜像压缩
- [ ] 代码混淆与知识产权保护
- [ ] GitHub Secrets 管理 env 密钥（含 SMS AccessKey）
- [ ] GitHub 转公开仓库（转公开前处理敏感信息）

---

## ~~前端 UI 审查~~

~~已完成。审查中发现并修复了 bug：未登录用户直接 URL 访问公开页面被重定向首页（auth 拦截器对 ACCESS_TOKEN_MISSING 触发了不必要的 refresh + 重定向）。~~

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

## GitHub Secrets 管理 env 密钥

将 `env/` 目录下的密钥（`backend.env`、`gateway.env`）迁移到 GitHub Secrets 管理：

- CI/CD 中从 Secrets 注入环境变量，不再依赖本地 env 文件
- 本地开发用 `.env.example` 模板 + 实际值不入库
- 服务器部署时 Secrets 通过 SSH 写入 `.env` 文件

## GitHub 转公开仓库

转公开前需处理的敏感信息：

- 清理 git 历史中的密钥（`env/` 目录、INTERNAL_SECRET 等）
- 确认 `.gitignore` 排除所有敏感文件
- 检查代码中是否有硬编码的 IP、密码、密钥
- 添加 LICENSE 文件
- 审查 CLAUDE.md 和 rules 中是否有不宜公开的内容

## 对接阿里云短信服务

当前 `backend/shared/app/sms/__init__.py` 是存根实现（只打日志不发真短信）。需要：

- 对接阿里云短信 SDK（`alibabacloud-dysmsapi`）
- 配置签名、模板 ID
- AccessKey 通过环境变量注入（后续由 GitHub Secrets 管理）
- 保留 DEBUG 模式跳过发送的逻辑
