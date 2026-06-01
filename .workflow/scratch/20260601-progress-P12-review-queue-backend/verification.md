# Phase 12 Review Queue 后端进展

Date: 2026-06-01
Milestone: `M5`
Phase: `review-queue`
Status: in_progress

## 已完成

- API 复核来源切换到 `data/classification/review-workqueue-plan.json`，当前暴露 1229 条 open 工作项。
- 新增 `GET /api/catalog/review-queue`。
- 新增 `POST /api/catalog/review-queue/:id/actions`。
- 新增 MySQL `review_events` 审计表。
- 复核动作会更新 `review_queue_items.status` / `item_json.review_status`，并在有关联标签时写回 `classification_records.record_json` 的 tag `review_status` 和 `review_decisions`。
- `reject` / `merge_duplicate` 通过审计事件保留来源和动作记录，不删除 `source_versions`。
- React 右侧复核队列已接入完整 workqueue，支持确认、拒绝和重复来源合并按钮。

## 验证

```bash
npm run build:api
npm run validate:review-workqueue
npm run validate:review-workflow-api
npm run validate:review-action-logic
node --check scripts/seed-mysql-catalog.mjs
node --check scripts/validate-catalog-api.mjs
```

输出摘要：

```text
review workqueue total: 1229
review workqueue high priority: 2
review workflow data source: json
review workflow item count: 1229
review workflow open count: 1229
Review workflow API validation passed
review action tag item: review:5a92f7afacb8316a
review action duplicate item: review:ac3bac43a1d6c746
Review action logic validation passed
```

## 未完成

- Docker socket 被沙箱拒绝，审批系统也拒绝沙箱外启动 MySQL；因此还没有在真实 MySQL 上执行 `POST /review-queue/:id/actions` 写入验证。
- 已使用 in-memory MySQL fake 调用真实 `CatalogService.applyReviewAction`，覆盖 confirm / reject / merge_duplicate 的状态回写和审计事件逻辑。
- 前端已有复核操作入口，但还没有筛选、批量处理和完整审计历史视图。
- Phase 13 的导出、回滚和完整审计视图尚未开始。
