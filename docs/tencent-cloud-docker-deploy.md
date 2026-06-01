# 腾讯云轻量服务器 Docker 部署手册

本文档记录当前项目部署到腾讯云轻量服务器的完整流程，可作为后续新服务器部署参考。

示例服务器：

```text
公网 IP：193.112.176.242
SSH 用户：root
项目目录：/opt/gesp-catalog
访问地址：http://193.112.176.242/
```

## 1. 部署架构

生产环境使用 Docker Compose 启动 3 个服务：

```text
Web：Nginx 托管 Vite 前端，暴露 80 端口
API：NestJS 服务，容器内监听 3001
MySQL：MySQL 8.4，只在 Docker 内网访问，不暴露公网端口
```

关键文件：

```text
docker-compose.dev.yml              本地开发 MySQL
docker-compose.prod.yml             生产部署 MySQL/API/Web
infra/docker/api.Dockerfile         API 镜像
infra/docker/web.Dockerfile         Web 镜像
infra/nginx/default.conf            Nginx 前端与 /api 反向代理
infra/deploy/push-to-server.sh      本机同步并触发远程部署
infra/deploy/deploy-prod.sh         服务器内执行生产 Compose
.env.prod.example                   生产环境变量模板
```

## 2. 本机 SSH Key

在本机生成 SSH key：

```bash
ssh-keygen -t ed25519 -C "tencent-lighthouse-gesp" -f ~/.ssh/tencent_lighthouse_gesp
```

把本机公钥写入服务器：

```bash
cat ~/.ssh/tencent_lighthouse_gesp.pub | ssh root@193.112.176.242 'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys; restorecon -Rv ~/.ssh 2>/dev/null || true'
```

测试免密登录：

```bash
ssh -o IdentitiesOnly=yes -i ~/.ssh/tencent_lighthouse_gesp root@193.112.176.242
```

看到服务器 shell，且没有要求输入服务器密码，即配置成功。

## 3. 服务器 Docker 环境

SSH 登录服务器：

```bash
ssh -i ~/.ssh/tencent_lighthouse_gesp root@193.112.176.242
```

检查 Docker：

```bash
docker --version
docker compose version
```

成功示例：

```text
Docker version 26.1.4
Docker Compose version v2.27.1
```

如果没有 Docker，CentOS 可优先使用官方安装脚本：

```bash
yum install -y curl
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl daemon-reload
systemctl enable --now docker
docker --version
docker compose version
```

如果 `docker compose version` 不存在，补 Compose plugin：

```bash
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version
```

## 4. Docker 镜像加速

国内服务器拉 Docker Hub 可能超时，例如：

```text
Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection
```

配置 registry mirror：

```bash
mkdir -p /etc/docker

cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run"
  ]
}
EOF

systemctl daemon-reload
systemctl restart docker
docker info | grep -A 10 "Registry Mirrors"
```

测试拉取镜像：

```bash
docker pull mysql:8.4
```

## 5. 生产环境变量

回到本机项目目录：

```bash
cd "/Users/zz/AI learning/vibe coding"
```

复制模板：

```bash
cp .env.prod.example .env.prod
```

至少修改：

```env
MYSQL_ROOT_PASSWORD=替换成强密码
MYSQL_PASSWORD=替换成强密码
```

注意：

- `.env.prod` 不要提交到 Git。
- `MYSQL_PASSWORD` 会被 API 用于连接 MySQL。
- `WEB_PORT=80` 表示公网访问端口为 80。

## 6. 执行部署

首次部署需要 seed 数据：

```bash
cd "/Users/zz/AI learning/vibe coding"
SSH_KEY=~/.ssh/tencent_lighthouse_gesp DEPLOY_HOST=193.112.176.242 DEPLOY_USER=root SEED_ON_DEPLOY=true pnpm deploy:push
```

后续普通更新不要带 `SEED_ON_DEPLOY=true`，避免重刷数据库：

```bash
SSH_KEY=~/.ssh/tencent_lighthouse_gesp DEPLOY_HOST=193.112.176.242 DEPLOY_USER=root pnpm deploy:push
```

脚本会执行：

```text
1. 同步项目到服务器 /opt/gesp-catalog
2. docker compose up -d --build
3. 首次部署时运行 seed 服务导入题库数据
4. 输出容器状态
```

