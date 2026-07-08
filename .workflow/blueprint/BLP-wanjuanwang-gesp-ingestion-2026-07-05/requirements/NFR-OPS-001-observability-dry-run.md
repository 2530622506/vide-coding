---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
id: NFR-OPS-001
---

# NFR-OPS-001 可观测性与 dry-run

The ingestion pipeline MUST produce machine-readable run reports for discovery, parsing, classification, persistence and rollback.

Acceptance criteria:

- `dry-run` report includes page count, question count by level/type, parse failures, missing fields and duplicate keys.
- DB write report includes inserted, updated, skipped and failed counts.
- Logs include run_id, source_url, canonical_problem_id and error class.
