# Python And Learning Paths

M6 Phase 15 adds a metadata-first Python expansion layer and learning-path outputs without mixing Python records into the C++ catalog.

## Outputs

```bash
npm run build:python-learning-paths
npm run parse:official-pdfs:python
npm run validate:python-learning-paths
```

Generated file:

- `data/learning/python-learning-paths.json`
- `data/problem-ingestion/official-python-pdf-problems.json` when the explicit Python parser command is run.

## Current Result

- Python-capable official sources: 5.
- Python official document/index hits: 1.
- Python official PDF candidates: 15.
- Cross-language shared concepts: 616.
- Learning paths: 40.
- C++ records remain separate from Python entries.

## Policy

- Python official sources and PDF candidates are metadata-only until Python PDFs are parsed explicitly.
- Python PDF parsing has a separate output path and must not overwrite `data/problem-ingestion/official-pdf-problems.json`.
- Python concepts are comparable to C++ concepts, but not merged into C++ problem records.
- Learning paths are generated from weak C++ knowledge-point/tag signals and remain `needs_review`.
- Each path includes prerequisites, weak problem references, transfer notes, and review status.

## Validation

The validator checks:

- Python official source records are canonical and metadata-only.
- Python official PDF candidates are metadata-only and point to `npm run parse:official-pdfs:python`.
- Python and C++ entries remain separate.
- Shared concepts retain C++ levels and comparable Python status.
- Learning paths contain prerequisites and weak problem references.
- All generated learning paths remain `needs_review`.
