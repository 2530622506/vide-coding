---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
id: REQ-002
---

# REQ-002 题目 HTML 解析与资产抽取

## Requirement

The crawler MUST parse each exam page into structured question records grouped by selection, judgment and programming sections.

## User Story

As a student, I want choice options, judgment statements, programming statements, samples and images to display correctly, so that I can practice without opening the original paper repeatedly.

## Acceptance Criteria

- MUST map `单选题` to `selection`、`判断题` to `judgment`、`编程题` to `programming`.
- MUST extract question number, WanJuanWang `questionid`, stem HTML/Markdown, code blocks and detail link.
- MUST extract choice options from `table[name='optionsTable']` for selection questions.
- MUST represent judgment questions with standard `T/F` options when no explicit option table exists.
- MUST extract programming statement sections including problem description, input, output, samples, sample explanation and data range when present.
- MUST extract image URLs, alt text, source URL and content hash for local asset metadata.
- MUST preserve math/code/table semantics as Markdown or safe HTML sections.

## Error Conditions

- If a question cannot be parsed, the crawler MUST keep its raw minimal metadata and create a high-priority review item.
- If an image download fails, ingestion SHOULD proceed with remote URL and `visual_asset_status=pending_collection`.
