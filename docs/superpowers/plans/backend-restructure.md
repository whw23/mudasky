# 后端架构重构：shared → api 分层

## 目标

将 router + service + schemas 从 `backend/shared/` 移到 `backend/api/`，让 shared 只保留纯数据层代码。

## 当前结构（错误）

```
shared/src/app/
├── {domain}/
│   ├── models.py      # ORM 模型
│   ├── schemas.py     # Pydantic 模型（应在 api）
│   ├── repository.py  # 数据访问层
│   ├── service.py     # 业务逻辑（应在 api）
│   └── router.py      # 路由层（应在 api）
```

## 目标结构

```
shared/src/app/
├── {domain}/
│   ├── models.py      # ORM 模型
│   └── repository.py  # 数据访问层
├── core/              # 基础设施（database, config, crypto...）
└── worker/            # 任务队列

api/src/api/
├── {domain}/
│   ├── schemas.py     # API 请求/响应模型
│   ├── service.py     # 业务逻辑
│   └── router.py      # 路由层
└── main.py            # FastAPI 入口
```

## 影响范围

- 移动文件：~30 个（9 个领域 × 3 文件 + admin_router）
- Import 修改：~100+ 处
- 测试文件 import 同步修改
- Docker 构建配置可能需要调整

## 注意事项

- api 包名是 `api`，shared 包名是 `app`
- api 下文件引用 shared 的 models/repository 用 `from app.xxx import`
- api 下文件互相引用用 `from api.xxx import`
- 需要确认 Dockerfile 的 PYTHONPATH 包含两个包
