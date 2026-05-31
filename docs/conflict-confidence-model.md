# Conflict And Confidence Model

Phase 8 在题型 / 知识点候选标签之上增加冲突检测、置信度重算和复核队列。它不覆盖 Phase 7 的原始抽取结果，而是生成给后端和前端使用的展示态数据。

## 命令

```bash
npm run model:conflict-confidence
npm run validate:conflict-confidence
```

## 输入与输出

输入：

- `data/classification/problem-type-knowledge.json`：题型和知识点候选标签。
- `data/classification/level-domain-classification.json`：等级和算法范畴候选标签。
- `data/canonical-problems/canonical-problem-alignment.json`：官方题目、OJ 镜像和 GitHub 参考源对齐结果。

输出：

- `data/classification/conflict-confidence-model.json`：每道题的可展示分类状态、最终置信度和冲突引用。
- `data/classification/review-queue.json`：复核队列，包含来源冲突、重复候选、低置信度标签、五级未抽取题型 / 知识点等。

## 状态规则

`syllabus_fit` 允许值：

- `exact`
- `adjacent`
- `out_of_level`
- `community_inferred`
- `disputed`
- `needs_review`

展示状态：

- `confirmed`：上游已有确认，且最终置信度不低于 0.90。
- `candidate`：没有冲突，最终置信度不低于 0.70。
- `needs_review`：低置信度、seed rule 推断、缺题型、缺知识点或需要人工复核。
- `conflict`：来源场次 / 等级冲突、越级标签或 disputed 标签。

## 置信度因子

最终分数从上游标签置信度开始，按证据加减：

- 官方 PDF 短证据：`+0.08`
- OJ 练习链接：`+0.04`
- 代码 / 题解元数据：`+0.02`
- 题解来源：`+0.02`
- 只来自 seed rule：`-0.05`
- `syllabus_fit = exact`：`+0.10`
- `syllabus_fit = needs_review`：`-0.02`
- `syllabus_fit = community_inferred`：`-0.04`
- `syllabus_fit = out_of_level / disputed`：`-0.18`
- reviewer 已确认：`+0.08`
- 已知来源冲突：`-0.25`

每个标签都会保存 `raw_confidence`、`final_confidence` 和 `confidence_breakdown`，保证后续页面可以解释“为什么这个标签需要复核”。

## 当前统计

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

## 复核队列类型

- `source_conflict`：同名题目与官方场次 / 等级冲突。
- `tag_conflict`：题目已有来源冲突，导致相关标签必须复核。
- `source_duplicate`：OJ / 训练题单出现重复候选，需要人工确认是否同题。
- `inferred_seed_rule`：仅由 seed rule 或标题 override 推断。
- `low_confidence_tag`：低于候选置信度阈值。
- `untyped_level5_problem`：C++ 五级题目尚无题型候选。
- `no_knowledge_level5_problem`：C++ 五级题目尚无知识点候选。

## 给前端 / 后端的使用方式

- 分类目录页优先使用 `conflict-confidence-model.json` 中的 `effective_review_status` 和 `final_confidence`。
- 题目详情页可以展示 `confidence_breakdown`，解释标签来自官方题名、OJ 镜像还是 seed rule。
- 复核后台使用 `review-queue.json`，按 `priority` 和 `type` 组织人工复核。
- Phase 9 / Phase 10 可以直接围绕这些字段设计 React 目录页和 Nest API。
