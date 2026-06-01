# GESP Classification Catalog

## Docker

开发环境只启动本地 MySQL：

```bash
pnpm docker:dev
```

生产环境使用 `docker-compose.prod.yml` 同时启动 MySQL、API 和 Web：

```bash
cp .env.prod.example .env.prod
# 修改 .env.prod 中的 MYSQL_ROOT_PASSWORD 和 MYSQL_PASSWORD
pnpm docker:prod
```

首次需要把仓库内置数据写入生产 MySQL 时执行：

```bash
pnpm docker:prod:seed
```

生产 Web 默认暴露 `WEB_PORT=80`，Nginx 会把 `/api` 反向代理到 API 容器。

## Server Deploy

从本机同步并部署到服务器：

```bash
cp .env.prod.example .env.prod
# 修改 .env.prod 中的 MYSQL_ROOT_PASSWORD 和 MYSQL_PASSWORD
DEPLOY_HOST=193.112.176.242 DEPLOY_USER=root pnpm deploy:push
```

如果首次部署需要把内置数据写入 MySQL：

```bash
DEPLOY_HOST=193.112.176.242 DEPLOY_USER=root SEED_ON_DEPLOY=true pnpm deploy:push
```
