# Answer Guidance

这个阶段给每道题补 `reference_answer` 和 `understanding_example`，用于题目列表和后续题目详情页展示。

## 命令

```bash
npm run build:answer-guidance
npm run apply:official-ai-reference-solutions
npm run validate:answer-guidance
npm run validate:official-ai-reference-solutions
```

## 输出

- `data/classification/problem-answer-guidance.json`
- MySQL 表：`problem_answer_guidance`

## 数据口径

- 选择题：从官方 PDF 题头的答案表提取，状态为 `confirmed`。
- 判断题：当前官方 PDF 文本没有稳定提取出答案表，状态为 `needs_review`。
- 官方编程题：已从公开 OJ 题面补齐样例后生成 AI C++ 参考解，状态为 `needs_review`，来源标记为 `ai_generated_sample_verified`，页面必须提示“AI 生成、请甄别”。
- 补充题库的 AI C++ 参考解必须标注 `ai_generated_sample_verified`，通过样例后仍保持 `needs_review`，不能标成官方答案。

## 当前统计

```text
answer guidance record count: 216
confirmed answer count: 120
reference-link answer count: 0
needs-review answer count: 96
AI sample-verified programming answer count: 16
C++ level 5 confirmed answer count: 15
Answer guidance validation passed
```

## 中文注释

每道题都会生成：

- 中文理解摘要
- 3 个理解步骤
- 至少 2 条中文注释
- 知识点关联提示

这部分是学习辅助内容，不替代官方题解；判断题和 AI 生成编程参考解后续需要补更强答案来源、公开 OJ 评测或人工复核。
