---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
id: NFR-SEC-001
---

# NFR-SEC-001 来源合规与权限边界

The system MUST only collect publicly visible content and MUST not bypass login, payment, answer quota, anti-bot, or permission controls.

Acceptance criteria:

- Hidden answer/analysis content behind login remains `needs_review` and is not scraped.
- Third-party content is tagged with `source_terms_status=needs_review`.
- UI and API can identify WanJuanWang-sourced records for future takedown or rollback.
