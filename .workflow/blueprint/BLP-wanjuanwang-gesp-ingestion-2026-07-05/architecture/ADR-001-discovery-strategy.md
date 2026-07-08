---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: architecture
id: ADR-001
---

# ADR-001 Use Explicit Allowlist Plus Related-Link Discovery

## Context

The provided level 7 page exposes related GESP C++ level links, but site recommendations may include other sessions.

## Decision

Use the seed URL and related links for discovery, but support an explicit `levelUrls` allowlist that takes precedence.

## Alternatives

- Crawl all GESP pages: rejected because it increases scope and source risk.
- Manual-only URL list: rejected because the user provided one page and expects 1-8 level discovery.

## Consequences

Discovery remains convenient while keeping crawl scope auditable and bounded.
