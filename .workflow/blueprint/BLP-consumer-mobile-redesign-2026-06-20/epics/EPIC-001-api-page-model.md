---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: EPIC-001
title: 后端页面级模型与 API 修复
status: complete
phase: epics
mvp: true
---

# EPIC-001 后端页面级模型与 API 修复

## Goal

让后端直接提供新 C 端 5 屏需要的数据模型，减少前端拼装和字段猜测。

## Stories

### Story 1：扩展 ConsumerMobile 类型合同

As a developer, I want ConsumerMobileData 有明确的新页面级类型, so that UI 重构可以类型驱动。

- Size: M
- Trace: REQ-006
- Acceptance:
  - 新增 `ConsumerMobilePageModel`、`LearningTask`、`WeakPoint`、`ReviewPlan` 类型。
  - 保留旧 `ConsumerMobileContent` 兼容字段或明确 legacy 包装。
  - 前端 API client 返回类型与后端一致。

### Story 2：实现首页 page model builder

As a learner, I want 首页拿到今日建议和继续学习, so that 我可以直接开始练习。

- Size: L
- Trace: REQ-001
- Acceptance:
  - `GET /consumer-mobile` 返回 `home.today_task` 和 `home.continue_task`。
  - 无 progress events 时回退 featured problem。
  - GESP/AtCoder library cards 返回数量和文案。

### Story 3：增强 progress response

As a learner, I want 进度页能看到弱项和最近动作, so that 我知道下一步复习什么。

- Size: L
- Trace: REQ-004, REQ-005
- Acceptance:
  - `GET /consumer-mobile/progress` 返回 `weak_points`、`recent_events`、`review_plan`。
  - MySQL/memory 两种 data_source 结构一致。
  - favorite/review/view 均按时间倒序可读。

### Story 4：修复事件写入语义

As a developer, I want progress event 写入行为稳定, so that UI 状态不会出现重复或脏数据。

- Size: M
- Trace: REQ-003, REQ-006
- Acceptance:
  - `problemId` 缺失返回 400。
  - `source` 和 `type` 枚举行为固定并测试。
  - upsert 不删除其他事件类型。

## Task List

- T1.1 更新 `ConsumerMobileData.ts` 类型。
- T1.2 拆分 `ConsumerMobileService` builder：home、progress、profile。
- T1.3 扩展 `getMobileContent()` 返回 page model。
- T1.4 扩展 `getProgress()` 返回 weak/recent/review_plan。
- T1.5 补充 schema 或 ensureProgressSchema 兼容检查。
- T1.6 增加 Consumer Mobile API 验证脚本。
