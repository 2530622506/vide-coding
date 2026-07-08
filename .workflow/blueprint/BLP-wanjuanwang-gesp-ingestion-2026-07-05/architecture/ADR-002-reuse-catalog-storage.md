---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: architecture
id: ADR-002
---

# ADR-002 Reuse Existing Catalog JSON Shapes and MySQL Tables

## Context

Existing tables already store classification records, details, answer guidance, source versions and review queue items.

## Decision

Persist WanJuanWang ingestion into existing tables and JSON shapes first. Add schema columns only after repeated query pressure proves JSON fields insufficient.

## Alternatives

- Create a separate WanJuanWang table: rejected because it fragments the catalog API and UI.
- Migrate all data model fields now: rejected as unnecessary for first ingestion.

## Consequences

Implementation is smaller and compatible with current API, but SQL querying by third-party-specific metadata may initially rely on JSON paths or source_versions.
