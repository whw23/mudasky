## Code Style

- JS/JSX/TS/Lua: 2 spaces
- Python: 4 spaces
- All files: LF line endings
- 单文件最大 300 行代码，超过则拆分
- 单函数最大 50 行代码，超过则拆分

## Naming Convention

| Language | 变量/函数  | 类         | 常量        |
|----------|------------|------------|-------------|
| Python   | snake_case | PascalCase | UPPER_SNAKE |
| JS/TS    | camelCase  | PascalCase | UPPER_SNAKE |
| Lua      | snake_case | —          | UPPER_SNAKE |

### File / Directory

| Type               | Style      | Example              |
|--------------------|------------|----------------------|
| Python module      | snake_case | `user_service.py`    |
| JS/TS module       | kebab-case | `user-service.ts`    |
| React component    | PascalCase | `UserProfile.tsx`    |
| Directory          | kebab-case | `user-profile/`      |

### React Component

- 文件名与组件名一致：`UserProfile.tsx` → `export function UserProfile`
- 一个文件一个组件

### Database

| Type   | Style      | Example          |
|--------|------------|------------------|
| Table  | snake_case | `user_profile`   |
| Column | snake_case | `created_at`     |

### API Route

- 层级依赖结构：`/api/{panel}/{resource}/list/detail/edit`，子路径依赖父路径
- 四类路径前缀：`/api/auth/*`（认证）、`/api/public/*`（公开）、`/api/admin/*`（管理）、`/api/portal/*`（用户面板）
- URL 路径完全静态，不含动态参数（ID/key 等）
- GET 请求 ID 通过 query param 传递，POST 请求 ID 通过 body 传递
- 读操作用 `GET`，写操作用 `POST`
- URL path: kebab-case
- 用 HTTP status code 表达结果，禁止在 200 响应体里自定义错误码
- 权限码 = URL 路径（去掉 /api/ 前缀），网关自动匹配，后端不做权限校验
- 每个 `__init__.py` 导出 `description`（中文名），用于权限树和 OpenAPI

## Layered Architecture

- 调用方向：`Router(api) → Service(api) → Repository(shared) → Models(shared)`
- Router 只能调 Service，禁止直接调 Repository 或操作 Models
- Service 只能调 Repository，禁止直接写 SQLAlchemy 查询
- Repository 只能操作 Models，禁止包含业务逻辑
- 禁止跨层调用和反向依赖
- 禁止跨面板调用 Service，共享逻辑通过 Repository 层
- Service 不引用 Schemas，接收/返回原始数据类型

## Code Reuse

- 禁止重复代码：相同逻辑出现两次以上必须抽取为共享函数/模块
- API 层共用逻辑放 `api/core/`（如分页、缓存、依赖注入）
- 数据层共用逻辑放 `shared/app/core/` 或 `shared/app/utils/`
- Schemas 按面板独立定义，不跨面板共享

## Python Convention

- 数据模型统一使用 Pydantic BaseModel，禁止使用 dataclass
- 统一使用 async/await，禁止同步阻塞调用
- 函数必须有参数和返回值类型标注
- 导入顺序：标准库 → 第三方库 → 项目内部模块，组间空行分隔
- 业务异常使用 `core/exceptions.py` 中定义的异常类，禁止裸 `raise Exception()`

## Comment Style

| Language | 文档注释   | 行内注释 |
|----------|-----------|---------|
| Python   | docstring | `#`     |
| JS/TS    | JSDoc     | `//`    |
| Lua      | LuaDoc    | `--`    |

- 所有函数、类（对象）、文件头部必须写文档注释
- 所有注释必须使用中文
- 行内注释只在逻辑不自明时使用

## Formatter & Linter

| Language      | Formatter    | Linter       |
|---------------|--------------|--------------|
| Python        | Black        | —            |
| JS/TS/JSX/TSX | Prettier     | ESLint       |
| Markdown      | markdownlint | markdownlint |
