# M5 Review Workflow 验证记录

Date: 2026-06-01
Milestone: `M5`
Roadmap: `.workflow/roadmap.md#milestone-5-review-workflow`

## Phase 12 Review Queue

Requirements:

- Review low-confidence tags.
- Review duplicate candidates.
- Review source conflicts and out-of-level labels.

Evidence:

- `data/classification/review-workqueue-plan.json` contains 1229 review work items, including high-priority source conflict and tag conflict items.
- `GET /api/catalog/review-queue` exposes the full workqueue.
- React right-side review queue loads open work items and supports `confirm`, `reject`, and `merge_duplicate`.
- `POST /api/catalog/review-queue/:id/actions` writes queue item status, tag review status, record review decisions, and `review_events` when MySQL is available.

Success criteria:

- Reviewer actions update `review_status`: verified by `npm run validate:review-action-logic`.
- Rejected tags remain auditable: `reject` writes an audit event and leaves a review decision trail.
- Duplicate merges preserve source history: `merge_duplicate` preserves `source_ref` and does not delete `source_versions`.

## Phase 13 Audit And Export

Requirements:

- Keep review event history.
- Export canonical problems, tags, evidence, and source mappings.
- Support rollback for mistaken merges or classification changes.

Evidence:

- `GET /api/catalog/audit/events` prefers MySQL `review_events` and falls back to JSON export `review_decisions`.
- `npm run export:audit` writes:
  - `data/exports/classification-audit-export.json`
  - `data/exports/classification-rollback-manifest.json`
  - `data/exports/classification-source-snapshot.json`
- `npm run restore:audit -- --dry-run` verifies source snapshots; `--apply` intentionally restores source JSON files.
- React audit export pane shows problem, tag, source, queue, snapshot, and event metrics.

Success criteria:

- Every manual decision has an audit path through `review_events` or exported `review_decisions`.
- Dataset export contains 411 canonical problems, 1404 tags, 634 source mappings, and 1229 review workqueue items.
- Rollback is supported by sha256-verified source snapshots and restore command.

## Commands

```bash
npm run build:api
npm run build:web
npm run validate:review-workqueue
npm run validate:review-workflow-api
npm run validate:review-action-logic
npm run validate:audit-export
npm run restore:audit -- --dry-run
```

## Limitation

The local sandbox cannot access the Docker socket, and approval for running Docker outside the sandbox was rejected. Therefore live MySQL `review_events` integration was not exercised against a real container in this environment. The service path is covered by an in-memory MySQL fake that calls the real `CatalogService.applyReviewAction` method.
