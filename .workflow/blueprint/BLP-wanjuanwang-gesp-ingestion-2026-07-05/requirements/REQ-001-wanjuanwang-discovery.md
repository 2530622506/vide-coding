---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: requirements
id: REQ-001
---

# REQ-001 万卷网试卷发现与抓取配置

## Requirement

The system MUST support a configured WanJuanWang GESP C++ exam URL seed and discover the matching level 1-8 exam pages for the same session.

## User Story

As a content maintainer, I want to provide one WanJuanWang GESP exam URL and let the system discover the related 1-8 level pages, so that I can ingest a whole exam cycle without manually copying every link.

## Acceptance Criteria

- MUST accept an explicit seed URL and an optional allowlist of level URLs.
- MUST infer session, language, level and title from page title, breadcrumb and info list.
- MUST restrict discovery to `wanjuanwang.com/kjjs/` URLs and GESP C++ pages.
- SHOULD prefer explicit allowlist over related-link auto discovery when both are present.
- MUST write a dry-run manifest listing discovered URLs, inferred levels and rejected URLs.

## Notes

Observed 2025 年 6 月 level links include level 1-8 URLs in the related-paper list of the provided level 7 page.
