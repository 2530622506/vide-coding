---
session_id: BLP-consumer-mobile-redesign-2026-06-20
title: C 端移动页重构 Product Brief
status: complete
phase: product-brief
created_at: 2026-06-20T11:08:00+08:00
source:
  - prototypes/gesp-redesign/c-mobile-redesign-2026.html
  - prototypes/gesp-redesign/c-mobile-redesign-2026.png
---

# C 端移动页重构 Product Brief

## 背景

当前项目已经具备 GESP 分类目录、AtCoder 独立题库、题目详情、参考代码和基础进度事件接口。现有 C 端移动页能跑通主要数据链路，但视觉上仍停留在旧版浅蓝绿大卡片风格，且页面体验偏「数据展示」，没有形成原型图所体现的「学习任务流」。

新的 5 屏原型明确了目标体验：

- 首页：优先显示今日建议、继续学习、题库入口和知识点进度。
- 题库：按等级、知识点/算法范畴、题型快速筛选，并展示推荐题目。
- 题目：聚焦题干、选项/样例、解题线索和参考代码入口。
- 进度：展示本周概览、掌握度、薄弱知识点和最近动作。
- 我的：沉淀学习档案、收藏夹和复习计划。

## 产品目标

1. 将 C 端移动页重构为与新原型一致的简洁学习任务流界面。
2. 将散装前端拼接的数据收敛为稳定的 Consumer Mobile 页面级聚合模型。
3. 补齐或修复今日建议、薄弱知识点、收藏夹、复习计划和最近动作相关 API。
4. 保持 GESP 分类目录优先，AtCoder 独立展示，不混淆两个题库体系。
5. 建立可测试的前后端契约和移动端截图验收流程。

## 用户与场景

### 学习者

学习者打开移动页后，应能直接看到下一步要做什么，而不是先理解复杂目录。用户可以从今日建议进入题目，也可以主动通过题库筛选知识点；完成浏览、收藏、复习后，进度和我的页面会同步反馈。

### 内容维护者

内容维护者需要确认 C 端是否正确消费 GESP 官方优先分类、AtCoder 独立题库和题目详情完整度。接口合同必须清晰，避免前端靠隐式字段推断页面状态。

### 开发者

开发者需要可执行的任务拆分：先稳住后端模型，再重构前端组件，最后用测试和截图闭环验收。

## 范围

### In Scope

- 重构 `ConsumerMobilePage`、`ConsumerMobileViews`、`ConsumerMobilePage.css` 到原型视觉。
- 调整或新增 `ConsumerMobileData` 类型和 `consumerMobile.ts` API client。
- 优化 `consumer-mobile` 后端聚合服务，补齐页面级模型。
- 明确 `progress/events` 的 view/favorite/review 行为语义。
- 增加收藏夹、最近动作、薄弱知识点、复习计划的稳定返回结构。
- 增加 API 验证脚本、前端类型检查、移动端截图验收。

### Out of Scope

- 不引入登录、账号体系或服务端用户中心。
- 不新增在线判题、提交记录或排行榜。
- 不改管理端 Workbench 信息架构。
- 不改变 GESP 官方分类和 AtCoder 数据源的基础语义。

## 成功指标

- 5 个 C 端页面状态在 390px 移动宽度下无横向滚动、无核心内容遮挡。
- 首页、题库、题目、进度、我的都能从后端真实数据渲染，不依赖硬编码演示文案。
- `GET /consumer-mobile` 或新聚合接口能一次性返回首页所需今日建议、继续学习和摘要数据。
- 进度页和我的页能稳定展示 favorites、reviewed、viewed、weak_points、review_plan。
- API 验证脚本覆盖新增/修正接口的主要字段。
- `pnpm run build:web` 和相关 API 验证脚本通过。

## 多视角综合

### Product 视角

新原型的价值不在装饰，而在让用户少思考下一步。首页应是任务流，不是数据看板；题库页应保留主动筛选能力；进度和我的页应把用户行为沉淀成复习入口。

### Technical 视角

当前后端已有目录和进度基础，重构不需要推翻服务。风险点在于页面需要的模型比当前接口更稳定，应该引入 Consumer Mobile View Model 层，而不是让前端跨多个接口做复杂拼装。

### UX 视角

移动端必须减少表单感。等级和题型筛选应从 select 改为 chip/segmented controls；底部导航应固定且不遮挡内容；卡片半径、色彩和按钮状态应统一到原型设计语言。

## 关键决策

1. 保留现有 `x-consumer-user-key` anonymous 方案，暂不引入登录。
2. 优先扩展 `GET /consumer-mobile` 为页面级聚合模型；必要时新增细分接口，但避免前端多接口瀑布。
3. `progress/events` 继续作为行为写入入口，但需要明确 favorite/review 可重复写入的幂等语义。
4. GESP 和 AtCoder 题库入口并列展示，AtCoder 不映射到 GESP 等级。
5. 原型视觉作为验收基准，业务数据字段以当前后端事实为准。
