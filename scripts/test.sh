#!/bin/bash
# 统一测试脚本
# 用法: ./scripts/test.sh <类型>
# 不加参数显示帮助，详见 ./scripts/test.sh help

set -uo pipefail
cd "$(dirname "$0")/.."

# 测试结果输出目录（按时间戳创建子文件夹）
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="test-results/$TIMESTAMP"
mkdir -p "$RESULTS_DIR"

# 失败计数器
FAILURES=0

# 从 env/backend.env 加载环境变量（跳过注释和含括号的行）
load_env() {
  if [ -f env/backend.env ]; then
    while IFS='=' read -r key value; do
      [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
      [[ "$value" =~ [\(\)] ]] && continue
      export "$key=$value" 2>/dev/null || true
    done < env/backend.env
  fi
}

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

header() {
  echo ""
  echo -e "${YELLOW}━━━ $1 ━━━${NC}"
  echo ""
}

# 运行命令并同时输出到终端和文件，返回实际退出码
run_and_log() {
  local log_file="$1"
  shift
  local exit_code=0
  "$@" 2>&1 | tee "$RESULTS_DIR/$log_file" || exit_code=${PIPESTATUS[0]}
  return $exit_code
}

# 记录耗时的包装器
run_timed() {
  local test_name="$1"
  local start_time
  start_time=$(date +%s)
  shift

  local exit_code=0
  "$@" || exit_code=$?

  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - start_time))

  # 写入耗时到对应的 summary
  local summary_file="$RESULTS_DIR/${test_name}-summary.json"
  if [ -f "$summary_file" ]; then
    # 在 JSON 末尾 } 前插入 duration 字段
    python3 -c "
import json, sys
with open('$summary_file') as f:
    d = json.load(f)
d['duration_seconds'] = $duration
d['status'] = 'pass' if $exit_code == 0 else 'fail'
with open('$summary_file', 'w') as f:
    json.dump(d, f, indent=2)
" 2>/dev/null || true
  fi

  if [ $exit_code -ne 0 ]; then
    FAILURES=$((FAILURES + 1))
    echo -e "${RED}✗ $test_name 失败 (${duration}s)${NC}"
  else
    echo -e "${GREEN}✓ $test_name 通过 (${duration}s)${NC}"
  fi
  return 0  # 不中断 all 模式
}

# ── 日志解析函数 ──

parse_pytest_summary() {
  local log_file="$RESULTS_DIR/$1"
  local output_file="$RESULTS_DIR/$2"
  local passed failed errors warnings skipped coverage
  passed=$(grep -oP '\d+(?= passed)' "$log_file" | tail -1 || echo 0)
  failed=$(grep -oP '\d+(?= failed)' "$log_file" | tail -1 || echo 0)
  errors=$(grep -oP '\d+(?= error)' "$log_file" | tail -1 || echo 0)
  warnings=$(grep -oP '\d+(?= warning)' "$log_file" | tail -1 || echo 0)
  skipped=$(grep -oP '\d+(?= skipped)' "$log_file" | tail -1 || echo 0)
  coverage=$(grep -oP 'TOTAL\s+\d+\s+\d+\s+\K\d+' "$log_file" | tail -1 || echo "")
  cat > "$output_file" <<EOF
{
  "passed": ${passed:-0},
  "failed": ${failed:-0},
  "errors": ${errors:-0},
  "skipped": ${skipped:-0},
  "warnings": ${warnings:-0},
  "coverage": "${coverage:-N/A}%"
}
EOF
}

parse_vitest_summary() {
  local log_file="$RESULTS_DIR/$1"
  local output_file="$RESULTS_DIR/$2"
  local test_files_passed test_files_failed tests_passed tests_failed
  test_files_passed=$(grep -oP '\d+(?= passed)' "$log_file" | head -1 || echo 0)
  test_files_failed=$(grep -oP '\d+(?= failed)' "$log_file" | head -1 || echo 0)
  tests_passed=$(grep -oP '\d+(?= passed)' "$log_file" | tail -1 || echo 0)
  tests_failed=$(grep -oP '\d+(?= failed)' "$log_file" | tail -1 || echo 0)
  cat > "$output_file" <<EOF
{
  "test_files_passed": ${test_files_passed:-0},
  "test_files_failed": ${test_files_failed:-0},
  "tests_passed": ${tests_passed:-0},
  "tests_failed": ${tests_failed:-0}
}
EOF
}

