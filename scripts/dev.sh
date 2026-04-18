#!/bin/bash
# 开发环境管理脚本
# 用法: ./scripts/dev.sh <选项>
# 不加参数显示帮助，详见 ./scripts/dev.sh --help

set -e

cd "$(dirname "$0")/.."

case "${1:-}" in
  start)
    echo "构建并启动开发环境..."
    docker compose down
    docker compose build --pull
    docker image prune -f
    docker compose up
    ;;
  --clean)
    echo "停止容器并清理数据卷..."
    docker compose down -v
    echo "重新构建并启动..."
    docker compose build --pull
    docker image prune -f
    docker compose up
    ;;
  --down)
    echo "停止并移除容器..."
    docker compose down
    ;;
  --logs)
    docker compose logs -f "${2:-}"
    ;;
  --prod)
    echo "构建并启动生产容器（E2E 测试用）..."
    docker compose down
    docker build -t ghcr.io/whw23/mudasky-gateway:latest ./gateway
    docker build -t ghcr.io/whw23/mudasky-api:latest -f backend/api/Dockerfile ./backend
    docker build -t ghcr.io/whw23/mudasky-frontend:latest ./frontend
    docker compose -f docker-compose.yml up -d
    echo "生产容器已启动，可运行 ./scripts/test.sh e2e"
    ;;
  ""|--help|-h)
    echo "开发环境管理脚本"
    echo ""
    echo "用法: ./scripts/dev.sh <选项>"
    echo ""
    echo "选项:"
    echo "  start   构建并启动开发环境（自动 rebuild）"
    echo "  --clean 清理数据卷后重新启动（重置数据库）"
    echo "  --down  停止并移除容器"
    echo "  --logs  查看实时日志（可指定服务名：--logs api）"
    echo "  --prod  构建并启动生产容器（E2E 测试用）"
    ;;
  *)
    echo "未知选项: $1"
    echo "运行 ./scripts/dev.sh --help 查看帮助"
    exit 1
    ;;
esac
