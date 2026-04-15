FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

ARG BUILD_VERSION=dev
ENV NEXT_PUBLIC_BUILD_VERSION=${BUILD_VERSION}

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
