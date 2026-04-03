## Code Style

- JS/JSX/TS/Lua: 2 spaces
- Python: 4 spaces
- All files: LF line endings

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

## Python Convention

- 数据模型统一使用 Pydantic BaseModel，禁止使用 dataclass
- 统一使用 async/await，禁止同步阻塞调用

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
