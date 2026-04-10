#!/bin/sh
# 轮询监听文件变化，检测到变化后 touch 文件触发 inotify 通知 Turbopack
# 用于 Docker 卷挂载（Windows/Mac → Linux）场景

WATCH_DIR="/app"
INTERVAL="${WATCH_POLL_INTERVAL:-1}"
HASH_FILE="/tmp/.watch-hash"

# 计算源码文件的 mtime 指纹
calc_hash() {
  find "$WATCH_DIR" \
    -path "$WATCH_DIR/node_modules" -prune -o \
    -path "$WATCH_DIR/.next" -prune -o \
    \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.json" \) \
    -newer "$HASH_FILE" \
    -print 2>/dev/null
}

# 初始化时间戳文件
touch "$HASH_FILE"

echo "[dev-watch] 开始监听文件变化 (间隔: ${INTERVAL}s)"

while true; do
  sleep "$INTERVAL"
  CHANGED=$(calc_hash)
  if [ -n "$CHANGED" ]; then
    # touch 变化的文件触发 inotify
    echo "$CHANGED" | while IFS= read -r file; do
      touch "$file" 2>/dev/null
    done
    # 更新时间戳
    touch "$HASH_FILE"
    echo "[dev-watch] 检测到变化，已通知"
  fi
done
