# 规划上下文：Phase 8 Conflict And Confidence Model

Session: `20260601-plan-P8-conflict-and-confidence-model`
Plan: `PLN-20260601-P8-conflict-and-confidence-model`
Milestone: `M3`
Phase: `conflict-and-confidence-model`
Status: completed

## 总结

Phase 8 规划在候选标签之上增加冲突检测、置信度重算和复核队列，输出给后续 React 分类目录和 Nest API 使用。

## 任务

- `TASK-026`：实现冲突 / 置信度模型脚本。
- `TASK-027`：生成展示态模型和复核队列。
- `TASK-028`：校验输出并补中文文档。

## 约束

- 不覆盖 Phase 7 原始抽取结果。
- 分数必须可复现，并保留 `confidence_breakdown`。
- 冲突必须显式可见，不能被高分标签覆盖。
