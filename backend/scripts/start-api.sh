#!/bin/bash
# 后端容器启动脚本：初始化数据 + 启动应用
set -e

if [ "$DEBUG" = "true" ]; then
  pip install --no-deps -e /app/shared -e /app/api > /dev/null 2>&1
fi

echo "初始化系统数据..."
python -m scripts.init
echo "启动应用..."

UVICORN_ARGS="--host 0.0.0.0 --port 8000"
if [ "$DEBUG" = "true" ]; then
  UVICORN_ARGS="$UVICORN_ARGS --reload --reload-dir /app/shared/app --reload-dir /app/api/api"
fi
exec uvicorn api.main:app $UVICORN_ARGS
