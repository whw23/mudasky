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

# Start dev environment
docker compose up
```

## License

[PolyForm Noncommercial 1.0.0](LICENSE) — free to view and learn, commercial use requires a separate license.
