# GitHub Actions + 镜像仓库 + 服务器 Pull 镜像自动部署方案

> 本文档方案已废弃，当前仓库不再使用镜像仓库拉取部署。  
> 请改用 [github-actions-ssh-build-auto-deploy.md](/Users/zz/AI%20learning/vibe%20coding/docs/github-actions-ssh-build-auto-deploy.md:1)。

本文档给出当前项目基于 `GitHub Actions + Docker Registry + Docker Compose` 的自动化部署技术方案与实施方案。目标是：当代码 `push` 到 `main` 分支后，自动构建 `api` 与 `web` 镜像并推送到镜像仓库，再由生产服务器拉取最新镜像并完成部署。

当前仓库实现已优先适配 `腾讯云 TCR`，同时保留对其他标准 Docker Registry 的兼容能力。

当前仓库的实际配置项以以下 Secrets / 环境变量为准：

```text
REGISTRY_SERVER        镜像仓库地址，例如 ccr.ccs.tencentyun.com 或企业版实例域名
REGISTRY_NAMESPACE     镜像命名空间
REGISTRY_USERNAME      仓库登录用户名
REGISTRY_PASSWORD      仓库登录密码或访问凭据
IMAGE_REGISTRY         服务器部署时传入的镜像仓库地址
IMAGE_NAMESPACE        服务器部署时传入的镜像命名空间
```

下文中保留的 `GHCR` 示例，主要用于说明“镜像仓库驱动部署”的思路；如果与当前仓库实现不一致，以工作流文件和实际 Secrets 名称为准。

说明：

- 本方案保留生产环境的 `MySQL` 本地持久化方式，不将数据库容器镜像化托管到 `GHCR`。
- 本方案优先复用当前仓库已有的 `Dockerfile`、`docker-compose.prod.yml` 和生产环境变量约定。

## 1．现状与约束

当前项目已经具备生产部署基础：

```text
docker-compose.prod.yml             生产环境 MySQL / API / Web 编排
infra/docker/api.Dockerfile         API 镜像构建
infra/docker/web.Dockerfile         Web 镜像构建
infra/nginx/default.conf            Web 容器内 Nginx 与 /api 反向代理
infra/deploy/deploy-prod.sh         服务器本地执行 docker compose up -d --build
infra/deploy/push-to-server.sh      本机 rsync 代码到服务器并触发部署
.env.prod.example                   生产环境变量模板
```

当前部署流程的问题：

1. 代码需要先同步到服务器，部署机与构建机耦合。
2. 服务器每次都要本地构建镜像，耗时较长。
3. 生产环境依赖服务器本地 `Node` / `pnpm` / 构建链，稳定性一般。
4. 回滚粒度粗，只能通过重新同步历史代码或手工改动。

## 2．目标架构

目标部署链路：

```text
开发者 push 到 GitHub main
-> GitHub Actions 触发流水线
-> 校验依赖与构建
-> 构建 api / web Docker 镜像
-> 推送到 GHCR
-> 通过 SSH 登录生产服务器
-> docker login ghcr.io
-> docker compose pull
-> docker compose up -d
-> 输出容器状态并完成部署
```

生产架构保持不变：

```text
Web：Nginx 托管前端静态资源，对外暴露 80 端口
API：NestJS 服务，容器内监听 3001 端口
MySQL：MySQL 8.4，仅在 Docker 内网访问，使用本地 volume 持久化
```

## 3．技术方案

### 3.1 总体设计

采用“CI 负责构建镜像，服务器只负责拉取和运行”的职责分离模式。

角色划分：

- `GitHub Actions`：构建、打 tag、推送镜像、触发远程部署。
- `GHCR`：作为镜像仓库，保存 `api`、`web` 的版本镜像。
- `生产服务器`：只保留 `docker`、`docker compose`、`.env.prod`、`docker-compose.prod.yml` 等运行时文件。

### 3.2 镜像命名策略

建议统一使用 `GHCR`，镜像命名如下：

```text
ghcr.io/<github_owner>/gesp-catalog-api
ghcr.io/<github_owner>/gesp-catalog-web
```

每次发布打 2 组 tag：

```text
main                 最新主线版本
sha-<commit_sha>     精确回滚版本
```

示例：

```text
ghcr.io/2530622506/gesp-catalog-api:main
ghcr.io/2530622506/gesp-catalog-api:sha-a1b2c3d
ghcr.io/2530622506/gesp-catalog-web:main
ghcr.io/2530622506/gesp-catalog-web:sha-a1b2c3d
```

### 3.3 分支触发策略

触发条件建议为：

```text
on:
  push:
    branches:
      - main
```

原因：

1. 当前远端只有 `main` 分支。
2. 生产部署不建议监听所有分支，避免误发版。

### 3.4 服务器部署策略

生产服务器只执行以下动作：

1. 登录 `ghcr.io`
2. 拉取最新 `api` / `web` 镜像
3. 通过 `docker compose up -d` 更新容器
4. 保留 `mysql` 数据卷不动

这样可以保证：

