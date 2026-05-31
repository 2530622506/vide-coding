# 规划上下文：Phase 6 Level And Domain Classification

Session: `20260531-plan-P6-level-and-domain-classification`
Plan: `PLN-20260531-P6-level-and-domain-classification`
Milestone: `M3`
Phase: `level-and-domain-classification`
Status: completed

## 总结

Phase 6 规划在 canonical problem records 上生成官方等级标签和候选算法范畴。输出先服务前端分类目录骨架，不替代后续题型模板和知识点抽取。

## 任务

- `TASK-020`：实现等级 / 算法范畴分类脚本。
- `TASK-021`：生成分类输出和 C++ 五级分类表。
- `TASK-022`：校验输出并补齐中文文档。

## 约束

- 等级标签只来自官方 PDF。
- 每个标签必须保留 evidence、confidence、syllabus_fit 和 review_status。
- DP 不能作为五级 exact/core domain。
