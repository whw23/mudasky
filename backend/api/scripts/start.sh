#!/bin/bash
# 后端容器启动脚本：先执行数据库迁移，再启动应用
set -e
echo "执行数据库迁移..."
alembic upgrade head
echo "启动应用..."
exec uvicorn api.main:app --host 0.0.0.0 --port 8000
