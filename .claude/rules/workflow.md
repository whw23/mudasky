## 工作流规范

### API 缓存策略

新增 GET 接口时必须评估 HTTP 缓存策略：

- 公开 + 静态数据 → `Cache-Control: public, max-age=N` + ETag
- 认证 + 少变数据 → `Cache-Control: private, max-age=N` + ETag
- 用户私有/高频变化 → 不缓存

### 直接操作数据库

通过 psql 直接修改数据时，必须同时更新 `updated_at` 字段（`SET updated_at = NOW()`），否则 ETag 缓存不会失效，API 会继续返回 304。

### 初始化数据与占位符同步

修改初始化种子数据（`seed_config.py`）时，必须同步更新以下位置：

- 前端翻译文件（`messages/*.json`）中对应的兜底/占位文本
- 前端代码中硬编码的默认值（如 `ConfigContext.tsx` 的 `DEFAULT_SITE_INFO`）
- 已运行的数据库（通过 psql 更新，带 `updated_at = NOW()`）

三处必须保持一致，避免初始化数据与占位符不匹配。

### 文档提交

docs/ 目录下的文档（设计文档、实施计划等）必须始终提交到 git，完成后立即提交，不要遗漏。

### 前端调试

开发过程中使用 Chrome DevTools MCP 连接浏览器进行实时调试和验证。修改前端代码后，主动导航到相关页面，截图或检查 DOM，确认改动效果符合预期。
