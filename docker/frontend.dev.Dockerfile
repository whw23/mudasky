FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

EXPOSE 3000

CMD ["sh", "/app/dev-entrypoint.sh"]
