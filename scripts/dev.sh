#!/bin/bash
# 开发环境管理脚本
#
# 用法:
#   ./scripts/dev.sh          启动开发环境（自动 rebuild）
#   ./scripts/dev.sh --clean  清理数据卷后重新启动
#   ./scripts/dev.sh --down   停止并移除容器
#   ./scripts/dev.sh --logs   查看实时日志

set -e

cd "$(dirname "$0")/.."

case "${1:-}" in
  --clean)
    echo "停止容器并清理数据卷..."
    docker compose down -v
    echo "重新构建并启动..."
    docker compose up --build
    ;;
  --down)
    echo "停止并移除容器..."
    docker compose down
    ;;
  --logs)
    docker compose logs -f "${2:-}"
    ;;
  "")
    echo "构建并启动开发环境..."
    docker compose up --build
    ;;
  *)
    echo "用法: $0 [--clean|--down|--logs [服务名]]"
    exit 1
    ;;
esac
