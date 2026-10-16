# 海外商品选购 Web 应用体验调研

调研日期：2026-10-16

## 调研范围与样本
本轮以 Baymard Institute 对美国/欧洲领先电商网站的桌面、移动端 UX 基准研究为主要横向证据，并查看 Etsy 官方购物帮助作为实际产品流程案例。Baymard 的 2025 产品列表/筛选基准汇总了 170+ 网站、21,000+ 项人工评估；其 2026 移动端趋势研究和产品详情页研究作为补充。它是体验模式调研，不是对各品牌的完整逐屏测评。

## 市场模式

| 代表模式 | 可借鉴之处 | 不宜照搬之处 |
|---|---|---|
| 大型综合零售（以大目录零售模式为参照） | 搜索与品类导航承担高效找货任务；结果页通过排序、筛选快速缩小集合；关键价格、评价、配送/库存线索帮助判断 | 信息密度和促销元素容易压过层级；本题数据量和时间有限，无需复制大平台复杂筛选、推荐系统或广告体系 |
| 兴趣/独特商品发现（Etsy） | 搜索支持描述性长尾表达；结果可按相关性/价格/评价/上新排序；筛选结合价格、预计送达、促销、品类等购买条件；礼物/主题内容带来探索入口 | 市集的店铺、个性化定制和卖家信任链复杂；无后端演示不必伪装真实 marketplace |
| 高视觉叙事的品牌直营（模式判断，未作单站专项测评） | 适用于突出少量精选商品、图像、卖点与配置选择的商品详情表达 | 不适合照搬单品牌极简陈列来承担大量商品搜索和多维过滤 |

## 研究结论
- 商品列表不是单纯的卡片网格：商品信息、筛选、排序和浏览密度共同决定消费者能否发现候选商品。Baymard 2025 产品列表/筛选基准涵盖美国和欧洲 170+ 家领先电商网站、21,000+ 项人工评估；报告中 58% 的桌面站点和 78% 的移动站点在产品列表 UX 上处于较差至一般水平。
- 移动端筛选常需要独立面板，应能清楚查看已选条件并继续调整，避免用户反复来回；同类筛选值应允许组合。
- 商品卡片应提供判断是否值得点开的关键信息及多张商品图线索；不要只用漂亮图片和无信息量 CTA。
- Etsy 的官方帮助明确展示了以描述性查询开始、按相关性/价格/评价/上新排序，并按价格、预计送达、优惠及品类过滤的流程。
- 动效服务于状态变化与空间关系，不应牺牲找货速度；不建议使用自动轮播来承载首页关键信息。

## 对本项目的建议
1. 避免“泛 Amazon 克隆”。用户已认可采用独立设计的家居与日常生活精选商店，结合「编辑式精选发现 + 可靠的搜索/筛选 + 清晰购物车反馈」作为产品方向。
2. MVP 聚焦首页/精选入口、商品列表（搜索、少量相关筛选与排序）、商品详情、购物车抽屉或页面。暂不做账户、真实库存/运费、支付、个性化算法或大型分类树。
3. 桌面端采用清楚的导航与列表过滤；移动端将筛选放在易操作的抽屉/全屏面板中，提供已选条件概览、结果数量和显眼的应用/清除动作。
4. 商品卡片/详情展示真实感数据：价格、评分/评价数、颜色或规格等关键属性、配送预期/退换承诺（作为可解释的模拟数据）。购物车明确数量、金额小计、移除与继续购物反馈。
5. 动效优先用于加入购物车、数量更新、筛选面板、收藏反馈和页面过渡；保持短促、可预测，并尊重系统减少动态效果偏好。避免自动轮播、长时间挡操作的过场动画。
6. 代码质量建议先定义可复用且类型安全的 Product、Variant、Category/Facet、CartItem 模型，将模拟数据与展示组件解耦；筛选/排序/cart 的纯逻辑可独立测试。避免把所有交互和商品数据塞进单个页面组件。

