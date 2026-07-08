---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: EPIC-002
title: 5 屏移动 UI 重构
status: complete
phase: epics
mvp: true
---

# EPIC-002 5 屏移动 UI 重构

## Goal

将 C 端移动页实现重构为原型图的 5 屏体验和视觉语言。

## Stories

### Story 1：首页原型落地

- Size: M
- Trace: REQ-001
- Acceptance:
  - 今日建议主卡、继续学习、题库入口、知识点进度与原型一致。
  - CTA 和收藏/继续按钮有清晰 pressed/disabled 状态。

### Story 2：题库页筛选 UI

- Size: L
- Trace: REQ-002
- Acceptance:
  - level/domain/problem type 使用 chip 或 segmented control。
  - 推荐题目列表卡片与原型一致。
  - 搜索和 AtCoder 独立入口保留。

### Story 3：题目页阅读 UI

- Size: M
- Trace: REQ-003
- Acceptance:
  - 题干卡片、选项网格、解题线索、参考代码条符合原型。
  - 收藏按钮写入 favorite event。

### Story 4：进度和我的页面 UI

- Size: L
- Trace: REQ-004, REQ-005
- Acceptance:
  - 进度页展示本周概览、掌握度、弱项列表。
  - 我的页展示学习档案、收藏夹、复习计划。
  - 底部导航 active 状态正确。

## Task List

- T2.1 建立 C 端 CSS tokens：颜色、radius、spacing、shadow。
- T2.2 重构 `ConsumerMobilePage` shell 和 header。
- T2.3 拆分 Home/Catalog/Problem/Progress/Profile 组件。
- T2.4 替换旧 select/大卡片样式为原型 chip/card。
- T2.5 调整底部导航和 safe-area padding。
- T2.6 处理 loading、error、empty states。