- 数据库不会因部署被重建。
- Web 与 API 的回滚只需要切换镜像 tag。
- 服务器不需要安装 `pnpm` 和前端构建依赖。

### 3.5 环境变量策略

生产环境变量继续保存在服务器本地 `.env.prod` 中，不写入 Git 仓库。建议沿用现有模板：

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

原则：

1. 镜像中不写死敏感信息。
2. 生产配置放服务器。
3. `GitHub Actions` 只保存部署所需凭据，不保存业务运行配置。

### 3.6 首次初始化与 Seed 策略

当前仓库存在 `seed` 服务，首次部署时可导入题库数据。建议策略：

- 首次部署：手工执行一次 `seed`
- 后续常规发布：默认不执行 `seed`

原因：

1. 避免每次发布都重复写入数据库。
2. 把“应用发布”和“数据初始化”解耦。

### 3.7 回滚策略

回滚方式采用“切镜像 tag”：

1. 将 `docker-compose.prod.yml` 中的 `api`、`web` tag 改回上一版 `sha-xxx`
2. 执行 `docker compose pull`
3. 执行 `docker compose up -d`

优点：

- 回滚快
- 不依赖重新构建
- 不影响 MySQL volume

## 4．实施方案

### 4.1 仓库改造项

需要改造 4 个部分：

1. `docker-compose.prod.yml`
2. `infra/deploy/deploy-prod.sh`
3. 新增 `.github/workflows/deploy.yml`
4. 新增服务器侧初始化脚本或部署说明

### 4.2 docker-compose.prod.yml 改造

当前 Compose 中 `api` 与 `web` 同时声明了 `image` 和 `build`，部署时会在服务器本地构建。改造后应只保留远端镜像地址。

建议改造方向：

```yaml
x-api-image: &api-image
  image: ghcr.io/<github_owner>/gesp-catalog-api:${IMAGE_TAG:-main}

services:
  mysql:
    image: mysql:8.4

  api:
    <<: *api-image
    container_name: gesp-catalog-api-prod
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: ${PORT:-3001}
      MYSQL_HOST: mysql
      MYSQL_PORT: 3306
      MYSQL_DATABASE: ${MYSQL_DATABASE:-gesp_catalog}
      MYSQL_USER: ${MYSQL_USER:-gesp}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:?Set MYSQL_PASSWORD in .env.prod}

  web:
    image: ghcr.io/<github_owner>/gesp-catalog-web:${IMAGE_TAG:-main}
    container_name: gesp-catalog-web-prod
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-80}:80"
```

关键点：

1. 新增 `IMAGE_TAG` 变量，默认值为 `main`。
2. 移除 `build:`，避免服务器本地构建。
3. `mysql` 保持现状不变。

### 4.3 deploy-prod.sh 改造

当前部署脚本执行的是：

```bash
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
```

改造后建议变为：

```bash
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
```

可选增强：

```bash
docker image prune -f
```

注意：

- 不建议默认执行 `docker compose down`，避免中断时间增大。
- 不建议在部署脚本里自动跑 `seed`，除非显式打开开关。

### 4.4 GitHub Actions 设计

工作流建议拆成 3 个阶段：

1. `build-check`
2. `docker-publish`
3. `remote-deploy`

推荐流程：

```text
checkout
-> setup node 20
-> setup pnpm
-> pnpm install --frozen-lockfile
-> pnpm build:api
-> pnpm build:web
-> login ghcr.io
-> buildx 构建 api / web
-> push main 与 sha tag
-> ssh 到服务器执行 deploy-prod.sh
```

建议工作流示例：

```yaml
name: Deploy Production

on:
  push:
    branches:
      - main

permissions:
  contents: read
  packages: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      REGISTRY: ghcr.io
      IMAGE_OWNER: ${{ github.repository_owner }}
      API_IMAGE: ghcr.io/${{ github.repository_owner }}/gesp-catalog-api
      WEB_IMAGE: ghcr.io/${{ github.repository_owner }}/gesp-catalog-web
      IMAGE_TAG: main
      IMAGE_SHA_TAG: sha-${{ github.sha }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.14.0

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build API
        run: pnpm build:api

      - name: Build Web
        run: pnpm build:web

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push API image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: infra/docker/api.Dockerfile
          push: true
          tags: |
            ${{ env.API_IMAGE }}:${{ env.IMAGE_TAG }}
            ${{ env.API_IMAGE }}:${{ env.IMAGE_SHA_TAG }}

      - name: Build and push Web image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: infra/docker/web.Dockerfile
          push: true
          tags: |
            ${{ env.WEB_IMAGE }}:${{ env.IMAGE_TAG }}
            ${{ env.WEB_IMAGE }}:${{ env.IMAGE_SHA_TAG }}

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd ${{ secrets.DEPLOY_PATH }}
            export IMAGE_TAG=main
            bash infra/deploy/deploy-prod.sh
```

说明：

1. `GITHUB_TOKEN` 可以直接推送到当前仓库对应的 `GHCR` 包。
2. 远程部署前提是服务器已存在项目目录与 Compose 文件。
3. 若服务器需要登录私有 `GHCR`，需要额外执行 `docker login ghcr.io`。

