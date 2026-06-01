# Phase 15 Python And Learning Paths 验证记录

Date: 2026-06-01
Milestone: `M6`
Phase: `python-and-learning-paths`

## Requirements

- Ingest Python official PDFs where available.
- Align shared concepts across C++ and Python.
- Generate learning paths from weak knowledge points and prerequisite relations.

## Evidence

```bash
npm run build:python-learning-paths
npm run validate:python-learning-paths
```

Output:

```text
python official sources: 5
python official documents: 1
python official PDF candidates: 15
shared concepts: 616
learning paths: 40
Python learning paths validation passed
```

## Status

- Python-capable official sources are represented as metadata-only records.
- Current official ingestion has one Python-related official document/index hit and 15 Python official PDF candidates from official attachments.
- `npm run parse:official-pdfs:python` writes to `data/problem-ingestion/official-python-pdf-problems.json`, separate from the C++ default parser output.
- No full Python problem records are mixed into the C++ catalog.
- 616 C++ concepts are exposed as Python-comparable concepts.
- 40 learning paths were generated from weak review/tag signals and prerequisite rules.
- All generated learning paths remain `needs_review`.

## Remaining Risk

Python PDF parsing is available only through an explicit separate command and was not promoted into the canonical catalog. The current Phase 15 output remains a metadata-first source and learning-path layer that keeps Python separate but comparable.
