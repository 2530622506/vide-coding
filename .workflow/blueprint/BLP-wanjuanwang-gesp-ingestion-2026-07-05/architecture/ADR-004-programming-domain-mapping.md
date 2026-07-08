---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: architecture
id: ADR-004
---

# ADR-004 Classify Programming Questions Into Existing Algorithm Domains

## Context

The GESP workbench is organized by algorithm domain and problem type. The user specifically asked that programming questions return to the corresponding algorithm location.

## Decision

Programming questions use the existing classification pipeline and domain IDs. Unclassified programming questions remain visible under `未分类` and create review items.

## Alternatives

- Add a separate programming-only page: rejected because it weakens the established workbench structure.
- Hide unclassified programming questions: rejected because it makes ingestion appear incomplete.

## Consequences

Users keep one programming practice path. Classification quality can improve incrementally through review.
