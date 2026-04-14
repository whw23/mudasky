FROM postgres:17

# 安装 pg_cron 扩展
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17-cron \
    && rm -rf /var/lib/apt/lists/*

# pg_cron 需要在 shared_preload_libraries 中加载
RUN echo "shared_preload_libraries = 'pg_cron'" >> /usr/share/postgresql/postgresql.conf.sample
