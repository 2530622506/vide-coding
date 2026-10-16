# 实施计划

> 用户已审阅并批准规划，任务已由 `task.py start` 进入 `in_progress`。本会话的执行模式为 inline：主会话直接实现与验证，不分派实现/检查子代理。

## 实施顺序

1. **实现前准备**
   - 已运行 Trellis `trellis-before-dev`；前端规范仍是初始化占位模板，以本任务 `design.md` 为准。
   - 已检查 `面试题.md`、本任务 PRD/设计及当前 git 状态；仓库暂无应用代码或已跟踪文件，不覆盖或清理无关配置。
   - 明确应用新建在仓库根目录，使用官方 Vite React + TypeScript 空项目脚手架；不使用商城模板或已有成品。

2. **初始化与工具链**
   - 创建 Vite React TypeScript 项目配置与依赖声明；仓库目前没有 package manager 约定，使用 npm 并提交 `package-lock.json`。
   - 配置 Tailwind CSS、React Router、Zustand、Motion for React；按需初始化 shadcn/ui 并只引入用到的基础组件。
   - 建立 `dev`、`build`、`preview`、`lint`、`typecheck` 命令；不配置或添加自动化测试套件。

3. **领域模型与基础视觉系统**
   - 建立 Product/Variant/CartItem 类型、USD formatter、模拟分类和商品目录。
   - 建立颜色、排版、间距、圆角、阴影和动效时长 token；实现全局 layout、Header、Footer、品牌按钮与容器。
   - 保持共享组件小而清楚，按 `design.md` 目录职责拆分，必要注释只解释非显然业务规则。

4. **本地图片资产**
   - 从 Pexels 选择合适的家居/生活方式演示图，不抓取零售商商品页图片。
   - 下载、压缩、统一裁切比例并保存到 `public/images/products/`；生成并核对 `assets-credits.md`。
   - 为图片配置 alt、尺寸/比例和非首屏懒加载；检查缺图 fallback。

5. **路由与商品发现**
   - 建立首页、`/shop`、`/products/:slug`、`/cart` 与 Not Found 路由。
   - 完成响应式导航和首页精选入口。
   - 完成搜索、品类/价格/颜色/材质筛选与推荐/上新/价格排序；将条件同步 URL query，处理空结果和清空条件。

6. **详情与购物车**
   - 完成详情图、信息、变体选择和加购反馈。
   - 实现 Zustand cart store、localStorage 持久化与异常数据回退；同一商品/变体合并数量。
   - 完成全局购物车 Drawer 与 `/cart` 页面：数量调整、移除、空状态、小计和继续购物；明确无 checkout。

7. **视觉打磨与交互质量**
   - 优化桌面/手机断点，确保触控目标、内容溢出和筛选面板可用。
   - 使用 CSS + Motion 完成有目的的 hover、筛选、加购、购物车数量和布局转场；确认默认动效有质感但不拖慢操作。
   - 补充 reduced-motion fallback、键盘焦点、Dialog/Sheet 关闭方式、输入 label、图片加载状态等基础体验。

8. **交付说明与检查**
   - 编写简短 README：依赖、启动/构建命令、目录说明、商品/图片来源、功能范围和已知限制。
   - 运行 `npm run lint`、`npm run typecheck`、`npm run build`，修复本次变更引入的问题。
   - 确认开发服务器能启动，浏览主要路由并记录实际手动核验情况；自动化测试由用户自行完成，不声称测试覆盖。
   - 检查图片许可清单、无密钥、没有误加入 `node_modules`、无未授权模板资产。

## 手动核验清单（交付说明记录实际执行项）
- 首页桌面/手机布局与进入商品列表。
- 商品搜索、各筛选维度、排序、清除筛选和空结果恢复。
- 商品详情深链接、无效商品路由、变体选择和加购反馈。
- 购物车抽屉与完整购物车数据一致；修改数量、移除、空购物车和小计。
- 刷新后购物车恢复；清除损坏/过期本地状态时页面不崩溃。
- 窄屏筛选面板、导航、焦点/关闭行为与主要按钮触控。
- 所有本地图片加载、缺图 fallback 和来源清单完整。

## 风险文件与回退点
- `package.json`、`package-lock.json`、Vite/Tailwind 配置：固定使用 npm，避免混合 lockfile。
- `src/features/cart/*`：涉及持久化与金额派生；改动保持 cart item schema 与 product catalog 单向关联，必要时删除旧本地存储版本回退。
- `src/features/catalog/*`：筛选维度与 URL 参数映射集中实现，避免多处重复解析。
- `public/images/products/*`、`assets-credits.md`：图片逐项记录来源；许可或来源不明时直接移除并替换。
- 若动效导致滚动/点击延迟，优先回退到 transform/opacity 简单转场，不影响功能逻辑。

## 完成门槛
- PRD AC-1 至 AC-6 均在实现说明中逐项对照。
- 静态检查和构建通过，或在交付说明中明确环境阻塞及未完成项。
- 用户明确执行自己的验收；不要把当前规划审批当作实现授权。
