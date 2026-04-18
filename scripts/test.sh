#!/bin/bash
# 统一测试脚本
# 用法:
#   ./scripts/test.sh          # 运行全部测试（单元+vitest+网关+E2E）
#   ./scripts/test.sh unit     # 后端单元测试 + 覆盖率
#   ./scripts/test.sh gateway  # 网关集成测试 (port 80)
#   ./scripts/test.sh vitest   # 前端单元测试
#   ./scripts/test.sh e2e      # 前端 E2E（本地生产容器）
#   ./scripts/test.sh e2e:lnp  # 前端 E2E 重跑失败
#   ./scripts/test.sh e2e:prod # 前端 E2E（线上生产环境）

set -euo pipefail
cd "$(dirname "$0")/.."

# 从 env/backend.env 加载环境变量（跳过注释和含括号的行）
load_env() {
  if [ -f env/backend.env ]; then
    while IFS='=' read -r key value; do
      # 跳过注释和空行
      [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
      # 跳过含括号的行（会导致 bash 语法错误）
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

# 后端单元测试
run_unit() {
  header "后端单元测试 (pytest)"
  uv run --project backend/api python -m pytest backend/api/tests/ -v \
    --ignore=backend/api/tests/e2e \
    --cov=api --cov-report=term-missing
}

# 后端网关集成测试
run_gateway() {
  header "后端网关测试 (port 80)"
  load_env
  uv run --project backend/api python -m pytest backend/api/tests/e2e/ -v
}

# 前端单元测试
run_vitest() {
  header "前端单元测试 (vitest)"
  pnpm --prefix frontend test
}

# 前端 E2E
run_e2e() {
  header "前端 E2E (playwright)"
  pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
}

# 前端 E2E (LAST_NOT_PASS)
run_e2e_lnp() {
  header "前端 E2E (LAST_NOT_PASS)"
  LAST_NOT_PASS=1 pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
}

# 线上 E2E
run_e2e_prod() {
  header "线上 E2E (production)"
  load_env
  if [ -z "${PRODUCTION_HOST:-}" ]; then
    echo -e "${RED}错误: env/backend.env 中未设置 PRODUCTION_HOST${NC}"
    exit 1
  fi
  TEST_ENV=production pnpm --prefix frontend exec playwright test --config e2e/playwright.config.ts
}

# 主逻辑
case "${1:-all}" in
  unit)    run_unit ;;
  gateway) run_gateway ;;
  vitest)  run_vitest ;;
  e2e)     run_e2e ;;
  e2e:lnp) run_e2e_lnp ;;
  e2e:prod) run_e2e_prod ;;
  all)
    run_unit
    run_vitest
    run_gateway
    run_e2e
    echo ""
    echo -e "${GREEN}━━━ 全部测试完成 ━━━${NC}"
    ;;
  *)
    echo "用法: $0 {unit|gateway|vitest|e2e|e2e:lnp|e2e:prod|all}"
    exit 1
    ;;
esac
