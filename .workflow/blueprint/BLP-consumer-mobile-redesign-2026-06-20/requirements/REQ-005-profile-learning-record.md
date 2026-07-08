---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: REQ-005
title: 我的页学习档案
status: complete
phase: requirements
priority: Must
mvp: true
---

# REQ-005 我的页学习档案

## User Story

作为学习者，我希望我的页面集中展示收藏题、复习中题目和今日复习计划，以便快速回到个人学习记录。

## Requirements

- 我的页 MUST 展示学习档案主卡、学习数据、收藏夹、复习计划。
- 收藏夹 MUST 由后端返回 favorites 摘要，而不是前端从 progress 事件随意拼装。
- 复习计划 MUST 基于 favorites、viewed、weak_points 生成，缺少数据时返回 `status: empty`。
- 学习数据 MUST 至少包括收藏数、复习中数量、最近查看数。
- 复习计划 SHOULD 支持重新生成，但 MVP 可先通过规则生成静态列表。

## Acceptance Criteria

1. 点击题目页收藏后，我的页收藏夹出现该题。
2. 当用户没有收藏时，我的页展示推荐题或空状态。
3. 复习计划至少返回 1 到 3 个 item，或明确 `empty` 状态。
4. 我的页底部导航 active 状态正确。

## Source Anchors

- `apps/web/src/pages/consumer/ConsumerMobileViews.tsx`
- `apps/api/src/consumer-mobile.service.ts`
