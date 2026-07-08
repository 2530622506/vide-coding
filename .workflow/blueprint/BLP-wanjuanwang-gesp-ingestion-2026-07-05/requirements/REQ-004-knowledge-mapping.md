---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
id: REQ-004
---

# REQ-004 知识点与算法范畴映射

## Requirement

The system MUST assign candidate algorithm domains, problem type tags and knowledge point tags to ingested questions with evidence and confidence.

## User Story

As a teacher, I want newly crawled questions to appear under the right knowledge areas, so that I can build lessons and practice sets by topic.

## Acceptance Criteria

- MUST use existing official-domain rules as higher priority than WanJuanWang page knowledge labels.
- MUST record evidence snippets from the parsed question content for every inferred tag.
- MUST classify programming questions into algorithm domains used by the practice workbench.
- SHOULD classify choice and judgment questions into knowledge-oriented problem types, even when no algorithm domain is obvious.
- MUST mark inferred tags as `candidate` or `needs_review`, not `confirmed`, unless a trusted official source supports them.
- MUST apply existing GESP level constraints, including DP越级处理 rules.

## Edge Cases

- If WanJuanWang knowledge label is only a broad level label, the classifier SHOULD keep it as source metadata and infer concrete knowledge points from question text.
- If multiple domains match with close confidence, the record SHOULD enter the review queue.
