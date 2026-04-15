#!/bin/sh
# 前端开发入口：清理旧缓存后启动 Next.js dev server (Turbopack)
rm -rf .next
pnpm install --frozen-lockfile
exec pnpm dev
