FROM python:3.14-slim

WORKDIR /app

COPY shared/ ./shared/
COPY api/ ./api/
COPY pyproject.toml ./

RUN pip install --no-cache-dir ./shared ./api

WORKDIR /app/api

RUN chmod +x scripts/start.sh

EXPOSE 8000
CMD ["./scripts/start.sh"]
