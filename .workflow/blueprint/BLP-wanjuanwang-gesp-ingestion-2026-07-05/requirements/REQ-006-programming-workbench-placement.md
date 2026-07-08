---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
id: REQ-006
---

# REQ-006 编程题工作台回填

## Requirement

Programming questions ingested from WanJuanWang MUST appear in the GESP practice workbench under their mapped algorithm domain and problem type.

## User Story

As a student practicing algorithms, I want newly ingested programming questions to appear in the same workbench as existing GESP problems, so that I can practice by topic and open IDE directly.

## Acceptance Criteria

- MUST set `question_type=programming` for programming section questions.
- MUST populate `resolved_algorithm_domains` with at least one candidate domain or `unclassified` when no domain can be inferred.
- MUST populate samples and visual assets into `problem_details.detail_json` when present.
- MUST keep IDE launch behavior for programming questions only.
- SHOULD sort newly ingested programming questions by level and question number within their problem type.

## Review Rule

If a programming question is unclassified or has a disputed domain, it MUST still be visible under `未分类` and enter review.
