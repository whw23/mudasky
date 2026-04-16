# ── builder ──
FROM python:3.14-slim AS builder
WORKDIR /app

COPY shared/ ./shared/
COPY api/ ./api/
COPY scripts/ ./scripts/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY pyproject.toml ./
RUN pip install --no-cache-dir ./shared ./api

# 编译业务代码为 .pyc 并删除 .py 源文件
# alembic/ 不编译（迁移脚本需要 alembic 原样读取）
RUN python -m compileall -b shared/app/ api/api/ scripts/ && \
    find shared/app/ api/api/ scripts/ -name "*.py" -delete

# ── runner ──
FROM python:3.14-slim AS runner
WORKDIR /app

COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app/shared/ ./shared/
COPY --from=builder /app/api/ ./api/
COPY --from=builder /app/scripts/ ./scripts/
COPY --from=builder /app/alembic/ ./alembic/
COPY --from=builder /app/alembic.ini ./
COPY --from=builder /app/pyproject.toml ./
RUN chmod +x scripts/start-api.sh

ARG BUILD_VERSION=dev
ENV BUILD_VERSION=${BUILD_VERSION}
EXPOSE 8000
CMD ["sh", "scripts/start-api.sh"]
