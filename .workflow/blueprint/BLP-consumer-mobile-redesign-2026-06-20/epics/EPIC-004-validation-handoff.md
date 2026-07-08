---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: EPIC-004
title: 验证、截图和交付收尾
status: complete
phase: epics
mvp: true
---

# EPIC-004 验证、截图和交付收尾

## Goal

用 API 契约、构建和移动端截图确认重构完成，不只停留在视觉主观判断。

## Stories

### Story 1：API 契约验证

- Size: M
- Trace: REQ-006, NFR-TEST-001
- Acceptance:
  - 验证脚本覆盖 `/consumer-mobile`、`/progress`、`/gesp/catalog`、题目详情。
  - 断言新字段和 legacy 字段。

### Story 2：前端构建验证

- Size: S
- Trace: NFR-TEST-001
- Acceptance:
  - `pnpm run build:web` 通过。
  - TypeScript 无新增错误。

### Story 3：移动端截图验收

- Size: M
- Trace: NFR-USABILITY-001
- Acceptance:
  - 390px 宽度覆盖 5 个 view 截图。
  - 无横向滚动，无底部导航遮挡核心内容。

### Story 4：回归修复和交付说明

- Size: M
- Trace: NFR-RELIABILITY-001, NFR-PERF-001
- Acceptance:
  - 记录已验证命令和截图路径。
  - 列出未覆盖风险。

## Task List

- T4.1 新增或更新 Consumer Mobile API 验证脚本。
- T4.2 运行 API 验证和 web build。
- T4.3 启动本地页面并截图 5 个 view。
- T4.4 对照原型修复视觉差异。
- T4.5 输出交付说明和后续风险。
