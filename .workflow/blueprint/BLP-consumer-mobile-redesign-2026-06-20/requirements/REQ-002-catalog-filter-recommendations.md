---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: REQ-002
title: 题库筛选与推荐列表
status: complete
phase: requirements
priority: Must
mvp: true
---

# REQ-002 题库筛选与推荐列表

## User Story

作为学习者，我希望按等级、知识点/算法范畴、题型快速筛选 GESP 题目，并看到薄弱优先的推荐题目。

## Requirements

- 题库页 MUST 以 GESP 分类目录主线组织：level -> algorithm domain -> problem type -> problems -> knowledge points。
- 等级筛选 MUST 使用 chip/segmented control 形式，默认优先五级或后端推荐等级。
- 当前筛选摘要 MUST 展示等级、知识点/算法范畴、题目数量。
- 题型分布 MUST 支持切换 problem type，并刷新推荐题目列表。
- 推荐题目排序 SHOULD 优先薄弱知识点、未复习题目、最近收藏题目。
- AtCoder 入口 MUST 保持独立筛选，不套用 GESP 等级。

## Acceptance Criteria

1. 点击等级 chip 后，题库列表、当前筛选和题型分布同步变化。
2. 点击题型 chip 后，题目列表只展示对应 problem type。
3. 搜索输入 SHOULD 可按题名、知识点、官方题号过滤。
4. AtCoder chip 或入口进入 AtCoder 独立题库，不显示 GESP 等级层级。

## Source Anchors

- `apps/api/src/consumer-mobile.controller.ts`
- `apps/api/src/consumer-mobile.service.ts`
- `apps/web/src/services/consumerMobile.ts`
