---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: NFR-TEST-001
title: 契约和视觉验收
status: complete
phase: requirements
priority: Must
mvp: true
---

# NFR-TEST-001 契约和视觉验收

- 新增或修复的 API MUST 有验证脚本或单元测试覆盖。
- 前端 TypeScript build MUST 通过。
- 移动端 5 屏 MUST 有截图验收，至少覆盖 390px 宽度。
- 验收 MUST 包括真实接口数据，不只验证静态 mock。

## Acceptance Criteria

1. `pnpm run build:web` 通过。
2. Consumer Mobile API 验证脚本通过。
3. 首页、题库、题目、进度、我的截图中底部导航 active 状态正确。
