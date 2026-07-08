# WanJuanWang GESP C++ Ingestion Planning Context

## Scope

Only GESP C++ is in scope. The blueprint already targets C++ level 1-8, so no Python, 图形化, Scratch, AtCoder-only, or mobile-only work is included in this plan.

## Upstream Blueprint

- Session: `BLP-wanjuanwang-gesp-ingestion-2026-07-05`
- Summary: crawl public WanJuanWang GESP C++ 1-8 level exam pages, parse `selection` / `judgment` / `programming`, persist into existing catalog tables, infer reviewable tags, add selection/judgment navigation, keep programming questions in the algorithm workbench.

## Existing Codebase Constraints

- IA must remain classification-first: `level -> algorithm domain -> problem type -> problems -> knowledge points`.
- Official GESP sources remain authoritative; WanJuanWang is a third-party review-required source.
- Existing storage should be reused: `classification_records`, `problem_details`, `problem_answer_guidance`, `source_versions`, `review_queue_items`.
- Existing frontend shells already exist in `apps/web/src/layout/WorkbenchLayout.tsx`, `apps/web/src/App.tsx`, and `apps/web/src/pages/gesp/GespPages.tsx`.
- Existing crawler / ingestion scripts live in `scripts/`.

## Observed Target-Site Facts

- Provided page is public server-rendered HTML.
- Sections are grouped by `单选题`, `判断题`, `编程题`.
- Question nodes expose `questionid`.
- Selection questions expose `optionsTable`.
- Programming questions include statement blocks, samples and inline images.
- Answers/analysis are hidden behind login and are out of scope for scraping.

## Planning Intent

This plan should be directly consumable by `maestro-execute` and should prioritize:

1. Parser and JSON artifact generation.
2. MySQL persistence and provenance.
3. Knowledge/domain mapping for C++ GESP only.
4. UI routing and navigation for selection/judgment, with programming in the existing workbench.
5. Validation and rollback support.
