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

## GitHub Actions Auto Deploy

项目已支持基于 `GitHub Actions + SSH + 服务器本地 Docker Compose build` 的自动化部署。

核心流程：

```text
push 到 main
-> GitHub Actions 构建校验
-> rsync 同步代码到服务器
-> 服务器执行 docker compose up -d --build
```

相关文件：

```text
.github/workflows/deploy.yml                      自动构建与 SSH 部署工作流
docker-compose.prod.yml                           生产环境本地构建编排
infra/deploy/deploy-prod.sh                       服务器执行 up -d --build
docs/github-actions-ssh-build-auto-deploy.md      技术方案与实施说明
```

首次使用前需要：

1. 在 GitHub 仓库配置 `DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_SSH_KEY`、`DEPLOY_PATH`
2. 在服务器准备好 `/opt/gesp-catalog/.env.prod`
3. 服务器安装 `docker`、`docker compose`、`rsync`

首次部署可在 GitHub Actions 页面手动运行 `Deploy Production`，并设置：

```text
seed_on_deploy=true
```