parse_e2e_summary() {
  local log_file="$RESULTS_DIR/$1"
  local output_file="$RESULTS_DIR/$2"
  local pass fail breaker timeout total
  pass=$(grep -oP '\d+(?= pass)' "$log_file" | tail -1 || echo 0)
  fail=$(grep -oP '\d+(?= fail)' "$log_file" | tail -1 || echo 0)
  breaker=$(grep -oP '\d+(?= breaker)' "$log_file" | tail -1 || echo 0)
  timeout=$(grep -oP '\d+(?= timeout)' "$log_file" | tail -1 || echo 0)
  total=$(grep -oP 'total: \K\d+' "$log_file" | tail -1 || echo 0)
  cat > "$output_file" <<EOF
{
  "pass": ${pass:-0},
  "fail": ${fail:-0},
  "breaker": ${breaker:-0},
  "timeout": ${timeout:-0},
  "total": ${total:-0}
}
EOF
}

# ── 测试运行函数 ──

run_unit() {
  run_and_log "unit.log" \
    uv run --project backend/api python -m pytest backend/api/tests/ -v \
    --ignore=backend/api/tests/e2e \
    --cov=api --cov-report=term-missing \
    --cov-report="html:$RESULTS_DIR/pytest-coverage"
  local rc=$?
  parse_pytest_summary "unit.log" "unit-summary.json"
  return $rc
}

