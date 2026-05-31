# 计划上下文：Phase 3 PDF Parser

Session: `20260531-plan-P3-pdf-parser`
Plan: `PLN-20260531-P3-pdf-parser`
Milestone: `M2`
Phase: `pdf-parser`
Status: completed

## 总结

Phase 3 规划的是 metadata-only 官方 PDF 解析器。解析器消费 Phase 2 的官方 PDF metadata，临时下载 PDF，通过可替换抽取器获取页文本，并只写入 C++ 主数据集的结构化题目 metadata。

## 任务拆分

- `TASK-011`：创建 PDF 文本抽取器。
- `TASK-012`：把官方 PDF 解析成题目 metadata。
- `TASK-013`：验证解析输出并补充使用文档。

## 约束

- 不保存完整 PDF 文本或完整题面。
- 保留 source URL、hash、页码引用、parser version 和 review status。
- 抽取器保持可替换，后端 / CI 可切换为 Docker 方案。
