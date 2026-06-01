# Milestone 6 Expansion 验证记录

Date: 2026-06-01
Milestone: `M6`

## Scope

- Phase 14: Multi-Level Expansion
- Phase 15: Python And Learning Paths

## Evidence

```bash
npm run validate:multi-level-expansion
npm run build:python-learning-paths
npm run validate:python-learning-paths
```

## Verified Results

- Phase 14 expands the combined C++ catalog to levels 1-8 with 411 records.
- Level 5 has zero DP tags; levels 6/7 have 56 DP tags that are not marked `out_of_level`.
- Phase 15 records 5 Python-capable official sources, 1 Python-related official document/index hit, and 15 metadata-only Python official PDF candidates.
- `npm run parse:official-pdfs:python` writes Python parser output to `data/problem-ingestion/official-python-pdf-problems.json`, separate from the C++ default output.
- Phase 15 exposes 616 C++ concepts as Python-comparable concepts and generates 40 `needs_review` learning paths from weak knowledge-point signals and prerequisites.

## Constraints

- Python PDF candidates remain metadata-only unless the explicit Python parser command is run.
- Python problem records are not promoted into the canonical C++ catalog.
- Docker/MySQL runtime verification was not repeated here because local service startup is blocked by the current approval layer; API and web builds are covered separately.
