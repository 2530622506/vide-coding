# 规划上下文：Phase 5 Canonical Problem Alignment

Session: `20260531-plan-P5-canonical-problem-alignment`
Plan: `PLN-20260531-P5-canonical-problem-alignment`
Milestone: `M2`
Phase: `canonical-problem-alignment`
Status: completed

## 总结

Phase 5 规划把官方 C++ PDF 题目转换为 canonical problem records，并挂载二级来源练习入口。阶段边界明确：官方来源是 canonical，二级来源只做 source version；不做算法分类，不保存完整题面。

## 任务

- `TASK-017`：实现 canonical alignment 脚本。
- `TASK-018`：生成 canonical alignment 和 C++ 五级表。
- `TASK-019`：校验输出并补齐中文文档。

## 约束

- 自动对齐必须同时匹配标题、场次和等级。
- 同名但场次 / 等级冲突必须进入复核队列。
- statement hash 当前不可用，不能伪造强匹配。
