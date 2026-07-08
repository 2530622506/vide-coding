---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: architecture
id: ADR-003
---

# ADR-003 Treat WanJuanWang as Review-Required Third-Party Source

## Context

WanJuanWang publicly displays uploaded exam materials and states that some material ownership may be uncertain. Answers are not publicly visible without login.

## Decision

All WanJuanWang-sourced content enters as `needs_review` or `candidate`; the crawler must not collect hidden answer/analysis content.

## Alternatives

- Treat pages as official: rejected because project specs require official GESP sources to be authoritative.
- Ignore WanJuanWang entirely: rejected because the user explicitly requested this source and it can enrich practice content.

## Consequences

The catalog gets useful practice material while retaining provenance, review and takedown readiness.
