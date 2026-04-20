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
- [ ] 图片上传按钮点不开（Dialog Portal 事件问题）
- [ ] 首页 Hero 和 header 遮挡关系修复
- [ ] Banner 编辑恢复 EditableOverlay 交互模式
- [ ] 学科分类管理 UI 入口
- [ ] E2E API 覆盖率补全（当前 57/94 = 60.6%）
- [ ] 压力测试

---

## 图片上传按钮点不开

[高优先级] Dialog Portal 内 hidden file input 的 `.click()` 失效，所有上传功能不可用。

影响范围：
- BannerImageEditor（Banner 背景图上传）
- UniversityEditDialog（Logo 上传、院校图片上传）
- CaseEditDialog（头像上传、录取通知书上传）
- ConfigEditDialog（Logo/favicon/微信二维码上传）

根因：@base-ui/react Dialog 使用 Portal 渲染，hidden file input 在 Portal 内可能无法正确接收 `.click()` 事件。可能需要把 file input 移到 Portal 外部，或换用 `<label htmlFor>` 方式触发。

## 首页 Hero 和 header 遮挡关系

[高优先级] header 应透明固定覆盖在 Hero 上方，Hero 从页面顶部开始占 100vh。当前 Hero 从 header 下方开始，导致底部超出视口。

修改点：
- header 改为 `position: fixed` + 透明背景（滚动后变不透明）
- Banner 组件 `large` 模式时从页面顶部开始（含 header 区域）
- 内容区域加 `padding-top` 等于 header 高度

## Banner 编辑恢复 EditableOverlay 交互模式

[中优先级] 当前 BannerImageEditor 作为独立组件插在导航栏下方，与其他配置编辑方式不一致。应改为：点击 Banner 预览区域弹出编辑弹窗（和编辑 Hero 标题/副标题一样的 EditableOverlay 模式），弹窗内包含图片上传管理。

## 学科分类管理 UI 入口

[中优先级] 后端 API 已有（admin/web-settings/disciplines CRUD），需要在院校管理 tab 下添加学科分类管理的前端 UI。包括：大分类 CRUD + 学科 CRUD + 为院校关联学科。

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
