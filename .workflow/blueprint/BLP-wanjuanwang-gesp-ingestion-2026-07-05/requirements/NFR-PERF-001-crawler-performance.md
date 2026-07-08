---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
id: NFR-PERF-001
---

# NFR-PERF-001 爬虫性能与限速

The crawler MUST limit concurrent requests to WanJuanWang and image hosts, SHOULD use retry with exponential backoff for transient failures, and MUST finish an 8-page exam cycle within 5 minutes under normal network conditions.

Acceptance criteria:

- Configurable concurrency defaults to 2 HTML pages and 4 image downloads.
- Every request has timeout, user agent and structured result status.
- Repeated runs reuse content hashes to avoid unnecessary asset downloads.
