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

- URL path: kebab-case `/user-profile`
- RESTful 风格，通过 HTTP method 区分操作
- 用 HTTP status code 表达结果，禁止在 200 响应体里自定义错误码
- `GET` 查询、`POST` 创建、`PUT` 全量更新、`PATCH` 部分更新、`DELETE` 删除

## Layered Architecture

- 调用方向：`Router → Service → Repository → Models`，每层只依赖下一层
- Router 只能调 Service，禁止直接调 Repository 或操作 Models
- Service 只能调 Repository，禁止直接写 SQLAlchemy 查询
- Repository 只能操作 Models，禁止包含业务逻辑
- 禁止跨层调用（如 Router → Repository）和反向依赖（如 Repository → Service）
- 跨领域调用：Service 可调用其他领域的 Service 或 Repository，Router 和 Repository 禁止跨领域

## Code Reuse

- 禁止重复代码：相同逻辑出现两次以上必须抽取为共享函数/模块
- 多领域共用的逻辑放 `core/`（如分页、哈希、日期处理）
- 领域内共用的逻辑放该领域目录下的独立模块
- 复用 schemas 时直接 import，不要复制字段定义

## Python Convention

- 数据模型统一使用 Pydantic BaseModel，禁止使用 dataclass
- 统一使用 async/await，禁止同步阻塞调用
- 函数必须有参数和返回值类型标注
- 导入顺序：标准库 → 第三方库 → 项目内部模块，组间空行分隔
- 业务异常使用 `core/exceptions.py` 中定义的异常类，禁止裸 `raise Exception()`

## Testing

- 测试覆盖率最低 80%
- 后端使用 pytest + pytest-asyncio，前端使用 Vitest
- Service 层必须有单元测试，覆盖正常流程和异常分支
- Router 层通过集成测试覆盖（httpx + TestClient）
- Repository 层通过 Service 测试间接覆盖
- 测试文件与源码目录结构对应：`src/app/user/service.py` → `tests/user/test_service.py`
- 每个 PR 不允许降低现有覆盖率

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
