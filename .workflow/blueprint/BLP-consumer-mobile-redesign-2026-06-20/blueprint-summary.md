---
session_id: BLP-consumer-mobile-redesign-2026-06-20
title: Blueprint Summary
status: complete
phase: summary
created_at: 2026-06-20T11:43:00+08:00
---

# Blueprint Summary

## 一句话目标

基于 `c-mobile-redesign-2026` 原型，把当前 C 端移动页重构为 5 屏学习任务流，并补齐 Consumer Mobile 后端页面级模型、学习进度、收藏夹和复习计划接口。

## 关键范围

- 首页：今日建议、继续学习、题库入口、知识点进度。
- 题库：GESP 等级/知识点/题型筛选，AtCoder 独立入口。
- 题目：题干、选项/样例、解题线索、参考代码、收藏/复习动作。
- 进度：本周概览、掌握度、薄弱知识点、最近动作。
- 我的：学习档案、收藏夹、复习计划。

## API 决策

保留现有 `consumer-mobile` REST 接口，扩展 `GET /consumer-mobile` 和 `GET /consumer-mobile/progress` 为页面级聚合模型。`POST /consumer-mobile/progress/events` 继续作为 view/favorite/review 行为写入入口，并固定校验和幂等语义。

## 执行计划

1. 后端页面级模型与 API 修复。
2. 5 屏移动 UI 重构。
3. 学习进度、收藏和复习闭环。
4. API 契约、构建、截图验收。

## 主要文件

- PRD：`requirements/_index.md`
- 架构：`architecture/_index.md`
- 任务拆分：`epics/_index.md`
- 质量报告：`readiness-report.md`

## Gate

Pass，88/100。可以进入实现。
