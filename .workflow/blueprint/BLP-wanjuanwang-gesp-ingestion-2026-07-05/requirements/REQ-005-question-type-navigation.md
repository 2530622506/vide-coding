---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
id: REQ-005
---

# REQ-005 选择题和判断题导航入口

## Requirement

The web application MUST add left-side GESP navigation entries for selection questions and judgment questions.

## User Story

As a student, I want direct navigation to choice and judgment question lists, so that I can drill non-programming exam sections quickly.

## Acceptance Criteria

- MUST add `选择题` and `判断题` under the GESP navigation group in `WorkbenchLayout`.
- MUST route each entry to a filtered GESP catalog view scoped by `question_type`.
- MUST keep level selector, search, detail panel and source evidence behavior consistent with the workbench.
- MUST not remove the existing `练习工作台` algorithm-domain view.
- SHOULD preserve return context when opening a question detail page and returning to the filtered list.

## UI Constraint

The filtered views SHOULD use dense operational UI consistent with the existing Ant Design workbench, not a landing page.
