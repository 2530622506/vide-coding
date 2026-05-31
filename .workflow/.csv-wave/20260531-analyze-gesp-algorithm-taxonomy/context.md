# GESP Problem-Type Classification And Knowledge Alignment Context

Session: `20260531-analyze-gesp-algorithm-taxonomy`
Scope: macro / standalone
Status: completed
Scope verdict: large

## Interview Decisions

| # | Decision | Choice | Source |
|---|---|---|---|
| 1 | Scope | Build a GESP problem-type classification and knowledge alignment website | user |
| 2 | Depth | Standard structured analysis with external source verification | default |
| 3 | Dimensions | Official scope, source acquisition, product concept, feasibility, risk, maintainability | default |
| 4 | Go/No-Go threshold | Go if official data source exists and copyright-safe MVP is possible | default |

## Locked Decisions

- The product must focus on source collection, problem alignment, problem-type classification, algorithm-domain mapping, and knowledge-point extraction.
- The product is not a search page. It is a classified catalog: level -> algorithm domain -> problem type -> problems -> knowledge points.
- The product must separate official syllabus facts from inferred/community tags.
- `GESP 五级 + 动态规划` should show a syllabus-boundary warning because DP is not a level 5 topic; simple DP is level 6 and complex DP is level 7.
- Every problem-type tag and knowledge tag must have provenance: source document, extraction method, evidence snippet, confidence, and reviewer status.
- MVP should start with C++ level 5 official PDFs and the official syllabus, not broad web crawling.

## Free Decisions

- Frontend stack can be Next.js or another modern web stack.
- Classifier can start as rules + manual review before adding embeddings or LLM scoring.
- Community sources can be added as mirrors once official ingestion is stable.

## Deferred Decisions

- Whether full problem statements may be stored depends on license/permission review.
- Whether to support both C++ and Python in MVP should be decided after source parsing effort is measured.
- Whether to expose a teacher dashboard or only student search should be handled in roadmap planning.

## Key Source Facts

- Official GESP describes C++/Python certification as levels 1-8.
- Official level 5 knowledge points include elementary number theory, linked lists, binary search/answer, recursion, divide-and-conquer, greedy, and complexity.
- Official level 6 includes simple dynamic programming and simple knapsack.
- Official level 7 includes complex dynamic programming, including two-dimensional DP and optimization.
- Official true-question pages list exam sessions and per-level PDF links.

## Source Registry Seed

- 官方 GESP 大纲页：等级和知识点标准，最高可信。
- 官方真题解析页：考试场次、语言、等级、官方 PDF，最高可信。
- 官方样题页：样题 PDF 和早期题型，最高可信。
- 洛谷题库 / 题单：练习入口、题号映射、社区题解，中可信。
- zqiceberg GESP 分级页：五级题目汇总和代码提示，中可信。
- Hydro / AIJIE_OJ / CSPOJ / ACGO / 东方博宜 OJ / 信创计划：题面镜像和练习入口，中低可信。
- 博客园 / CSDN / 洛谷题解 / B 站讲解：算法标签和知识点线索，低可信，只能作为辅助证据。

## Classification Dimensions

- Level：一级到八级，优先来自官方来源。
- Language：C++、Python、图形化编程。
- Source Type：official_pdf、sample_pdf、oj_mirror、training_list、solution_article、video_explanation。
- Algorithm Domain：数论、二分、链表、贪心、递归、分治、高精度、复杂度、排序/模拟。
- Problem Type：二分答案判定型、质因数分解型、gcd/lcm 变形型、链表操作模拟型、排序关键字贪心型等。
- Knowledge Points：从官方大纲、题面、题解、代码结构和人工复核中抽取。
- Syllabus Fit：exact、adjacent、out_of_level、community_inferred、disputed、needs_review。

## Level 5 Initial Problem-Type Taxonomy

- 二分答案判定型：边界查找、最大化最小值、最小化最大值、单调判定函数。
- 链表操作模拟型：插入、删除、遍历、双向关系维护、循环链表模拟。
- 数论计算型：最大公约数、最小公倍数、质因数分解、同余、约数倍数。
- 筛法预处理型：埃氏筛、线性筛、素数表构建。
- 递归分治型：递归过程分析、归并排序、快速排序、分治统计。
- 贪心策略型：排序后选择、局部最优、区间或资源分配的简单贪心。
- 高精度运算型：数组模拟加减乘除。
- 复杂度分析型：多项式复杂度、对数复杂度、循环嵌套判断。

## Initial Output Contract

Every canonical problem should eventually include:

- canonical_title
- source_links
- level
- language
- exam_session
- algorithm_domains
- problem_types
- knowledge_points
- syllabus_fit
- confidence
- review_status

## Next-Step Routing

Recommended next command: `$maestro-blueprint` for full product specification, or `$maestro-roadmap --from analyze:20260531-analyze-gesp-algorithm-taxonomy` if you want milestone sequencing first.
