# Review Workflow

M5 复核流程从 `data/classification/review-workqueue-plan.json` 进入，覆盖官方冲突、低置信度标签、补充题标签、重复来源和 AI 辅助内容复核。

## API

- `GET /api/catalog/review-queue/summary`：返回当前 open 复核项统计。
- `GET /api/catalog/review-queue`：返回完整复核队列，按 open、优先级、类型和题目排序。
- `POST /api/catalog/review-queue/:id/actions`：提交复核动作。

## 前端入口

React 目录页右侧的复核队列会展示完整 workqueue 中排序靠前的 open 项，并提供：

- 确认：提交 `confirm`。
- 拒绝：提交 `reject`。
- 合并重复：仅对 `source_duplicate` 提交 `merge_duplicate`。

提交前会要求填写备注；如果当前 API 使用 JSON 降级数据源且没有 MySQL，提交动作会失败并在页面错误区显示后端错误。读取队列不依赖 MySQL。

动作请求体：

```json
{
  "action": "confirm",
  "reviewer": "local-reviewer",
  "note": "核对官方题面后确认"
}
```

`action` 可取：

- `confirm`：确认复核项，并在有关联标签时提升对应标签的 `review_status`。
- `reject`：拒绝复核项，保留审计事件，不删除原始证据。
- `needs_review`：重新打开复核项。
- `merge_duplicate`：记录重复来源合并结论；当前不删除 source history。

## MySQL 审计

`review_events` 保存每次人工动作：

- `review_item_id`
- `canonical_problem_id`
- `action`
- `reviewer`
- `note`
- `before_status`
- `after_status`
- `event_json`

队列项本身更新在 `review_queue_items.status` 和 `item_json.review_status` 中。有关联题目的标签复核会同步写回 `classification_records.record_json`，并追加 `review_decisions`。

## 边界

- 没有 MySQL 时，API 仍可读取 JSON 队列，但复核动作需要 MySQL。
- AI 生成参考解或学习辅助内容即使通过样例，也不能自动确认，必须由人工动作显式提升。
- `reject` 和 `merge_duplicate` 不删除来源版本，保证后续 Audit And Export 可追溯。

## 验证

```bash
npm run build:api
npm run validate:review-workqueue
npm run validate:review-workflow-api
npm run validate:review-action-logic
```

`validate:review-action-logic` 使用 in-memory MySQL fake 调用真实 `CatalogService.applyReviewAction`，覆盖 `confirm`、`reject` 和 `merge_duplicate` 的状态回写、标签复核状态更新、队列引用移除和审计事件写入。

Phase 13 的审计导出见 [Audit Export](audit-export.md)。
