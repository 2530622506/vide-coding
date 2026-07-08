---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: ADR-002
title: 保留并增强现有 REST 接口
status: complete
phase: architecture
---

# ADR-002 保留并增强现有 REST 接口

## Context

项目已有 `consumer-mobile` Controller 和前端 API client。直接替换接口会增加回归风险。

## Decision

保留现有 REST endpoint，并扩展返回字段。新增字段 MUST 向后兼容；删除或重命名旧字段必须有迁移步骤。

## Alternatives

- 另建 `/consumer-mobile/v2`：更干净，但要维护双套前端 client。
- GraphQL：不符合当前 Nest REST 风格，超出本次范围。

## Consequences

- 迁移成本低。
- 需要在 TypeScript 类型中明确 legacy 与新模型边界。
- API 验证脚本必须覆盖旧字段和新字段。
