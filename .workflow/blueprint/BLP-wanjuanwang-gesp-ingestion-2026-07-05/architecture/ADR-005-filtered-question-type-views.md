---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: architecture
id: ADR-005
---

# ADR-005 Implement Selection/Judgment as Filtered Catalog Views

## Context

The left navigation needs new selection and judgment entries, while the core IA remains classification-directory-first.

## Decision

Add routes such as `/gesp/selection` and `/gesp/judgment` that reuse catalog APIs with a `question_type` filter and a type-focused list layout.

## Alternatives

- Duplicate pages with separate data models: rejected as unnecessary.
- Put all question types only inside the workbench: rejected because the user requested direct navigation entries.

## Consequences

The UI gains fast drill paths while retaining shared detail panels, filters, source evidence and return context.
