FROM postgres:17

# 安装 pg_cron 扩展
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17-cron \
    && rm -rf /var/lib/apt/lists/*
