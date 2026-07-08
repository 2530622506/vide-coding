---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: NFR-RELIABILITY-001
title: 降级与错误处理
status: complete
phase: requirements
priority: Must
mvp: true
---

# NFR-RELIABILITY-001 降级与错误处理

- 后端 MUST 在 MySQL 连接失败时降级到 memory progress store。
- 降级结果 MUST 标记 `data_source: memory`。
- 前端 MUST 对空 catalog、空 progress、空 favorites、空 review_plan 提供明确空状态。
- 后端 MUST 捕获数据库和 JSON 解析错误，并返回不含敏感信息的错误消息。

## Acceptance Criteria

1. 关闭 MySQL 后，C 端页面仍可打开并展示 memory 数据源。
2. 缺少题目详情时，题目页显示「暂无详情」而不是崩溃。
3. 非法 progress event 不会写入脏数据。
