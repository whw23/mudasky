FROM python:3.14-slim

WORKDIR /app

COPY shared/ ./shared/
COPY api/ ./api/
COPY scripts/ ./scripts/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY pyproject.toml ./

RUN pip install --no-cache-dir ./shared ./api

RUN chmod +x scripts/start-api.sh

EXPOSE 8000
CMD ["./scripts/start-api.sh"]