run_gateway() {
  local version
  version=$(curl -sf http://localhost/api/version 2>/dev/null || echo "")
  if [ -z "$version" ]; then
    echo -e "${RED}错误: localhost 无法访问，请先启动容器${NC}"
    return 1
  fi
  load_env
  run_and_log "gateway.log" \
    uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v
  local rc=$?
  parse_pytest_summary "gateway.log" "gateway-summary.json"
  return $rc
}

run_vitest() {
  VITEST_COVERAGE_DIR="../$RESULTS_DIR/vitest-coverage" \
    run_and_log "vitest.log" \
    pnpm --prefix frontend test -- --coverage
  local rc=$?
  parse_vitest_summary "vitest.log" "vitest-summary.json"
  return $rc
}

check_prod_container() {
  local version
  version=$(curl -sf http://localhost/api/version 2>/dev/null || echo "")
  if [ -z "$version" ]; then
    echo -e "${RED}错误: localhost 无法访问，请先启动容器${NC}"
    echo "  ./scripts/dev.sh --prod  构建并启动生产容器"
    return 1
  fi
  if echo "$version" | grep -q '"frontend":"dev"'; then
    echo -e "${RED}错误: 当前运行的是开发容器（version=dev），E2E 需要生产容器${NC}"
    echo "  ./scripts/dev.sh --prod  构建并启动生产容器"
    return 1
  fi
  local fe_version
  fe_version=$(echo "$version" | python3 -c "import sys,json; print(json.load(sys.stdin).get('frontend',''))" 2>/dev/null || echo "")
  echo -e "${GREEN}✓ 生产容器已就绪 (version=$fe_version)${NC}"
}

export E2E_OUTPUT_DIR="../../$RESULTS_DIR/e2e-artifacts"
export E2E_REPORT_DIR="../../$RESULTS_DIR/e2e-report"
export E2E_RUNTIME_DIR="$(pwd)/$RESULTS_DIR/e2e-runtime"
export E2E_SIGNAL_DIR="$(pwd)/$RESULTS_DIR/e2e-signals"

run_e2e() {
  check_prod_container || return 1
  run_and_log "e2e.log" \
    pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
  local rc=$?
  parse_e2e_summary "e2e.log" "e2e-summary.json"
  return $rc
}

run_e2e_lnp() {
  check_prod_container || return 1
  LAST_NOT_PASS=1 run_and_log "e2e-lnp.log" \
    pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
  local rc=$?
  parse_e2e_summary "e2e-lnp.log" "e2e-lnp-summary.json"
  return $rc
}

run_e2e_prod() {
  load_env
  if [ -z "${PRODUCTION_HOST:-}" ]; then
    echo -e "${RED}错误: env/backend.env 中未设置 PRODUCTION_HOST${NC}"
    return 1
  fi
  TEST_ENV=production run_and_log "e2e-prod.log" \
    pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
  local rc=$?
  parse_e2e_summary "e2e-prod.log" "e2e-prod-summary.json"
  return $rc
}

run_e2e_prod_lnp() {
  load_env
  if [ -z "${PRODUCTION_HOST:-}" ]; then
    echo -e "${RED}错误: env/backend.env 中未设置 PRODUCTION_HOST${NC}"
    return 1
  fi
  LAST_NOT_PASS=1 TEST_ENV=production run_and_log "e2e-prod-lnp.log" \
    pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
  local rc=$?
  parse_e2e_summary "e2e-prod-lnp.log" "e2e-prod-lnp-summary.json"
  return $rc
}

# ── 清理旧结果（保留最近 10 次） ──
cleanup_old_results() {
  local count
  count=$(ls -d test-results/2*/  2>/dev/null | wc -l)
  if [ "$count" -gt 10 ]; then
    ls -d test-results/2*/ | head -$((count - 10)) | xargs rm -rf
    echo -e "${YELLOW}已清理 $((count - 10)) 个旧测试结果${NC}"
  fi
}

# ── 主逻辑 ──
case "${1:-}" in
  unit)
    header "后端单元测试 (pytest)"
    run_timed "unit" run_unit
    ;;
  gateway)
    header "后端网关测试 (port 80)"
    run_timed "gateway" run_gateway
    ;;
  vitest)
    header "前端单元测试 (vitest)"
    run_timed "vitest" run_vitest
    ;;
  e2e)
    header "前端 E2E (playwright)"
    run_timed "e2e" run_e2e
    ;;
  e2e:lnp)
    header "前端 E2E (LAST_NOT_PASS)"
    run_timed "e2e-lnp" run_e2e_lnp
    ;;
  e2e:prod)
    header "线上 E2E (production)"
    run_timed "e2e-prod" run_e2e_prod
    ;;
  e2e:prod:lnp)
    header "线上 E2E (production LAST_NOT_PASS)"
    run_timed "e2e-prod-lnp" run_e2e_prod_lnp
    ;;
  all)
    header "后端单元测试 (pytest)"
    run_timed "unit" run_unit
    header "前端单元测试 (vitest)"
    run_timed "vitest" run_vitest
    header "后端网关测试 (port 80)"
    run_timed "gateway" run_gateway
    header "前端 E2E (playwright)"
    run_timed "e2e" run_e2e
    ;;
  all:prod)
    header "后端单元测试 (pytest)"
    run_timed "unit" run_unit
    header "前端单元测试 (vitest)"
    run_timed "vitest" run_vitest
    header "线上 E2E (production)"
    run_timed "e2e-prod" run_e2e_prod
    ;;
  ""|help|--help|-h)
    echo "统一测试脚本"
    echo ""
    echo "用法: ./scripts/test.sh <类型>"
    echo ""
    echo "类型:"
    echo "  all          运行全部本地测试（unit+vitest+gateway+e2e）"
    echo "  all:prod     运行全部线上测试（unit+vitest+e2e:prod）"
    echo "  unit         后端单元测试 + 覆盖率 (pytest)"
    echo "  gateway      后端网关集成测试 (port 80)"
    echo "  vitest       前端单元测试 (vitest)"
    echo "  e2e          前端 E2E 本地生产容器 (playwright)"
    echo "  e2e:lnp      前端 E2E 重跑失败 (LAST_NOT_PASS)"
    echo "  e2e:prod     前端 E2E 线上生产环境"
    echo "  e2e:prod:lnp 线上 E2E 重跑失败"
    echo "  help         显示此帮助信息"
    echo ""
    echo "环境要求:"
    echo "  unit/vitest  无需容器"
    echo "  gateway      需要容器运行 (./scripts/dev.sh start)"
    echo "  e2e          需要生产容器运行 (./scripts/dev.sh --prod)"
    echo "  e2e:prod     需要线上已部署 + env/backend.env 配置 PRODUCTION_HOST"
    echo ""
    echo "测试结果保存在 test-results/<时间戳>/ 目录，latest 指向最新"
    # help 不创建结果目录，清理空目录
    rmdir "$RESULTS_DIR" 2>/dev/null || true
    exit 0
    ;;
  *)
    echo "未知类型: $1"
    echo "运行 ./scripts/test.sh help 查看帮助"
    rmdir "$RESULTS_DIR" 2>/dev/null || true
    exit 1
    ;;
esac

# 清理旧结果
cleanup_old_results

# 完成后创建 latest 软链接（确保指向完整的结果）
ln -sfn "$TIMESTAMP" test-results/latest
echo ""
echo "结果保存在 $RESULTS_DIR/"

# 返回正确的退出码
if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}━━━ $FAILURES 个测试失败 ━━━${NC}"
  exit 1
else
  echo -e "${GREEN}━━━ 全部通过 ━━━${NC}"
  exit 0
fi
