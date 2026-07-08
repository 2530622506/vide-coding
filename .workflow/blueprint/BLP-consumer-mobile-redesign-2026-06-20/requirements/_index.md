---
session_id: BLP-consumer-mobile-redesign-2026-06-20
title: C 端移动页重构 PRD 索引
status: complete
phase: requirements
created_at: 2026-06-20T11:18:00+08:00
---

# PRD 索引

## 需求概览

| ID | 标题 | 优先级 | MVP | 追踪目标 |
|---|---|---:|---:|---|
| REQ-001 | 首页学习任务流 | Must | 是 | 今日建议、继续学习、题库入口 |
| REQ-002 | 题库筛选与推荐列表 | Must | 是 | GESP 分类目录优先 |
| REQ-003 | 题目阅读与解题动作 | Must | 是 | 题干、选项/样例、收藏、参考代码 |
| REQ-004 | 进度页与薄弱知识点 | Must | 是 | 掌握度、弱项、最近动作 |
| REQ-005 | 我的页学习档案 | Must | 是 | 收藏夹、复习计划、学习数据 |
| REQ-006 | Consumer Mobile API 合同 | Must | 是 | 页面级聚合模型和事件语义 |
| NFR-USABILITY-001 | 移动端可用性 | Must | 是 | 无横向滚动、无遮挡、触控目标 |
| NFR-PERF-001 | 性能与接口响应 | Should | 是 | P95 响应、首屏加载 |
| NFR-RELIABILITY-001 | 降级与错误处理 | Must | 是 | MySQL 不可用、空数据 |
| NFR-TEST-001 | 契约和视觉验收 | Must | 是 | API 验证、截图对比 |

## MoSCoW

### Must

- 5 屏移动端 UI 按原型重构。
- 后端返回今日建议、继续学习、薄弱知识点、收藏夹、复习计划所需数据。
- GESP 目录筛选保持 level -> domain -> problem type -> problems。
- 学习事件必须写入或降级，并在响应中暴露 `data_source`。
- 移动端布局必须避免底部导航遮挡核心内容。

### Should

- 首页尽量一次请求拿到首屏数据。
- 题库筛选交互保留搜索能力。
- AtCoder 保持独立难度/标签筛选。
- 增加截图验收脚本。

### Could

- 提供复习计划重新生成按钮。
- 增加前端 skeleton 和 optimistic favorite 状态。
- 增加轻量级动效，但必须尊重 reduced-motion。

### Won't

- 不做登录。
- 不做在线判题。
- 不做课程销售页面。

## 核心实体

### ConsumerMobilePageModel

- `home`: 首页任务流数据。
- `catalog`: GESP/AtCoder 入口摘要。
- `progress`: 学习进度摘要和弱项队列。
- `profile`: 收藏夹、复习计划、学习档案。
- `navigation`: 当前支持的 tab 和默认 view。

### LearningTask

- `id`
- `kind`: `continue | weak_point | review | featured`
- `title`
- `subtitle`
- `problem_id`
- `source`
- `cta_label`
- `priority`

### ProgressEvent

- `problemId`
- `source`: `gesp | atcoder`
- `title`
- `type`: `view | favorite | review`
- `recordedAt`

### ReviewPlan

- `generated_at`
- `items[]`
- `basis`: `favorites | viewed | weak_points`
- `status`: `empty | ready | stale`

## Traceability

| 目标 | Requirements | Architecture | Epics |
|---|---|---|---|
| 原型视觉落地 | REQ-001~REQ-005, NFR-USABILITY-001 | ADR-001 | EPIC-002 |
| 接口补齐修复 | REQ-006, NFR-RELIABILITY-001 | ADR-002, ADR-003 | EPIC-001 |
| 学习进度闭环 | REQ-004, REQ-005 | ADR-003 | EPIC-003 |
| 验收闭环 | NFR-TEST-001, NFR-PERF-001 | ADR-004 | EPIC-004 |

## 验收入口

- 原型源：`prototypes/gesp-redesign/c-mobile-redesign-2026.html`
- 原型图：`prototypes/gesp-redesign/c-mobile-redesign-2026.png`
- 前端入口：`apps/web/src/pages/ConsumerMobilePage.tsx`
- 后端入口：`apps/api/src/consumer-mobile.controller.ts`
