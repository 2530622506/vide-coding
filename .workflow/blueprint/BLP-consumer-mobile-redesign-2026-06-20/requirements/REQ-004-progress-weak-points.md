---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: REQ-004
title: 进度页与薄弱知识点
status: complete
phase: requirements
priority: Must
mvp: true
---

# REQ-004 进度页与薄弱知识点

## User Story

作为学习者，我希望进度页告诉我本周练了多少、掌握度如何、哪些知识点最薄弱，以便安排下一次复习。

## Requirements

- 进度页 MUST 展示本周概览、掌握度、薄弱知识点、最近动作。
- 后端 MUST 返回 `mastery_pct`、`weekly_action_count`、`weak_points[]`、`recent_events[]`。
- 薄弱知识点 MUST 至少包含名称、说明、题目数、建议完成数、progress。
- 最近动作 MUST 合并 view/favorite/review 并按时间倒序。
- MySQL 不可用时 MUST 降级到 memory store，并通过 `data_source` 标记。

## Acceptance Criteria

1. 新用户无事件时进度页显示 0 或默认推荐，不报错。
2. 记录 view/favorite/review 后，本周概览数字会更新。
3. weak_points 至少能由分类覆盖进度和事件复习状态计算得到。
4. 数据源为 memory 时页面显示可理解状态，不误导为持久化进度。

## Source Anchors

- `infra/mysql/schema.sql`
- `apps/api/src/consumer-mobile.service.ts`
- `apps/web/src/pages/consumer/ConsumerMobileViews.tsx`
