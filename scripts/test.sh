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

# 运行命令并同时输出到终端和文件
run_and_log() {
  local log_file="$1"
  shift
  "$@" 2>&1 | tee "$RESULTS_DIR/$log_file"
}

# 后端单元测试
run_unit() {
  header "后端单元测试 (pytest)"
  run_and_log "unit.log" \
    uv run --project backend/api python -m pytest backend/api/tests/ -v \
    --ignore=backend/api/tests/e2e \
    --cov=api --cov-report=term-missing
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
}

# 前端单元测试
run_vitest() {
  header "前端单元测试 (vitest)"
  run_and_log "vitest.log" \
    pnpm --prefix frontend test
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
}

# 前端 E2E (LAST_NOT_PASS)
run_e2e_lnp() {
  header "前端 E2E (LAST_NOT_PASS)"
  check_prod_container
  LAST_NOT_PASS=1 run_and_log "e2e-lnp.log" \
    pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
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
