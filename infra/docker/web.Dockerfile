FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile
RUN pnpm build:web

FROM nginx:1.27-alpine AS runner

COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/web /usr/share/nginx/html

EXPOSE 80
