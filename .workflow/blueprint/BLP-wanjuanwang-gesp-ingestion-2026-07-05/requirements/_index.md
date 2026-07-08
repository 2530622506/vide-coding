---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
---

# Requirements Index

## Functional Requirements

| ID | Title | Priority | Trace |
| --- | --- | --- | --- |
| REQ-001 | 万卷网试卷发现与抓取配置 | Must | F-001 |
| REQ-002 | 题目 HTML 解析与资产抽取 | Must | F-002 |
| REQ-003 | 结构化入库与幂等更新 | Must | F-003 |
| REQ-004 | 知识点与算法范畴映射 | Must | F-004 |
| REQ-005 | 选择题和判断题导航入口 | Must | F-005 |
| REQ-006 | 编程题工作台回填 | Must | F-005 |
| REQ-007 | 审计、复核和回滚 | Should | F-006 |

## Non-Functional Requirements

| ID | Title | Priority |
| --- | --- | --- |
| NFR-PERF-001 | 爬虫性能与限速 | Must |
| NFR-SEC-001 | 来源合规与权限边界 | Must |
| NFR-OPS-001 | 可观测性与 dry-run | Must |

## MoSCoW Summary

- Must：REQ-001、REQ-002、REQ-003、REQ-004、REQ-005、REQ-006、NFR-PERF-001、NFR-SEC-001、NFR-OPS-001
- Should：REQ-007
- Could：后续接入更多考试月份和 Python/图形化题源
- Won't：绕过权限采集答案解析

## Core Data Model

| Entity | Existing Storage | New/Updated Fields |
| --- | --- | --- |
| ClassificationRecord | `classification_records.record_json` | `source_signals.wanjuanwang`、第三方 source evidence、level 1-8 |
| ProblemDetail | `problem_details.detail_json` | HTML sections、choice options、sample cases、visual assets、source_terms_status |
| AnswerGuidance | `problem_answer_guidance.guidance_json` | 对不可见答案记录 `needs_review`，不得伪造答案 |
| SourceVersion | `source_versions.source_json` | `source_kind=wanjuanwang_exam`、`questionid`、`content_hash`、`fetched_at` |
| ReviewQueueItem | `review_queue_items.item_json` | 第三方来源复核、知识点冲突、图片授权状态 |

## Traceability Matrix

| Goal | Requirements | Architecture | Epics |
| --- | --- | --- | --- |
| 发现并采集 1-8 级试卷 | REQ-001、REQ-002 | ADR-001、ADR-002 | EPIC-001 |
| 入库并保留证据 | REQ-003、REQ-007、NFR-SEC-001 | ADR-002、ADR-003 | EPIC-002 |
| 分类并回到练习位置 | REQ-004、REQ-006 | ADR-004 | EPIC-003 |
| 题型导航体验 | REQ-005 | ADR-005 | EPIC-004 |
| 可验证可回滚 | NFR-OPS-001、REQ-007 | ADR-003 | EPIC-005 |
