---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: REQ-001
title: 首页学习任务流
status: complete
phase: requirements
priority: Must
mvp: true
---

# REQ-001 首页学习任务流

## User Story

作为 GESP C++ 学习者，我希望打开 C 端首页后直接看到今日建议、继续学习和题库入口，以便不用理解完整系统也能开始练习。

## Requirements

- 首页 MUST 按原型展示 `GESP 练习`、今日建议主卡、继续学习、题库入口、知识点进度和底部导航。
- 今日建议 MUST 由后端页面级聚合模型返回，至少包含标题、说明、CTA、目标题目或知识点。
- 继续学习 MUST 优先使用最近 viewed/reviewed/favorite 事件；无事件时 SHOULD 回退到 featured GESP problem。
- 题库入口 MUST 并列展示 GESP 全等级和 AtCoder 独立专区，不得将 AtCoder 混入 GESP 等级。
- 首页 SHOULD 一次主请求拿到首屏所需数据，避免多接口瀑布造成首屏闪烁。

## Acceptance Criteria

1. 在 390px 宽度下首页无横向滚动，底部导航不遮挡今日建议和继续学习主信息。
2. 当后端有 progress events 时，继续学习展示最近题目；无事件时展示推荐题目。
3. GESP 和 AtCoder 入口展示题目数量，点击后能进入对应题库状态。
4. API 返回空数据时，首页展示可理解的空状态，不出现 `undefined` 或空白卡片。

## Source Anchors

- `prototypes/gesp-redesign/c-mobile-redesign-2026.html`
- `apps/web/src/pages/consumer/ConsumerMobileViews.tsx`
- `apps/api/src/consumer-mobile.service.ts`