## 来源
- Baymard Institute, Product Lists UX: https://baymard.com/research/ecommerce-product-lists
- Baymard Institute, Current State of Product List and Filtering UX (updated 2025-09-09): https://baymard.com/research-articles/current-state-product-list-and-filtering
- Baymard Institute, Mobile E-Commerce UX: https://baymard.com/research/mcommerce-usability
- Etsy Help, How to Search for Items and Shops on Etsy: https://help.etsy.com/hc/en-us/articles/115015627947-How-to-Search-for-Items-and-Shops-on-Etsy
- Etsy, Evolving search and discovery to bring buyers the best of Etsy: https://www.etsy.com/news/evolving-search-and-discovery-to-bring-buyers-the-best-of-etsy
- Baymard Institute, Product List UX 2025 (170+ sites, 21,000+ evaluated parameters): https://baymard.com/research-articles/current-state-product-list-and-filtering
- Baymard Institute, Current State of Ecommerce Product Page UX (2026): https://baymard.com/research-articles/current-state-ecommerce-product-page-ux
- W3C WAI, Animation from Interactions (WCAG 2.2): https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions
- Motion for React, useReducedMotion: https://motion.dev/docs/react-use-reduced-motion

## 前端渲染方向补充调研

题目要求 React，但没有要求 SEO、服务端数据或后端。官方文档显示：Vite 可作为现代 Web 项目的开发/构建底座；Next.js 可实现客户端 SPA，也可做静态导出，并能为每个路由生成 HTML；其静态导出同时不支持依赖 Next.js runtime 的动态功能。

**暂定建议：** 若本项目是模拟数据的面试演示，不要求搜索引擎收录商品页，优先 Vite + React + TypeScript，减少框架概念和部署约束，让实现精力投入浏览、筛选和购物车交互。若用户要求公开商品页被搜索引擎收录，改选 Next.js 静态生成路线（数据构建期可用）；不因“电商通常需要 SEO”未经确认就引入服务端能力。

来源：
- Vite, Why Vite: https://vite.dev/guide/why.html
- Next.js, Single-Page Applications: https://nextjs.org/docs/app/guides/single-page-applications
- Next.js, Static Exports: https://nextjs.org/docs/app/guides/static-exports


## UI 组件与样式方案调研

- 用户已确认采用 Tailwind CSS + 选择性使用 shadcn/ui 基础组件，而非完整重皮肤的通用商城模板：Tailwind 官方提供 Vite 集成；shadcn/ui 官方将其定义为组件代码分发方式，组件源代码进入项目、可直接修改，并强调可组合与可访问。
- 项目保留自己的设计 token、商品卡片、筛选面板、导航和购物车等业务组件；shadcn/ui 只用于 Button、Dialog/Sheet、Checkbox、Slider 等基础交互原语，避免默认外观把界面带成通用后台。
- 权衡：代码拥有权与视觉定制性更高，但组件复制到仓库后需要自行维护，不应将每个细小 UI 都抽象成组件或引入多套风格不同的 UI 库。

来源：
- shadcn/ui, Introduction: https://ui.shadcn.com/docs
- shadcn/ui, Installation: https://ui.shadcn.com/docs/installation
- Tailwind CSS, Install with Vite: https://tailwindcss.com/docs/installation/using-vite


## 动效实现方案调研

Motion for React（npm 包名 `motion`，React 导入路径 `motion/react`）支持 React 组件进入/退出、手势与布局变化动画；其官方无障碍文档提供全局 `reducedMotion="user"` 和 `useReducedMotion`，可根据系统设置关闭位移/布局动画或改为淡入淡出。

用户已确认追求更高级、流畅、允许明显动效的体验，采用 CSS transition 处理颜色、阴影、基础 hover/focus；Motion 用于筛选/购物车 Sheet 进出、加购反馈或列表变化等关键状态。系统 reduced-motion 兼容作为可选兜底，不影响默认动效表现。此方案比只用 CSS 多一个依赖，但能更可靠地管理组件卸载时的退出动画和共享布局变化。

来源：
- Motion for React, Installation: https://motion.dev/docs/react-installation
- Motion for React, Layout animations: https://motion.dev/docs/react-layout-animations
- Motion for React, Accessibility: https://motion.dev/docs/react-accessibility

