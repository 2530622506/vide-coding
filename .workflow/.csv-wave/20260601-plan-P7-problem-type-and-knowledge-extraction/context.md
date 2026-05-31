# 规划上下文：Phase 7 Problem Type And Knowledge Extraction

Session: `20260601-plan-P7-problem-type-and-knowledge-extraction`
Plan: `PLN-20260601-P7-problem-type-and-knowledge-extraction`
Milestone: `M3`
Phase: `problem-type-and-knowledge-extraction`
Status: completed

## 总结

Phase 7 规划在等级 / 算法范畴候选之上生成题型和知识点候选。输出服务分类目录网站，不做搜索页优先，也不保存完整题面。

## 任务

- `TASK-023`：实现题型 / 知识点抽取脚本。
- `TASK-024`：生成 `problem-type-knowledge` 和 C++ 五级 taxonomy 表。
- `TASK-025`：校验输出并补中文文档。

## 约束

- 只处理 C++ 数据。
- 题型 / 知识点标签必须有证据、置信度和复核状态。
- 不用上游大类标签反推题型，避免宽泛误标。
- DP 不能作为五级 exact 题型或知识点。
