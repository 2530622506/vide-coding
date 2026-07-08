---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: epics
id: EPIC-001
---

# EPIC-001 Crawler Discovery and Parser

## Stories

1. As a maintainer, I want to run a crawler with the seed WanJuanWang URL, so that it discovers 1-8 level exam pages.
2. As a maintainer, I want each exam page parsed into sectioned question records, so that later steps can classify and persist them.
3. As a maintainer, I want images and detail links extracted with hashes, so that visual question context is not lost.

## Acceptance Criteria

- Traces to REQ-001, REQ-002 and NFR-PERF-001.
- Produces a JSON artifact grouped by level and question_type.
- Reports parse failures without aborting the entire run.

## Size

L
