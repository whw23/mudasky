#!/bin/sh
# 前端开发入口：清理旧缓存后启动 Next.js dev server (Turbopack)
# 限制 Node.js 堆内存为 768MB，防止 dev 模式编译缓存无限增长
export NODE_OPTIONS="--max-old-space-size=1536"
rm -rf .next
pnpm install --frozen-lockfile
exec pnpm dev
