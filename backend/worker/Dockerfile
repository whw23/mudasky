FROM python:3.14-slim

WORKDIR /app

COPY shared/ ./shared/
COPY worker/ ./worker/
COPY pyproject.toml ./

RUN pip install --no-cache-dir ./shared ./worker

CMD ["python", "-m", "worker_runner.main"]