## 7. 验证部署

服务器上查看容器：

```bash
ssh -i ~/.ssh/tencent_lighthouse_gesp root@193.112.176.242
cd /opt/gesp-catalog
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

成功示例：

```text
gesp-catalog-web-prod     Up ... (healthy)   0.0.0.0:80->80/tcp
gesp-catalog-api-prod     Up ... (healthy)   3001/tcp
gesp-catalog-mysql-prod   Up ... (healthy)   3306/tcp
```

验证前端：

```bash
curl -I http://127.0.0.1/
curl -I http://193.112.176.242/
```

成功应返回：

```text
HTTP/1.1 200 OK
Server: nginx/1.27.x
```

验证 API 和 MySQL：

```bash
curl http://127.0.0.1/api/catalog/levels
```

成功响应里应包含：

```json
"data_source":"mysql"
```

本机浏览器访问：

```text
http://193.112.176.242/
```

## 8. 防火墙

腾讯云轻量服务器控制台需要添加入站规则：

```text
协议：TCP
端口：80
来源：0.0.0.0/0
```

服务器本机防火墙检查：

```bash
firewall-cmd --state 2>/dev/null || true
firewall-cmd --list-ports 2>/dev/null || true
```

如果输出 `running`，放行 80：

```bash
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --reload
```

如果输出 `not running`，说明 CentOS 本机防火墙没有拦截，重点检查腾讯云控制台防火墙。

## 9. 常见问题

### DEPLOY_HOST 未设置

报错：

```text
DEPLOY_HOST: Set DEPLOY_HOST, for example 193.112.176.242
```

原因是环境变量没有和命令放在同一行。正确写法：

```bash
SSH_KEY=~/.ssh/tencent_lighthouse_gesp DEPLOY_HOST=193.112.176.242 DEPLOY_USER=root pnpm deploy:push
```

或先 `export`：

```bash
export SSH_KEY=~/.ssh/tencent_lighthouse_gesp
export DEPLOY_HOST=193.112.176.242
export DEPLOY_USER=root
pnpm deploy:push
```

### Docker is required but was not found

说明服务器没有 Docker，按第 3 节安装 Docker。

### systemctl 找不到 docker.service

报错：

```text
Failed to execute operation: No such file or directory
```

说明 Docker Engine 没有安装成功。检查：

```bash
docker --version
which docker
rpm -qa | grep -i docker
ls -l /usr/lib/systemd/system/docker.service /etc/systemd/system/docker.service 2>/dev/null
```

无输出时，按第 3 节重新安装 Docker。

### yum 没有 docker-ce 包

报错：

```text
没有可用软件包 docker-ce
```

可重新配置腾讯云 Docker 源：

```bash
yum install -y yum-utils curl
rm -f /etc/yum.repos.d/docker-ce.repo
curl -fsSL https://mirrors.tencent.com/docker-ce/linux/centos/docker-ce.repo -o /etc/yum.repos.d/docker-ce.repo
yum clean all
yum makecache
yum repolist | grep -i docker
```

如果仍失败，使用第 3 节的官方安装脚本。

### 公网打不开但服务器内 curl 正常

检查监听：

```bash
ss -lntp | grep ':80'
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -I http://127.0.0.1/
curl -I http://193.112.176.242/
```

如果容器 healthy，`127.0.0.1` 返回 `200 OK`，优先检查腾讯云控制台防火墙是否放行 80。

## 10. 维护命令

查看状态：

```bash
cd /opt/gesp-catalog
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

查看日志：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f
```

重启服务：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml restart
```

停止服务：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

再次部署：

```bash
cd "/Users/zz/AI learning/vibe coding"
SSH_KEY=~/.ssh/tencent_lighthouse_gesp DEPLOY_HOST=193.112.176.242 DEPLOY_USER=root pnpm deploy:push
```

## 11. 安全提醒

- 不要把服务器 root 密码写入文档、代码或 Git。
- root 密码如果在聊天或截图中暴露过，部署完成后应立即修改。
- `.env.prod` 包含数据库密码，不要提交。
- MySQL 不暴露公网端口，当前生产配置只允许容器内网访问。
- 首次部署后，后续更新不要随意使用 `SEED_ON_DEPLOY=true`，否则会重刷题库数据。
