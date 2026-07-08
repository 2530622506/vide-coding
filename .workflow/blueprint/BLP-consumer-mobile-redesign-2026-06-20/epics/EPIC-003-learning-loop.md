---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: EPIC-003
title: 学习进度、收藏和复习闭环
status: complete
phase: epics
mvp: true
---

# EPIC-003 学习进度、收藏和复习闭环

## Goal

让用户行为能真实驱动首页、进度页和我的页，形成「浏览 -> 收藏 -> 复习 -> 弱项改善」闭环。

## Stories

### Story 1：浏览事件驱动继续学习

- Size: M
- Trace: REQ-001, REQ-003
- Acceptance:
  - 打开题目记录 view。
  - 首页继续学习优先展示最近 view。

### Story 2：收藏事件驱动我的页

- Size: M
- Trace: REQ-005
- Acceptance:
  - 收藏后我的页收藏夹更新。
  - 重复收藏幂等，不出现重复卡片。

### Story 3：复习事件驱动进度

- Size: M
- Trace: REQ-004
- Acceptance:
  - 标记复习后 weekly reviewed 和 mastery 更新。
  - 最近动作能显示 review。

### Story 4：规则生成复习计划

- Size: L
- Trace: REQ-004, REQ-005
- Acceptance:
  - 根据 favorites、viewed、weak_points 生成 1-3 条计划。
  - 无候选时返回 empty 状态。

## Task List

- T3.1 在题目打开、收藏、复习动作处统一调用 `recordProgress`。
- T3.2 为 favorites/reviewed/recent 建立 UI 映射。
- T3.3 实现 weak point ranking 规则。
- T3.4 实现 review plan builder。
- T3.5 增加 memory fallback 下的同构数据。
