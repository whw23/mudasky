#!/bin/sh
# 开发模式入口：启动 OpenResty + inotify 监听 Lua/conf 文件变化自动 reload。

# 安装 inotify-tools（仅开发环境需要）
if ! command -v inotifywait >/dev/null 2>&1; then
  apk add --no-cache inotify-tools >/dev/null 2>&1
fi

WATCH_DIRS="/usr/local/openresty/nginx/lua /etc/nginx/conf.d /usr/local/openresty/nginx/conf"

watch_and_reload() {
  # 使用 inotifywait 监听文件变化（WSL2 原生文件系统支持 inotify）
  inotifywait -m -r -e modify,create,delete --include '\.(lua|conf)$' $WATCH_DIRS 2>/dev/null |
  while read -r _dir _event _file; do
    echo "[dev-watcher] 检测到文件变化: $_file ($_event)，执行 reload..."
    openresty -t 2>&1 && openresty -s reload 2>&1 || echo "[dev-watcher] 配置校验失败，跳过 reload"
  done
}

watch_and_reload &
exec openresty -g "daemon off;"
