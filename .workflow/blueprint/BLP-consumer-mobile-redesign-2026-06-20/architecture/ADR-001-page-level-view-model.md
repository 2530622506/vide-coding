---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: ADR-001
title: 页面级聚合模型
status: complete
phase: architecture
---

# ADR-001 页面级聚合模型

## Context

新原型需要首页今日建议、进度薄弱点、我的收藏夹和复习计划。当前前端需要从 content、catalog、progress 多处拼接，字段语义不稳定。

## Decision

后端 SHOULD 在 `GET /consumer-mobile` 返回 ConsumerMobilePageModel，同时保留 legacy 字段兼容现有前端。页面级模型由 `ConsumerMobileService` 基于 GESP catalog、AtCoder catalog 和 progress events 聚合生成。

## Alternatives

- 前端继续多接口拼装：实现快，但页面逻辑复杂且难测。
- 新增每页独立接口：结构清晰，但首屏请求更多。

## Consequences

- 前端重构更直接，5 屏都能消费稳定模型。
- 后端 service 会变厚，需要拆分私有 builder 函数和测试。
- 兼容期内响应体会变大，但可通过 limit 控制列表长度。
