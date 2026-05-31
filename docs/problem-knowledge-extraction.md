# Problem Type And Knowledge Extraction

Phase 7 在 Phase 6 的等级 / 算法范畴候选之上，继续生成题型标签和知识点标签。它服务于题型分类网站的核心目录结构：`level -> algorithm domain -> problem type -> problems -> knowledge points`。

## 命令

```bash
npm run extract:problem-knowledge
npm run validate:problem-knowledge
```

## 输入与输出

输入：

- `data/classification/level-domain-classification.json`：等级和算法范畴候选。
- `data/canonical-problems/canonical-problem-alignment.json`：canonical problem、官方来源和辅助镜像映射。

输出：

- `data/classification/problem-type-knowledge.json`：216 条 C++ canonical problem 的题型和知识点候选标签。
- `data/classification/cxx-level5-taxonomy-table.json`：面向前端分类目录的 C++ 五级 taxonomy 表。

## 抽取边界

- 当前只处理 C++，不混入 Python、Scratch 或图形化编程。
- 题型和知识点标签都是 candidate，不直接当成已确认结论。
- 每个标签必须包含 `source`、`evidence`、`confidence`、`syllabus_fit` 和 `review_status`。
- 抽取只使用官方题名、官方短证据、镜像题名和明确 seed rule，不保存完整题面或完整题解。
- 不使用上游算法大类标签反推题型，避免“排序/模拟”这类大类造成误标。
- 五级中不能把 DP / 动态规划作为 exact 题型或 exact 知识点。

## 当前题型种子

当前覆盖网站首版需要展示的五级常见题型：

- 二分答案判定型
- 质因数分解型
- gcd/lcm 变形型
- 链表操作模拟型
- 排序过程 / 关键字型
- 复杂度判断型
- 筛法填空 / 判断型
- 递归 / 分治过程分析型
- 高精度运算模拟型
- 网格 / 序列模拟型

## 当前知识点种子

知识点标签用于问题详情页和目录筛选，当前覆盖：

- 单链表、双链表、循环链表、指针重连
- 欧几里得算法 / gcd、筛法求质数、唯一分解定理、有限小数判定
- lower_bound、第一个大于等于、单调性判定
- 递归调用与调用栈、递推式复杂度、分治拆分与合并、快速排序划分
- 排序稳定性、多关键字排序、逆序对
- 大整数除法
- 网格邻接、字符串变换、最短路、二叉树性质

## 当前统计

```text
problem knowledge record count: 216
C++ level 5 with problem types: 21
C++ level 5 with knowledge points: 21
problem type tag count: 54
knowledge point tag count: 80
confirmed tag count: 0
level 5 taxonomy domain count: 10
Problem type and knowledge extraction validation passed
```

## C++ 五级目录样例

- 链表：链表操作模拟型；知识点包括单链表、双链表、循环链表、指针重连。
- 数论：质因数分解型、筛法填空 / 判断型、gcd/lcm 变形型；知识点包括筛法、gcd、唯一分解、有限小数判定。
- 二分：二分答案判定型；知识点包括 lower_bound 和单调性判定。
- 递归 / 分治：递归 / 分治过程分析型、复杂度判断型；知识点包括调用栈、递推式复杂度、快速排序划分、分治合并。
- 排序 / 模拟：排序过程 / 关键字型；知识点包括快速排序划分、排序稳定性。
- 高精度：高精度运算模拟型；知识点包括大整数除法。

## 后续

Phase 8 需要在此基础上补冲突检测和置信度模型，把来自官方 PDF、OJ 镜像、GitHub 参考题解、seed rule 的证据分层，并给前端提供“已确认 / 候选 / 需复核 / 有冲突”的展示字段。
