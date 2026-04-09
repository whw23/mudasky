#!/bin/bash
# 后端容器启动脚本：先执行数据库迁移，再启动应用
set -e
echo "执行数据库迁移..."
alembic upgrade head
echo "初始化超级管理员..."
python -m scripts.init_superuser
echo "启动应用..."
UVICORN_ARGS="--host 0.0.0.0 --port 8000"
if [ "$DEBUG" = "true" ]; then
  UVICORN_ARGS="$UVICORN_ARGS --reload"
fi
exec uvicorn api.main:app $UVICORN_ARGS
