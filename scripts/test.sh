#!/bin/bash
# 统一测试脚本
# 用法: ./scripts/test.sh <类型>
# 不加参数显示帮助，详见 ./scripts/test.sh help

set -euo pipefail
cd "$(dirname "$0")/.."

# 测试结果输出目录（按时间戳创建子文件夹）
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="test-results/$TIMESTAMP"
mkdir -p "$RESULTS_DIR"
# 创建 latest 软链接方便查看最新结果
ln -sfn "$TIMESTAMP" test-results/latest

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

# 运行命令并同时输出到终端和文件（允许非零退出码）
run_and_log() {
  local log_file="$1"
  shift
  "$@" 2>&1 | tee "$RESULTS_DIR/$log_file" || true
}

# 从 pytest 日志提取摘要并写入 JSON
parse_pytest_summary() {
  local log_file="$RESULTS_DIR/$1"
  local output_file="$RESULTS_DIR/$2"
  local passed failed errors warnings coverage
  # 解析 "X passed, Y failed, Z errors, W warnings"
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

# 从 vitest 日志提取摘要
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

# 从 E2E 日志提取摘要
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

# 后端单元测试
run_unit() {
  header "后端单元测试 (pytest)"
  run_and_log "unit.log" \
    uv run --project backend/api python -m pytest backend/api/tests/ -v \
    --ignore=backend/api/tests/e2e \
    --cov=api --cov-report=term-missing \
    --cov-report="html:$RESULTS_DIR/pytest-coverage"
  parse_pytest_summary "unit.log" "unit-summary.json"
}

# 后端网关集成测试
run_gateway() {
  header "后端网关测试 (port 80)"
  local version
  version=$(curl -sf http://localhost/api/version 2>/dev/null || echo "")
  if [ -z "$version" ]; then
    echo -e "${RED}错误: localhost 无法访问，请先启动容器${NC}"
    exit 1
  fi
  load_env
  run_and_log "gateway.log" \
    uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v
  parse_pytest_summary "gateway.log" "gateway-summary.json"
}

# 前端单元测试
run_vitest() {
  header "前端单元测试 (vitest)"
  VITEST_COVERAGE_DIR="../$RESULTS_DIR/vitest-coverage" \
    run_and_log "vitest.log" \
    pnpm --prefix frontend test -- --coverage
  parse_vitest_summary "vitest.log" "vitest-summary.json"
}

# 检查本地容器是否为生产构建
check_prod_container() {
  local version
  version=$(curl -sf http://localhost/api/version 2>/dev/null || echo "")
  if [ -z "$version" ]; then
    echo -e "${RED}错误: localhost 无法访问，请先启动容器${NC}"
    echo "  ./scripts/dev.sh --prod  构建并启动生产容器"
    exit 1
  fi
  if echo "$version" | grep -q '"frontend":"dev"'; then
    echo -e "${RED}错误: 当前运行的是开发容器（version=dev），E2E 需要生产容器${NC}"
    echo "  ./scripts/dev.sh --prod  构建并启动生产容器"
    exit 1
  fi
  local fe_version
  fe_version=$(echo "$version" | python3 -c "import sys,json; print(json.load(sys.stdin).get('frontend',''))" 2>/dev/null || echo "")
  echo -e "${GREEN}✓ 生产容器已就绪 (version=$fe_version)${NC}"
}

# E2E 公共环境变量（Playwright 输出到当前时间戳目录）
export E2E_OUTPUT_DIR="../../$RESULTS_DIR/e2e-artifacts"
export E2E_REPORT_DIR="../../$RESULTS_DIR/e2e-report"

# 前端 E2E
run_e2e() {
  header "前端 E2E (playwright)"
  check_prod_container
  run_and_log "e2e.log" \
    pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
  parse_e2e_summary "e2e.log" "e2e-summary.json"
}

# 前端 E2E (LAST_NOT_PASS)
run_e2e_lnp() {
  header "前端 E2E (LAST_NOT_PASS)"
  check_prod_container
  LAST_NOT_PASS=1 run_and_log "e2e-lnp.log" \
    pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
  parse_e2e_summary "e2e-lnp.log" "e2e-lnp-summary.json"
}

# 线上 E2E
run_e2e_prod() {
  header "线上 E2E (production)"
  load_env
  if [ -z "${PRODUCTION_HOST:-}" ]; then
    echo -e "${RED}错误: env/backend.env 中未设置 PRODUCTION_HOST${NC}"
    exit 1
  fi
  TEST_ENV=production run_and_log "e2e-prod.log" \
    pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
  parse_e2e_summary "e2e-prod.log" "e2e-prod-summary.json"
}

# 线上 E2E (LAST_NOT_PASS)
run_e2e_prod_lnp() {
  header "线上 E2E (production LAST_NOT_PASS)"
  load_env
  if [ -z "${PRODUCTION_HOST:-}" ]; then
    echo -e "${RED}错误: env/backend.env 中未设置 PRODUCTION_HOST${NC}"
    exit 1
  fi
  LAST_NOT_PASS=1 TEST_ENV=production run_and_log "e2e-prod-lnp.log" \
    pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
  parse_e2e_summary "e2e-prod-lnp.log" "e2e-prod-lnp-summary.json"
}

# 主逻辑
case "${1:-}" in
  unit)    run_unit ;;
  gateway) run_gateway ;;
  vitest)  run_vitest ;;
  e2e)     run_e2e ;;
  e2e:lnp) run_e2e_lnp ;;
  e2e:prod) run_e2e_prod ;;
  e2e:prod:lnp) run_e2e_prod_lnp ;;
  all)
    run_unit
    run_vitest
    run_gateway
    run_e2e
    echo ""
    echo -e "${GREEN}━━━ 全部本地测试完成 ━━━${NC}"
    echo "结果保存在 $RESULTS_DIR/"
    ;;
  all:prod)
    run_unit
    run_vitest
    run_e2e_prod
    echo ""
    echo -e "${GREEN}━━━ 全部线上测试完成 ━━━${NC}"
    echo "结果保存在 $RESULTS_DIR/"
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
    echo "测试结果保存在 test-results/ 目录"
    ;;
  *)
    echo "未知类型: $1"
    echo "运行 ./scripts/test.sh help 查看帮助"
    exit 1
    ;;
esac
