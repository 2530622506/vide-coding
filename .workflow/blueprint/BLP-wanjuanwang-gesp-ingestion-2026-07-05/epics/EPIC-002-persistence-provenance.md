---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: epics
id: EPIC-002
---

# EPIC-002 Persistence and Source Provenance

## Stories

1. As a maintainer, I want parsed records transformed into existing catalog JSON shapes, so that the API can read them without large changes.
2. As a maintainer, I want idempotent DB upserts, so that reruns update records safely.
3. As a maintainer, I want source versions for every imported question, so that provenance and rollback are possible.

## Acceptance Criteria

- Traces to REQ-003, REQ-007 and NFR-SEC-001.
- Uses stable canonical IDs.
- Inserts or updates all four main tables consistently.

## Size

L
