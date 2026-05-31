# 规划上下文：Phase 4 OJ Mirror Ingestion

Session: `20260531-plan-P4-oj-mirror-ingestion`
Plan: `PLN-20260531-P4-oj-mirror-ingestion`
Milestone: `M2`
Phase: `oj-mirror-ingestion`
Status: completed

## 总结

Phase 4 规划采集第三方 OJ、训练题单、题解页面和 GitHub 参考题库的 metadata，为 Phase 5 的 canonical problem alignment 准备候选题目。阶段边界明确：只做 C++，不做算法分类，不保存完整第三方题面或 PDF 正文，不把任何二级来源升级为官方证据。

## 任务

- `TASK-014`：实现二级来源 metadata 采集器。
- `TASK-015`：运行采集并生成候选输出。
- `TASK-016`：校验输出并补齐文档。

## 约束

- 分类目录网站主线仍以官方来源为准。
- GitHub `jonaslgtm/gesp-exam-questions` 只能作为辅助题库参考源。
- Python、Scratch 和图形化内容不进入当前主数据集。
