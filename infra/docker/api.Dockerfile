FROM node:20-alpine AS deps

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY tsconfig.json ./
COPY apps/api ./apps/api
RUN pnpm build:api

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist
COPY data ./data
COPY infra/mysql ./infra/mysql
COPY scripts ./scripts

EXPOSE 3001
CMD ["node", "dist/api/main.js"]
