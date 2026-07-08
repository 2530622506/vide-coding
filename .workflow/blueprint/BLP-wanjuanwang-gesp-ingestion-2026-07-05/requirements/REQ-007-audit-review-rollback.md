---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
id: REQ-007
---

# REQ-007 审计、复核和回滚

## Requirement

The ingestion workflow SHOULD generate audit records, review queue items and rollback metadata for all WanJuanWang-sourced content.

## User Story

As a maintainer, I want to review or remove third-party sourced records quickly, so that source disputes or parser errors do not pollute the catalog.

## Acceptance Criteria

- MUST store source URL, source ID, content hash and fetched timestamp for every ingested question.
- SHOULD create review items for missing options, missing samples, failed images, broad knowledge labels and conflicting classifications.
- SHOULD produce a rollback manifest listing inserted or updated canonical IDs by run ID.
- MUST allow filtering records by `source_kind=wanjuanwang_exam`.
- MUST keep old source versions rather than losing provenance during updates.
