#!/bin/sh
# 开发模式入口：启动 OpenResty + 后台轮询 Lua/conf 文件变化自动 reload。

WATCH_DIRS="/usr/local/openresty/nginx/lua /etc/nginx/conf.d /usr/local/openresty/nginx/conf"
POLL_INTERVAL=2

# 计算监控目录下所有文件的校验和
get_checksum() {
  find $WATCH_DIRS -type f \( -name "*.lua" -o -name "*.conf" \) -exec md5sum {} \; 2>/dev/null | sort | md5sum
}

# 后台轮询
watch_and_reload() {
  LAST=$(get_checksum)
  while true; do
    sleep $POLL_INTERVAL
    CURRENT=$(get_checksum)
    if [ "$CURRENT" != "$LAST" ]; then
      echo "[dev-watcher] 检测到文件变化，执行 reload..."
      openresty -t 2>&1 && openresty -s reload 2>&1 || echo "[dev-watcher] 配置校验失败，跳过 reload"
      LAST=$CURRENT
    fi
  done
}

watch_and_reload &
exec openresty -g "daemon off;"
