# mudasky

Education institution web application.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Gateway | OpenResty (Lua) |
| Frontend | Next.js + React + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Python (FastAPI) |
| Database | PostgreSQL |
| Infra | Docker |

## Development

```bash
# Copy env templates and fill in your values
cp env/backend.env.example env/backend.env
cp env/gateway.env.example env/gateway.env
cp env/db.env.example env/db.env
cp env/worker.env.example env/worker.env

# Start dev environment
./scripts/dev.sh start

# Build production containers (for E2E testing)
./scripts/dev.sh --prod
```

## Testing

```bash
./scripts/test.sh all          # Run all local tests
./scripts/test.sh unit         # Backend unit tests + coverage
./scripts/test.sh vitest       # Frontend unit tests
./scripts/test.sh gateway      # Gateway integration tests
./scripts/test.sh e2e          # E2E tests (requires production containers)
./scripts/test.sh e2e:prod     # E2E on production server
```

Test results are saved to `test-results/<timestamp>/`, with `test-results/latest` pointing to the most recent run.

## License

Copyright (c) 2026 [whw23](https://github.com/whw23). All rights reserved.

Licensed under [PolyForm Noncommercial 1.0.0](LICENSE) — free to view, study, and use for noncommercial purposes. Commercial use requires a separate license from the copyright holder.
