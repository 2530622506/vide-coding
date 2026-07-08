---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: NFR-PERF-001
title: 性能与接口响应
status: complete
phase: requirements
priority: Should
mvp: true
---

# NFR-PERF-001 性能与接口响应

- 首页主数据请求 SHOULD 在本地开发数据量下 P95 小于 800ms。
- 题库筛选接口 SHOULD 限制列表数量，默认不超过 80 条。
- 前端 SHOULD 使用 skeleton 或稳定占位，避免首屏布局跳动。
- 页面切换 SHOULD 复用已加载数据，避免重复全量请求。

## Acceptance Criteria

1. API 验证脚本记录主要接口响应耗时。
2. 题库切换筛选不会阻塞底部导航和返回操作。
3. 初始渲染不会因为图片或公式内容造成大范围 layout shift。
