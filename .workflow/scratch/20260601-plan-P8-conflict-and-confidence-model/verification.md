# Phase 8 Conflict And Confidence Model 验证记录

Date: 2026-06-01
Plan: `PLN-20260601-P8-conflict-and-confidence-model`
Phase: `conflict-and-confidence-model`

## 命令

```bash
node --check scripts/build-conflict-confidence-model.mjs
node --check scripts/validate-conflict-confidence.mjs
npm run model:conflict-confidence
npm run validate:conflict-confidence
```

## 输出摘要

```text
conflict-confidence record count: 216
confidence tag count: 258
candidate tag count: 246
needs-review tag count: 11
source conflict count: 1
source duplicate count: 44
review queue item count: 69
C++ level 5 needs review count: 10
C++ level 5 conflict count: 0
Conflict/confidence model validation passed
```

## 就绪状态

- 216 条 C++ 题目都有展示态分类记录。
- 每个可评分标签都有 raw confidence、final confidence 和 confidence breakdown。
- 复核队列包含来源冲突、来源重复候选、低置信度标签、seed rule 推断、五级无题型和五级无知识点问题。
- C++ 五级没有冲突题目，没有 exact DP 标签。

## 后续风险

- `confirmed` 仍需要后续人工复核流程写入，当前主要是 candidate / needs_review。
- 复核队列是数据输入，不是后台 UI；Review Workflow 里还要实现人工操作和状态回写。
