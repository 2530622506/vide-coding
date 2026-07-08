---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: epics
id: EPIC-005
---

# EPIC-005 Verification, Dry-Run and Rollback

## Stories

1. As a maintainer, I want dry-run reports before DB writes, so that I can catch parser problems.
2. As a maintainer, I want a post-ingestion validation script, so that page counts and DB counts can be compared.
3. As a maintainer, I want rollback metadata, so that third-party source records can be removed or reverted.

## Acceptance Criteria

- Traces to NFR-OPS-001 and REQ-007.
- Produces structured reports suitable for CI or manual inspection.
- Lists affected canonical IDs by run ID.

## Size

M