### 4.5 GitHub Secrets 设计

建议在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

```text
DEPLOY_HOST         生产服务器 IP 或域名
DEPLOY_USER         SSH 登录用户名，例如 root
DEPLOY_SSH_KEY      用于登录服务器的私钥
DEPLOY_PATH         服务器项目目录，例如 /opt/gesp-catalog
GHCR_USERNAME       可选，服务器登录 GHCR 的用户名
GHCR_TOKEN          可选，服务器登录 GHCR 的 PAT
```

补充说明：

- 若工作流通过 `GITHUB_TOKEN` 推镜像，CI 侧通常不需要单独配置 `GHCR_TOKEN`。
- 若服务器拉的是私有镜像，则服务器侧必须能登录 `GHCR`。
- 如果将镜像改为 `public`，服务器拉取可以不登录。

### 4.6 服务器初始化步骤

生产服务器首次接入此方案时，建议执行以下初始化：

1. 安装 `Docker` 与 `Docker Compose`
2. 创建部署目录，例如 `/opt/gesp-catalog`
3. 上传以下必要文件：
   - `docker-compose.prod.yml`
   - `infra/deploy/deploy-prod.sh`
   - `.env.prod`
4. 执行 `docker login ghcr.io`
5. 首次 `docker compose pull`
6. 首次 `docker compose up -d`
7. 按需执行一次 `seed`

如果镜像仓库为私有，服务器建议使用只读 `PAT` 登录：

```bash
docker login ghcr.io -u <github_username> -p <ghcr_pat>
```

### 4.7 首次上线步骤

建议按以下顺序操作：

1. 在 GitHub 仓库启用 `Actions` 与 `Packages`
2. 提交 `.github/workflows/deploy.yml`
3. 配置仓库 `Secrets`
4. 改造 `docker-compose.prod.yml`
5. 改造 `infra/deploy/deploy-prod.sh`
6. 服务器初始化 `GHCR` 登录与 `.env.prod`
7. 手工触发一次工作流或 `push` 一次 `main`
8. 服务器验证容器健康状态
9. 首次需要时手工执行 `seed`

### 4.8 验证方案

部署完成后应验证：

1. 容器状态

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

2. 前端首页

```bash
curl -I http://127.0.0.1/
```

3. API 健康

```bash
curl http://127.0.0.1/api/catalog/levels
```

4. `web` 到 `api` 的反向代理是否正常

```bash
curl -I http://127.0.0.1/api/catalog/levels
```

5. 页面访问验证

```text
http://<server_ip>/
```

### 4.9 失败处理与回滚

建议准备以下应急手段：

1. 保留最近 3 到 5 个 `sha-xxx` 镜像 tag
2. 部署失败时改回上一个稳定 tag
3. 如仅 `web` 有问题，可单独回滚 `web` 镜像
4. 如仅 `api` 有问题，可单独回滚 `api` 镜像

标准回滚步骤：

```bash
export IMAGE_TAG=sha-<last_good_commit>
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

## 5．推荐实施顺序

建议分 3 个阶段实施：

### 阶段一：镜像发布链路打通

目标：

- `GitHub Actions` 能成功构建并推送 `api` / `web` 镜像到 `GHCR`

交付项：

- `.github/workflows/deploy.yml`
- `GHCR` 包可见

### 阶段二：服务器切换为 Pull 模式

目标：

- 服务器不再本地构建镜像

交付项：

- 改造后的 `docker-compose.prod.yml`
- 改造后的 `infra/deploy/deploy-prod.sh`

### 阶段三：自动化上线与回滚演练

目标：

- `push main` 后自动部署
- 完成至少一次镜像回滚验证

交付项：

- GitHub Actions 自动部署成功记录
- 回滚操作记录

## 6．方案优缺点评估

优点：

1. 构建与运行职责清晰。
2. 部署速度比服务器本地构建更快。
3. 支持按镜像 tag 精确回滚。
4. 服务器依赖更少，稳定性更高。
5. 后续可以很自然地扩展到 `staging / production` 多环境。

缺点：

1. 初次接入需要改造 Compose 与部署脚本。
2. 需要理解 `GHCR` 权限与 `GitHub Actions` Secrets 管理。
3. 若镜像仓库网络不稳定，服务器拉镜像会受影响。

## 7．最终建议

对于当前项目，推荐采用本方案，原因如下：

1. 现有仓库已经具备 `api`、`web` 双镜像构建能力，改造成本低。
2. 当前生产环境已经是 `Docker Compose` 模式，迁移为 `pull` 模式非常自然。
3. 相比现有 `push-to-server.sh` 方案，本方案更适合长期维护、回滚和多版本管理。

如果后续确认实施，下一步建议直接落地以下内容：

1. 改造 `docker-compose.prod.yml` 为纯镜像拉取模式。
2. 改造 `infra/deploy/deploy-prod.sh`，移除 `--build`，改为 `pull + up -d`。
3. 新增 `.github/workflows/deploy.yml`。
4. 补一份服务器首次初始化文档或脚本。
