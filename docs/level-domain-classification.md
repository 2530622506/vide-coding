# Level And Domain Classification

Phase 6 在 canonical problem records 上生成等级标签和算法范畴候选。它服务于分类目录网站的信息架构：`level -> algorithm domain -> problem type -> problems -> knowledge points`。

## 命令

```bash
npm run classify:level-domain
npm run validate:level-domain-classification
```

## 分类边界

- 等级标签只来自官方 PDF，`confidence = 1`，`syllabus_fit = exact`。
- 算法范畴标签是候选标签，来源可以是官方题目标题、官方短证据片段或 seed rule。
- 五级中出现 DP / 动态规划信号时不能作为 exact/core domain，必须进入 `out_of_level` 或 `community_inferred` 复核流程。
- 当前不做题型模板和知识点抽取；这些属于 Phase 7。

## 种子范畴

当前覆盖：

- 数论
- 二分
- 链表
- 贪心
- 递归
- 分治
- 高精度
- 复杂度
- 排序/模拟
- 图论、树、字符串作为高等级补充范畴

## 当前统计

```text
classified problem count: 216
C++ level 5 with level labels: 27
C++ level 5 with domain labels: 24
programming with domain labels: 16/16
level 5 DP exact-domain count: 0
out-of-level signal count: 0
```

## 五级样例

- 链表：单链表、双链表、循环链表、哑结点删除。
- 数论：gcd、欧拉筛、埃氏筛、质数判断、有限不循环小数。
- 二分：第一个大于等于、最大可能长度、找数。
- 分治：最大连续子段和、快速排序。
- 高精度：大整数除法。

这些标签仍是候选标签，前端可以先用于目录组织，但正式知识点页面需要等 Phase 7 / Phase 8 补齐题型模板、知识点和冲突置信度模型。
