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
- [x] 网页设置所见即所得：E2E CRUD 选择器修复
- [x] E2E 架构优化：W1 改为自注册账号 + 清理所有 worker 账号
- [x] E2E 架构优化：信号文件改 SQLite
- [x] E2E 架构优化：W1 任务拆分到空闲 worker（backupWorkers）
- [x] E2E 覆盖率动态扫描（API 端点 + 前端路由）
- [x] 登录状态丢失修复（ACCESS_TOKEN_MISSING 续签 + bfcache/popstate）
- [x] CI/CD 构建并行化 + 单元测试 job + E2E 测试 job
- [x] 图片上传按钮点不开（Dialog Portal 事件问题）
- [x] 首页 Hero 和 header 遮挡关系修复
- [x] Banner 编辑恢复 EditableOverlay 交互模式
- [x] 学科分类管理 UI 入口
- [x] Excel 导入导出 + 院校专业模型改造
- [x] 网页设置字段级编辑改造
- [x] 文档上传文件类型白名单（前后端双重校验）
- [x] 图片上传自动转 WebP（quality=95）
- [x] Token 续签修复（去掉 refresh token 轮换 + page_guard 放行续签）
- [x] Favicon 动态设置（FaviconHead 组件 + 通用配置页 UI 重构）
- [ ] E2E API 覆盖率补全（当前 57/94 = 60.6%）
- [ ] 压力测试

---

## E2E API 覆盖率补全

当前 API 覆盖率 57/94（60.6%），37 个端点未被 E2E 测试触发。覆盖率基于 Playwright response 拦截实际 API 调用。

未覆盖端点分类：

- auth: register, refresh-token-hash
- public: config/{key}, content/article/{id}, cases, universities 相关
- admin: users 管理操作、roles 详情/排序、settings 编辑、students 分配/降级/文档、contacts 升级
- portal: profile meta/phone/delete、sessions revoke、2fa totp、documents 详情/下载
- 基础设施: health, version, meta/routes

## 压力测试

- 并发用户模拟（k6 / locust）
- 网关限流阈值验证
- 数据库连接池压力
- 文件上传并发
- SSR 页面渲染在高并发下的表现
- 长时间运行稳定性（内存泄漏检测）
