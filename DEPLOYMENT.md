# GitHub Pages 部署指南

本项目支持自动部署到 GitHub Pages。

## 🚀 自动部署配置

项目已配置 GitHub Actions 自动部署工作流（`.github/workflows/deploy.yml`），每次推送到 `main` 分支时会自动构建并部署。

## 📝 部署步骤

### 1. 推送代码到 GitHub

```bash
# 初始化 git 仓库（如果还没有）
git init
git add .
git commit -m "feat: 完整的海外购物 Web 应用"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 推送到 main 分支
git branch -M main
git push -u origin main
```

### 2. 启用 GitHub Pages

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Pages**
3. 在 **Source** 下选择 **GitHub Actions**
4. 保存设置

### 3. 触发部署

推送代码后，GitHub Actions 会自动：
1. 安装依赖
2. 运行生产构建（`npm run build`）
3. 部署到 GitHub Pages

你可以在 **Actions** 标签页查看部署进度。

## 🌐 访问地址

部署成功后，应用将在以下地址访问：

```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

例如：
- 如果你的 GitHub 用户名是 `john`
- 仓库名是 `vibe-coding`
- 访问地址就是：`https://john.github.io/vibe-coding/`

## ⚙️ 环境配置说明

### Vite 配置（`vite.config.ts`）

```typescript
export default defineConfig(({ mode }) => {
  return {
    // 🔴 生产环境使用子路径，开发环境使用根路径
    base: mode === 'production' ? '/vibe-coding/' : '/',
    // ...其他配置
  }
})
```

**重要**：如果你的仓库名不是 `vibe-coding`，需要修改 `vite.config.ts` 中的 `base` 路径：

```typescript
base: mode === 'production' ? '/YOUR_REPO_NAME/' : '/',
```

### 本地开发 vs 生产环境

| 环境 | Base 路径 | 访问地址 | 构建命令 |
|------|-----------|----------|----------|
| **本地开发** | `/` | `http://localhost:5173/` | `npm run dev` |
| **生产环境** | `/vibe-coding/` | `https://username.github.io/vibe-coding/` | `npm run build` |

## 🔧 手动部署（可选）

如果不想使用 GitHub Actions，也可以手动部署：

```bash
# 1. 构建生产版本
npm run build

# 2. 进入构建目录
cd dist

# 3. 初始化 git 并推送到 gh-pages 分支
git init
git add -A
git commit -m 'deploy'
git push -f https://github.com/YOUR_USERNAME/YOUR_REPO.git main:gh-pages

# 4. 返回项目根目录
cd ..
```

然后在 GitHub Pages 设置中选择 `gh-pages` 分支作为源。

## ✅ 验证部署

部署成功后，访问你的 GitHub Pages 地址，应该能看到：

- ✅ 完整的首页（带背景图片和动效）
- ✅ 商品列表和筛选功能
- ✅ 商品详情页
- ✅ 购物车功能
- ✅ 所有图片正常加载（使用 Pexels CDN）

## 🐛 常见问题

### 问题 1: 页面显示 404

**原因**：`vite.config.ts` 中的 `base` 路径与仓库名不匹配。

**解决**：修改 `vite.config.ts`：
```typescript
base: mode === 'production' ? '/YOUR_ACTUAL_REPO_NAME/' : '/',
```

### 问题 2: 刷新页面后 404

**原因**：GitHub Pages 不支持 SPA 路由。

**解决**：项目已配置 React Router，但需要使用 Hash Router 或添加 404.html 重定向。

当前使用的是 BrowserRouter，刷新子页面可能会 404。如需解决，可以：

1. **方案 A**：使用 Hash Router（推荐）
   - 修改 `src/app/App.tsx`
   - 将 `BrowserRouter` 改为 `HashRouter`
   - URL 会变成 `#/shop` 格式

2. **方案 B**：添加 404.html 重定向
   - 在 `public/` 目录添加 `404.html`
   - 重定向到 `index.html`

### 问题 3: Actions 部署失败

**检查**：
1. 仓库是否启用了 GitHub Pages
2. Actions 是否有权限（Settings → Actions → General）
3. 查看 Actions 标签页的错误日志

## 🔄 更新部署

每次修改代码后，只需：

```bash
git add .
git commit -m "feat: 更新功能"
git push
```

GitHub Actions 会自动重新构建和部署。

## 📊 部署状态徽章

你可以在 README.md 中添加部署状态徽章：

```markdown
[![Deploy](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy.yml)
```

## 🎯 总结

- ✅ **本地开发**：`npm run dev` → 访问 `http://localhost:5173/`
- ✅ **生产部署**：推送到 GitHub → 自动部署 → 访问 `https://username.github.io/repo/`
- ✅ **环境隔离**：开发和生产使用不同的 base 路径
- ✅ **自动化**：GitHub Actions 自动处理构建和部署

---

部署成功后，欢迎分享你的应用地址！🎉