## 路由结构补充调研

React Router 官方当前支持 Vite 等 bundler 项目中的客户端路由；其 declarative 路由可通过 URL path 和动态参数映射到页面，并提供 `useSearchParams` 读取筛选/查询参数。对本项目的模拟数据 SPA 足够，不需采用服务端路由模式。

推荐路径：`/` 首页精选、`/shop` 商品列表、`/products/:slug` 商品详情、`/cart` 购物车。排序/筛选/关键词可编码在 `/shop` 的 query string，便于刷新保留状态；购物车可用全局 Drawer/Sheet 预览，同时提供独立 `/cart` 页面保证移动端与键盘操作完整。

来源：
- React Router, Declarative Installation: https://reactrouter.com/start/declarative/installation
- React Router, Declarative Routing: https://reactrouter.com/start/declarative/routing
- React Router, URL Values: https://reactrouter.com/start/declarative/url-values

## 购物车状态建议

用户已确认本项目无登录和后端，购物车仅在当前浏览器本地持久化，刷新后保留数量与选项；不承诺跨设备同步或真实库存。采用 Zustand persist middleware 配置 `localStorage`；Store 只保留购物车领域状态与动作，不将静态商品目录或 URL 控制的筛选结果复制进去。

来源：
- Zustand, Persisting store data: https://zustand.docs.pmnd.rs/middlewares/persist

## 验证方案调研

为避免把“代码质量”停留在结构约定，建议分两层验证：
- Vitest + React Testing Library：覆盖价格/筛选/排序/购物车纯逻辑和核心组件交互；Testing Library 鼓励按用户可见行为查询，而非绑定组件内部实现。
- Playwright：验证真实浏览器核心流程（桌面与手机视口）；重点覆盖搜索/筛选、商品详情加购、抽屉和购物车更新、刷新后 localStorage 恢复。题目交付说明只陈述实际跑过的场景，不声称未经运行的覆盖。

来源：
- Vitest, Guide: https://vitest.dev/guide/
- Testing Library, React Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Playwright, Browsers and device projects: https://playwright.dev/docs/browsers


## 验证范围决策

用户明确表示自动化测试不需要随本次实现添加，将自行测试。因此以上 Vitest / Testing Library / Playwright 仅作为可选研究建议，不纳入本次依赖或实施清单。实现阶段仍应运行 TypeScript/lint（若配置）和生产构建，并向用户说明手动可验证的场景与已知问题；不得声称运行过未执行的检查。

## 商品图片来源与交付可靠性

用户允许从网络获取图片。调研官方许可后，建议使用 Pexels 上适合家居/生活方式的图片作为**演示用氛围/商品示意素材**，经筛选、裁切和压缩后保存到项目 `public/images/products/`，并维护 `assets-credits.md` 记录原页面、摄影者、下载日期与许可说明。这样构建/演示不依赖第三方图片 URL 在线可用。

限制与注意事项：
- 不抓取 Amazon、Etsy、品牌独立站等零售商的商品摄影；这些图片通常受版权保护，网页可访问不等于允许复制。
- Pexels 官方许可允许将素材用于网站和电商商店，但禁止把未修改的照片作为实体商品/海报原样售卖，也禁止暗示图中人物或品牌背书。图片应作为模拟商品视觉示意，不伪称为真实上架货品实拍，注意避开明显商标/可识别品牌。
- Unsplash 普通许可虽然允许许多免费商业用途，但明确不允许汇编图片来复制类似或竞争服务；由于本项目本身是商品发现/选购应用，不把 Unsplash 作为本项目默认商品目录素材源。
- 如果改用 Unsplash 官方 API，则必须遵循 API 指南并直接热链 API 返回的图片 URL，而不是下载后本地再分发。
- 为保证加载体验，使用合适裁切/尺寸、懒加载和明确宽高/比例，避免 CLS；首屏主视觉可优先加载。

来源：
- Pexels License: https://www.pexels.com/license/
- Unsplash License: https://unsplash.com/license
- Unsplash API Guidelines: https://unsplash.com/documentation
- MDN `<img>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img
