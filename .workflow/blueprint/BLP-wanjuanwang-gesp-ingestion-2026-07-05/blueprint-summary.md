---
session_id: BLP-wanjuanwang-gesp-ingestion-2026-07-05
status: complete
phase: summary
---

# Blueprint Summary

This blueprint specifies a bounded ingestion feature for WanJuanWang GESP C++ 1-8 level papers. The system should crawl public HTML pages, parse selection, judgment and programming questions, store structured content into the existing MySQL catalog, infer reviewable knowledge tags, and expose selection/judgment navigation while keeping programming questions in the algorithm workbench.

Key decisions:

- Use allowlist-first discovery to avoid uncontrolled crawling.
- Reuse existing `classification_records`、`problem_details`、`problem_answer_guidance`、`source_versions`.
- Treat WanJuanWang as third-party `needs_review` source.
- Do not scrape hidden answer/analysis content.
- Add selection/judgment as filtered catalog views, not separate data models.

Recommended next step: run `maestro-plan --from blueprint:BLP-wanjuanwang-gesp-ingestion-2026-07-05` and implement EPIC-001 first.
