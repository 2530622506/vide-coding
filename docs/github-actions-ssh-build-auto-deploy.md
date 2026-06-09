# GitHub Actions + SSH + 服务器本地构建自动部署方案

本文档记录当前项目最终采用的自动部署方案：当代码 `push` 到 `main` 分支后，由 `GitHub Actions` 自动完成构建校验、同步源码到服务器，并在服务器本地执行 `docker compose up -d --build`。

该方案不依赖 `GHCR`、`TCR`、`Docker Hub` 等外部镜像仓库，适合当前项目在腾讯云轻量服务器上的低成本部署。

## 1．目标流程

```text
push 到 main
-> GitHub Actions 触发
-> pnpm install --frozen-lockfile
-> pnpm build:api
-> pnpm build:web
-> SSH + rsync 同步源码到服务器
-> 服务器执行 docker compose up -d --build
-> 可选执行 seed
-> 输出容器状态
```

## 2．关键文件

```text
.github/workflows/deploy.yml          自动部署工作流
docker-compose.prod.yml               生产环境本地构建编排
infra/deploy/deploy-prod.sh           服务器内执行 up -d --build
.env.prod.example                     生产环境变量模板
```

## 3．GitHub Secrets

在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

```text
DEPLOY_HOST         服务器公网 IP 或域名
DEPLOY_USER         SSH 登录用户名，例如 root
DEPLOY_SSH_KEY      登录服务器的私钥全文
DEPLOY_PATH         服务器项目目录，例如 /opt/gesp-catalog
```

本方案不再需要：

```text
GHCR_USERNAME
GHCR_TOKEN
REGISTRY_SERVER
REGISTRY_NAMESPACE
REGISTRY_USERNAME
REGISTRY_PASSWORD
```

## 4．服务器前置要求

服务器需要满足：

```text
1. 已安装 docker
2. 已安装 docker compose
3. 已安装 rsync
4. 已存在部署目录，例如 /opt/gesp-catalog
5. 已存在生产环境文件 /opt/gesp-catalog/.env.prod
```

检查命令：

```bash
docker --version
docker compose version
rsync --version
```

## 5．生产环境变量

服务器上的 `.env.prod` 至少应正确设置：

```env
MYSQL_ROOT_PASSWORD=replace_with_strong_root_password
MYSQL_DATABASE=gesp_catalog
MYSQL_USER=gesp
MYSQL_PASSWORD=replace_with_strong_app_password
PORT=3001
WEB_PORT=80
CATALOG_MYSQL_REQUIRED=false
JUDGE0_ENDPOINT=https://judge0-ce.p.rapidapi.com
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=replace_with_rapidapi_key
JUDGE0_AUTH_MODE=rapidapi
JUDGE0_CPP_LANGUAGE_ID=76
JUDGE0_TIMEOUT_MS=10000
CODE_RUN_MAX_STDIN_BYTES=20000
CODE_RUN_MAX_SOURCE_BYTES=100000
CODE_RUN_MAX_OUTPUT_BYTES=50000
```

## 6．工作流说明

当前工作流分为 5 段：

1. 检出代码
2. 安装依赖并执行前后端构建校验
3. 配置 SSH
4. 使用 `rsync` 增量同步源码到服务器
5. 远程执行 `infra/deploy/deploy-prod.sh`

说明：

- `push main` 会自动部署
- `workflow_dispatch` 可以手动部署
- 手动触发时可传 `seed_on_deploy=true`

## 7．部署脚本说明

服务器执行脚本：

```bash
bash infra/deploy/deploy-prod.sh
```

脚本行为：

```text
1. 检查 docker / docker compose
2. 校验 .env.prod 是否存在
3. docker compose up -d --build
4. 如果 SEED_ON_DEPLOY=true，则执行 seed
5. 输出 docker compose ps
```

## 8．首次部署

首次建议手动运行工作流：

```text
Actions -> Deploy Production -> Run workflow
seed_on_deploy=true
```

后续日常发布只需要：

```bash
git push origin main
```

## 9．验证部署

服务器上验证：

```bash
cd /opt/gesp-catalog
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
curl -I http://127.0.0.1/
curl http://127.0.0.1/api/catalog/levels
```

浏览器访问：

```text
http://<server_ip>/
```

## 10．优缺点

优点：

1. 免费，不依赖外部镜像仓库
2. 避开 `GHCR` / `TCR` 跨地域拉镜像慢的问题
3. 与当前项目已有 `Docker Compose` 结构最匹配

缺点：

1. 服务器每次部署都要本地构建镜像
2. 部署速度通常慢于预构建镜像拉取
3. 服务器需要承担构建 CPU / 内存开销

## 11．结论

对于当前项目，这是成本最低、实现最直接、稳定性最高的自动部署方案。
