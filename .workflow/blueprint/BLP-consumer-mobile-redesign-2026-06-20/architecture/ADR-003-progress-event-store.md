---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: ADR-003
title: 使用事件表驱动进度和复习
status: complete
phase: architecture
---

# ADR-003 使用事件表驱动进度和复习

## Context

当前已有 `consumer_mobile_progress_events` 表，支持 view/favorite/review。原型新增进度页和我的页，但不需要完整账号体系。

## Decision

继续使用 progress event store 作为学习状态源。后端通过事件聚合生成 counts、weak_points、recent_events、review_plan。favorite/review 使用幂等 upsert，不删除 view 记录。

## Alternatives

- 单独建 favorites/review_plan 表：查询简单，但当前需求不需要复杂状态。
- 引入账号系统：长期合理，但超出本次 MVP。

## Consequences

- 实现成本低，符合当前 schema。
- 复习计划是规则生成，不是长期持久计划。
- 后续若接入登录，可迁移 user_key 到真实 user_id。
