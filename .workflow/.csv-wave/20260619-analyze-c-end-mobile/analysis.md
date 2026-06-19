# C 端移动页面落地分析

## Executive Summary

Go。范围为 `medium`：只涉及前端一个子系统，但需要新增路由、页面组件、样式和截图验证。实现应把 C 端作为独立移动页面，不进入 B 端 `WorkbenchLayout`，也不进入代码 IDE。

## 原型拆解

- 首页：继续学习、周进度、推荐路径、知识点覆盖。
- 题库：等级 -> 算法范畴 -> 题型，分类目录优先，不做搜索优先。
- 题目详情：题目概要、标签可信度、解题要点、学习动作。
- 代码只读：C++17 参考代码只读、行级讲解、复制/收藏/反馈入口。
- 来源证据：官方真题、OJ 入口、题解文章分层，版权安全提示。
- 我的：收藏、弱项、复习清单。

## Dimension Scores

| Dimension | Score | 结论 |
|---|---:|---|
| Feasibility | 92 | 新增静态页面和路由即可，不依赖后端。 |
| Impact | 86 | 把 PNG 原型转为可访问页面，便于真实移动端验证。 |
| Risk | 78 | 主要风险是和 B 端布局耦合、误加 IDE 入口、移动端遮挡。 |
| Complexity | 84 | 单页面加 CSS，复杂度可控。 |
| Alignment | 95 | 符合分类目录优先、官方来源优先、版权安全。 |
| Maintainability | 80 | 静态数据应集中在组件数组中，样式类名隔离。 |

## Locked Decisions

1. C 端路由使用 `/mobile`。
2. 页面不进入 IDE，代码模块只读。
3. 第一版使用静态展示数据，保证截图验证稳定。
4. C 端不使用 B 端侧栏和工作台壳。
5. 题面只展示概要、短证据和来源提示。

## Deferred

- 后续接入真实 catalog API。
- 后续支持收藏状态持久化。
- 后续将 `/mobile` 注册到 B 端入口或独立域名。

## Implementation Plan

1. 新增 `ConsumerMobilePage.tsx`，封装 6 个移动端 section。
2. 在 `App.tsx` 增加 `mobile` route state 和渲染分支。
3. 在 `styles.css` 增加 `.consumer*` 隔离样式。
4. 运行 `pnpm build:web`。
5. 启动 Vite，打开 `/mobile`，截图验证桌面和移动视口。
