---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
id: REQ-003
---

# REQ-003 结构化入库与幂等更新

## Requirement

The ingestion pipeline MUST persist parsed WanJuanWang questions into the existing catalog database without creating duplicates across repeated runs.

## User Story

As a maintainer, I want to rerun the crawler after parser improvements, so that database content updates safely instead of duplicating questions.

## Acceptance Criteria

- MUST generate stable `canonical_problem_id` values from session, language, level, question_type, question_number and WanJuanWang `questionid`.
- MUST upsert `classification_records`、`problem_details`、`problem_answer_guidance` and `source_versions` in one transaction per batch or per page.
- MUST set third-party source status to `needs_review` unless manually confirmed.
- MUST not overwrite official-source classifications with lower-trust WanJuanWang labels.
- MUST store a JSON artifact before DB write for replay and rollback.
- SHOULD provide `--dry-run`、`--write-json` and `--write-db` modes.

## Data Contract

The implementation SHOULD reuse existing JSON shapes used by `CatalogService` to avoid API breakage.
