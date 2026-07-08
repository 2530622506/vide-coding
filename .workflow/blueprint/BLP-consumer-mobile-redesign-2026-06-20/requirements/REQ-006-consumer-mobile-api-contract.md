---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: REQ-006
title: Consumer Mobile API 合同
status: complete
phase: requirements
priority: Must
mvp: true
---

# REQ-006 Consumer Mobile API 合同

## User Story

作为开发者，我希望 C 端页面有稳定 API 合同，以便重构 UI 时不再依赖隐式字段或多处拼装。

## Requirements

- 后端 MUST 提供稳定的 Consumer Mobile 页面级聚合模型，覆盖 home、catalog summary、progress、profile。
- `GET /consumer-mobile` MUST 保持向后兼容或提供迁移字段，避免旧前端直接崩溃。
- `GET /consumer-mobile/progress` MUST 返回 counts、events、weak_points、review_plan 或明确空结构。
- `POST /consumer-mobile/progress/events` MUST 校验 `problemId`，并限制 `source`、`type` 的枚举。
- API 错误 MUST 使用清晰消息，不暴露数据库密码、连接串等敏感信息。
- 前端 API client MUST 与 TypeScript 类型一致，避免 `unknown` 泄露到页面层。

## Acceptance Criteria

1. API 验证脚本能断言所有页面关键字段存在。
2. 不传 `x-consumer-user-key` 时，后端使用 anonymous 默认值或前端生成 key。
3. 传入非法 event type 时，后端按默认 view 或返回 400，行为必须在测试中固定。
4. MySQL schema 缺失时，服务可自动创建进度表或通过迁移脚本创建。

## Source Anchors

- `apps/api/src/consumer-mobile.controller.ts`
- `apps/api/src/consumer-mobile.service.ts`
- `apps/web/src/pages/consumer/ConsumerMobileData.ts`
- `apps/web/src/services/consumerMobile.ts`
