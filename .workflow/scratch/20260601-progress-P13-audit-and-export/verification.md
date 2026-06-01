# Phase 13 Audit And Export 进展

Date: 2026-06-01
Milestone: `M5`
Phase: `audit-and-export`
Status: in_progress

## 已完成

- 新增 `npm run export:audit`，生成分类审计导出。
- 新增 `npm run validate:audit-export`，校验导出计数、tag 证据、source mapping 和 rollback manifest hash。
- 生成 `data/exports/classification-audit-export.json`。
- 生成 `data/exports/classification-rollback-manifest.json`。
- 生成 `data/exports/classification-source-snapshot.json`。
- 新增 `npm run restore:audit`，默认 dry-run 校验 snapshot，`--apply` 时才写回源文件。
- 新增 `GET /api/catalog/audit/summary`。
- 新增 `GET /api/catalog/audit/events`，优先读 MySQL `review_events`，不可用时降级到导出中的 `review_decisions`。
- React 右侧“审计导出”面板展示 problems、tags、sources、queue、source snapshot 数量和最近审计事件。
- 新增 `docs/audit-export.md`。

## 验证

```bash
npm run export:audit
npm run validate:audit-export
npm run restore:audit -- --dry-run
npm run validate:review-workflow-api
```

输出摘要：

```text
audit export canonical problems: 411
audit export tags: 1404
audit export source mappings: 634
audit export review workqueue items: 1229
Audit export validation passed
restore audit snapshot files: 6
Audit source restore dry-run passed
audit summary tags: 1404
audit event count: 0
Review workflow API validation passed
```

## 未完成

- 当前导出来自 JSON artifact；真实 MySQL `review_events` 查询路径已实现，但本机 Docker MySQL 仍因权限无法启动，因此未做真实数据库联调。
