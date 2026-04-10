#!/bin/sh
# 前端开发入口：同时启动 Turbopack 和文件变化监听脚本

# 后台启动文件监听
sh /app/dev-watch.sh &

# 前台启动 Next.js dev server (Turbopack)
exec pnpm dev
