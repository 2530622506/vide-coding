---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: ADR-004
title: 用截图和契约测试约束重构质量
status: complete
phase: architecture
---

# ADR-004 用截图和契约测试约束重构质量

## Context

这是 UI 和 API 同时变化的重构。若只跑 TypeScript build，无法保证视觉和数据合同符合原型。

## Decision

新增 API 验证脚本和移动端截图验收。API 验证断言关键字段，截图验收覆盖 home/catalog/problem/progress/profile 5 个 view。

## Alternatives

- 只人工看页面：速度快，但不可复现。
- 引入完整视觉回归平台：成本偏高，当前阶段不必要。

## Consequences

- 重构完成后有客观验收证据。
- 需要启动本地 web/api 服务或构造 mock 数据。
- 截图差异先以人工检查为主，后续可升级为像素阈值。
