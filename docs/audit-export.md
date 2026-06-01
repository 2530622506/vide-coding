# Audit Export

Phase 13 导出当前分类、证据、来源和复核工作队列，便于备份和外部复核。

## 命令

```bash
npm run export:audit
npm run validate:audit-export
npm run restore:audit -- --dry-run
```

输出文件：

- `data/exports/classification-audit-export.json`
- `data/exports/classification-rollback-manifest.json`
- `data/exports/classification-source-snapshot.json`

## 导出内容

`classification-audit-export.json` 包含：

- canonical problem records：官方题和补充题合计 411 条。
- tags：算法范畴、题型、知识点合计 1404 条，保留 `source`、`evidence`、`confidence`、`syllabus_fit`、`review_status`。
- source mappings：634 条 source version 映射。
- review workqueue：1229 条 open/pending 复核工作项。
- review event history：从 JSON artifact 中可见的 `review_decisions`；生产环境如启用 MySQL，应在备份前同时导出 `review_events`。

## 可见性

- `GET /api/catalog/audit/summary` 返回当前审计导出摘要、source manifest 和 rollback 信息。
- `GET /api/catalog/audit/events` 优先读取 MySQL `review_events`，不可用时降级读取审计导出中的 `review_decisions`。
- React 目录页不展示审计导出面板；这些接口保留给后台校验、备份和回滚流程。

## 回滚清单

`classification-rollback-manifest.json` 记录生成导出所依赖的源 JSON 文件、byte size 和 sha256。`classification-source-snapshot.json` 保存这些源文件的可校验 snapshot。

先 dry-run 校验 snapshot：

```bash
npm run restore:audit -- --dry-run
```

确认需要回滚时再执行写入：

```bash
npm run restore:audit -- --apply
```

写入后重新 seed MySQL 并运行验证：

```bash
npm run db:seed
npm run validate:audit-export
npm run validate:review-workqueue
npm run build:api
npm run build:web
```

## 边界

- 当前导出来自 JSON artifact；实时 MySQL `review_events` 通过 `/api/catalog/audit/events` 读取，MySQL 不可用时返回 JSON 导出中的 decisions。
- `needs_review` 不会在导出中被提升为 confirmed。
- `reject` / `merge_duplicate` 的历史应通过 `review_decisions` 和 MySQL `review_events` 保留，不删除来源版本。
