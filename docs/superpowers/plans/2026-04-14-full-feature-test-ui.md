# 全站功能补全 + E2E 测试 + UI 美化 实施计划

## 总目标

补全所有后端已有但前端缺失的功能入口，升级编辑器，实现所见即所得编辑，全量 E2E 测试覆盖，UI 审查美化。

---

## Phase 1: 管理后台补全

### 1.1 侧边栏扩展 ✅
- AdminSidebar 加入文章/分类/院校/案例管理入口（已完成）

### 1.2 PanelGuard 路由白名单
- `PANEL_ROUTES.admin` 加入 `categories`、`universities`、`cases`
- `PANEL_ROUTES.portal` 加入 `articles`

### 1.3 新建管理页面
- `frontend/app/[locale]/[panel]/categories/page.tsx` — 分类管理（复用 CategoryTable + CategoryDialog）
- `frontend/app/[locale]/[panel]/universities/page.tsx` — 院校管理（复用 UniversityTable + UniversityDialog）
- `frontend/app/[locale]/[panel]/cases/page.tsx` — 成功案例管理（复用 CaseTable + CaseDialog）

### 1.4 文章管理仅在 admin
- 文章是教育网站内容，由管理员管理，不在 portal 中
- admin 端用 ArticleTable 展示所有文章 + 创建/编辑/发布/删除
- 从 PanelGuard 的 portal 路由中移除 articles
- 从 UserSidebar 中移除文章入口（如果有的话）

---

## Phase 2: 文章编辑器升级

### 2.1 Markdown 编辑器（已完成）
- `@uiw/react-md-editor`（MIT，支持源码/预览/分屏切换）
- 替换 TiptapEditor

### 2.2 文件类型支持
- 文章类型：`markdown`（默认）、`file`（上传文件）
- 支持上传 Office 文档（.doc/.docx/.xls/.xlsx/.ppt/.pptx）和 PDF
- 上传后存储为文章附件，公开页面提供在线预览/下载
- PDF 预览：浏览器内嵌 `<iframe>` 或 `<embed>`
- Office 预览：使用微软 Office Online Viewer（`https://view.officeapps.live.com/op/embed.aspx?src=`）或本地方案

### 2.3 文章详情页渲染
- Markdown 类型：`react-markdown` 渲染
- 文件类型：内嵌预览器 + 下载按钮

---

## Phase 3: 管理后台所见即所得

### 3.1 网站设置（web-settings）
- 已有 EditableOverlay 组件和预览容器
- 确认现有实现是否完整，补全缺失的编辑功能

### 3.2 公开页面图片/内容可修改
- Banner 图片、首页各板块图片等由后台配置管理
- 配置存储在 `site_info` 或独立的 config key 中
- 管理后台提供图片上传 + 预览

---

## Phase 4: 公开院校页搜索/筛选

### 4.1 搜索框
- 院校列表页顶部加搜索输入框
- 调用后端 `search` 参数

### 4.2 国家筛选
- 调用 `/public/university/countries` 获取国家列表
- 下拉选择器筛选

### 4.3 专业筛选（可选）
- `program` 参数筛选

---

## Phase 5: UI 审查美化

### 5.1 截图每个页面
- 使用 Playwright 截图所有页面
- 逐页审查布局、间距、颜色、一致性

### 5.2 修复问题
- 对齐不一致、间距过大/过小
- 颜色/字体不统一
- 响应式问题
- 空状态提示缺失

---

## Phase 6: 全量 E2E 测试

### 6.1 认证流程
- 手机验证码登录（正向 + 错误验证码）
- 账号密码登录（正向 + 错误密码 + 2FA 流程）
- 注册（正向 + 手机号已存在）
- 登出（验证 cookie 清除，刷新不再登录）

### 6.2 用户中心
- 个人资料编辑（用户名修改、手机号修改）
- 密码修改
- 2FA 启用/禁用
- 会话管理（踢出设备）
- 文档上传/下载/删除
- 文章创建/编辑/删除
- 注销账号

### 6.3 管理后台
- 用户管理：行内展开面板、状态切换、角色分配、密码重置、删除用户
- 角色管理：CRUD、权限分配
- 文章管理：列表、发布/取消、置顶、删除
- 分类管理：CRUD
- 院校管理：CRUD
- 案例管理：CRUD
- 通用设置：国家码编辑
- 网站设置：品牌编辑

### 6.4 越权测试
- 未登录访问 portal/admin → 重定向
- 普通用户访问 admin → 重定向
- 普通用户直接调用 admin API → 401/403
- 用户操作其他用户的文章/文档 → 403

### 6.5 公开页面深度测试
- 导航栏交互（每个链接可达）
- 院校搜索/筛选
- 文章列表/详情
- 多语言切换

---

## Phase 7: 提交并推送

- 按功能分 commit
- push 到 dev 分支
