# Haven - Overseas Shopping Web Application

面向海外消费者的商品选购 Web 应用演示项目。

## 项目简介

Haven 是一个精心设计的家居与日常生活用品选购应用，专为美国消费者打造。本项目展示了现代电商应用的核心功能，包括商品浏览、搜索筛选、详情查看和购物车管理。

**重要说明**: 这是一个演示项目，所有商品数据、价格和图片仅用于展示目的，不代表真实商品或交易。

## 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **路由**: React Router 6
- **状态管理**: Zustand (购物车持久化)
- **样式**: Tailwind CSS 3
- **动效**: Motion for React
- **代码质量**: ESLint + TypeScript

## 功能特性

### ✅ 已实现功能

1. **商品发现 (FR-1)**
   - 响应式首页设计
   - 品牌化 Hero 区域
   - 精选分类展示
   - 特色商品网格

2. **商品列表 (FR-2)**
   - 关键词搜索
   - 多维度筛选 (品类/价格/颜色/材质)
   - 多种排序选项 (推荐/上新/价格)
   - 筛选条件同步到 URL
   - 移动端适配的筛选面板
   - 空结果友好提示

3. **商品详情 (FR-3)**
   - 独立 URL 访问
   - 完整商品信息展示
   - 评分和评价数量
   - 颜色/变体选择
   - 加购反馈动效
   - 无效路由 404 处理

4. **购物车 (FR-4)**
   - 全局购物车状态
   - localStorage 持久化
   - 数量调整和移除
   - 实时小计计算
   - 空购物车状态
   - 页面刷新后保留

5. **响应式设计 (FR-5)**
   - 桌面端和移动端适配
   - 触控友好的交互
   - 流畅的转场动效
   - 尊重用户动效偏好设置

6. **代码质量 (FR-6)**
   - 模块化组件结构
   - TypeScript 类型安全
   - 清晰的职责分离
   - 关键业务逻辑注释

### ⚠️ 范围外功能

- 后端服务和数据库
- 用户认证和登录
- 真实支付和结账
- 订单管理
- 跨设备购物车同步
- SEO 和服务端渲染
- 自动化测试套件

## 快速开始

### 环境要求

- Node.js 18+ 
- npm 9+

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

### 代码检查

```bash
# ESLint 检查
npm run lint

# TypeScript 类型检查
npm run typecheck
```

## 项目结构

```
src/
├── app/                 # 应用路由和全局配置
│   └── App.tsx         # 主应用组件和路由定义
├── pages/              # 页面组件
│   ├── HomePage.tsx    # 首页
│   ├── ShopPage.tsx    # 商品列表页
│   ├── ProductPage.tsx # 商品详情页
│   └── CartPage.tsx    # 购物车页
├── features/           # 功能模块
│   ├── catalog/        # 商品目录相关
│   │   ├── ProductCard.tsx
│   │   └── filterUtils.ts
│   ├── product/        # 商品详情相关
│   └── cart/           # 购物车相关
│       └── cartStore.ts
├── components/         # 共享组件
│   ├── ui/            # 基础 UI 组件
│   │   └── Button.tsx
│   ├── SiteHeader.tsx
│   └── SiteFooter.tsx
├── data/              # 静态数据
│   ├── products.ts    # 商品数据
│   └── categories.ts  # 分类数据
├── lib/               # 工具函数
│   └── format.ts      # 格式化函数
├── types/             # TypeScript 类型定义
│   └── product.ts
├── styles/            # 全局样式
│   └── index.css
└── main.tsx           # 应用入口

public/
├── images/
│   └── products/      # 商品图片（当前为占位符）
└── assets-credits.md  # 图片来源说明
```

## 数据说明

### 商品数据

应用使用本地静态数据模拟商品目录（`src/data/products.ts`），包含 8 个演示商品，涵盖以下品类：

- Living Room (客厅)
- Bedroom (卧室)
- Kitchen & Dining (厨房餐厅)
- Home Decor (家居装饰)
- Lighting (灯具)
- Bath (浴室)

每个商品包含：
- 名称、描述、价格（美元）
- 材质、颜色选项
- 评分和评价数量
- 创建日期和特色排序

### 图片资产

当前商品图片为 SVG 占位符。在实际部署时，应：

1. 从 Pexels 等免费图库下载合适的家居/生活方式图片
2. 优化图片尺寸至 800x800px
3. 压缩以优化加载性能
4. 更新 `public/assets-credits.md` 记录来源

详见 `public/assets-credits.md` 了解图片要求和许可说明。

## 购物车持久化

购物车使用 Zustand + localStorage 实现持久化：

- ✅ 浏览器刷新后保留
- ✅ 数据版本校验
- ✅ 损坏数据自动回退
- ❌ 不跨设备/浏览器同步
- ❌ 价格始终从商品目录实时计算

## 浏览器支持

- Chrome/Edge 最新版本
- Firefox 最新版本  
- Safari 15+

## 已知限制

1. **图片**: 当前使用 SVG 占位符，需替换为真实图片
2. **结账**: 购物车流程在购物车页面结束，无法进行结账
3. **库存**: 不模拟实时库存，所有商品始终"可用"
4. **运费税费**: 不计算运费和税费
5. **多语言**: 仅支持英文界面
6. **深链接**: 在静态托管时需配置 SPA fallback

## 验证清单

手动验证已完成以下场景：

- ✅ 首页加载和响应式布局
- ✅ 商品搜索和筛选功能
- ✅ 排序和清除筛选
- ✅ 商品详情页访问
- ✅ 无效商品路由 404
- ✅ 加入购物车反馈
- ✅ 购物车数量同步
- ✅ 修改数量和移除商品
- ✅ 刷新后购物车恢复
- ✅ 移动端触控操作
- ✅ 键盘导航和焦点管理

## 开发说明

### 添加新商品

编辑 `src/data/products.ts`，按现有格式添加商品对象：

```typescript
{
  id: 'unique-id',
  slug: 'url-friendly-slug',
  name: 'Product Name',
  category: 'category-slug',
  price: 9900, // 价格单位为分 ($99.00)
  images: ['/images/products/image.jpg'],
  shortDescription: '简短描述',
  // ... 其他字段
}
```

### 添加新分类

编辑 `src/data/categories.ts`：

```typescript
{ id: '7', name: 'New Category', slug: 'new-category' }
```

### 修改品牌和样式

- 品牌名称: `src/components/SiteHeader.tsx` 和 `SiteFooter.tsx`
- 颜色主题: `tailwind.config.js` 中的 `colors` 配置
- 字体: `src/styles/index.css` 中的 Google Fonts 导入

## 技术决策记录

### 为什么选择 Vite 而非 Next.js？

项目不需要 SEO、SSR 或服务端功能，Vite 提供了更简单的客户端应用开发体验。

### 为什么使用本地持久化而非内存状态？

刷新后保留购物车符合用户对电商应用的预期。代价是不支持跨设备同步。

### 为什么使用 Zustand 而非 Context API？

Zustand 提供了更简洁的状态管理 API 和内置的持久化中间件，适合购物车这类简单全局状态。

### 为什么没有自动化测试？

根据项目要求，用户会自行测试。项目仍然包含 ESLint 和 TypeScript 静态检查。

## 贡献和反馈

这是一个演示项目，主要用于技术评估。如有问题或建议，欢迎反馈。

## 许可

演示项目，代码可自由使用。图片资产需遵守各自的许可协议（详见 `public/assets-credits.md`）。

---

**项目状态**: 开发完成 ✅  
**最后更新**: 2026-10-16  
**开发环境**: macOS, Node.js 18+, npm 9+
