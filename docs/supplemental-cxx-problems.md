# Supplemental C++ Problems

这个阶段把公开 OJ 单题链接转成补充题库记录，用于扩大 GESP C++ 分类目录。补充题不会覆盖官方真题和官方大纲，只作为练习题、来源映射和分类候选。

## 命令

```bash
npm run build:supplemental-cxx
npm run enrich:public-oj -- --level 5 --limit 5 --delay-ms 1500
npm run apply:public-oj-enrichment
npm run validate:public-oj-enrichment
npm run apply:ai-reference-solutions
npm run validate:ai-reference-solutions
npm run validate:supplemental-cxx
npm run db:seed
```

## 输出

- `data/classification/supplemental-cxx-problems.json`
- `data/enrichment/public-oj-problem-details.json`
- MySQL 表：
  - `classification_records`
  - `problem_answer_guidance`
  - `problem_details`
  - `source_versions`

## 当前统计

```text
supplemental C++ problem count: 195
supplemental level 5 count: 26
AI generated learning aid count: 195
source versions added: 400
source extracted statements: 88
source extracted samples: 88
visual asset total count: 2
AI sample verified solution count: 88
classification refined count: 88
```

合并入库后：

```text
mysql classification record count: 411
mysql answer guidance record count: 411
mysql problem detail record count: 411
mysql C++ level 5 record count: 53
mysql source version count: 634
```

## 入选规则

- 只接入 C++。
- 只把公开 OJ 单题作为补充题记录。
- GitHub PDF、官方 PDF 和题解 PDF 只作为来源线索，不直接膨胀成单题。
- 已经自动对齐到官方 canonical problem 的来源不会重复生成补充题。
- 与官方编程题标题重名的公开 OJ 条目也不会重复生成补充题。
- 同一个 OJ 题号只生成一条补充题记录，但会保留多个 `source_versions`。

## AI 生成策略

当公开来源暂时没有可采集的完整题面、图片、样例或参考解时，可以生成学习辅助内容，但必须满足：

- `content_origin` 标为 `ai_generated_learning_aid`。
- 展示 `ai_generation_notice`，提示不是官方题解，需要甄别。
- 参考答案不能标为 `confirmed`，只能是 `reference_link` 或 `needs_review`。
- 编程题 C++ 代码未通过样例或 OJ 验证前不能作为正式参考解。
- 图片如果由 AI 生成，只能作为示意图，必须带 `alt_text`、来源说明和复核状态。

## C++ 参考解策略

- 当前已给 88 道已抽取完整题面和样例的编程题补充参考解，其中包含 22 道五级题、28 道一级题、28 道二级题和 10 道三级题。
- 参考解由 AI 根据公开题面生成，写入 `content_origin = ai_generated_sample_verified`。
- 每份代码包含中文注释，并通过本地 `g++ -std=c++17` 编译。
- 每份代码已跑通当前公开题面样例，写入 `verification.status = sample_passed`。
- 答案状态仍为 `needs_review`，表示还需要人工复核或公开 OJ 评测，不标为官方答案。

## 分类修正策略

- 已对 88 道补采题面做分类修正，修正依据是公开题面和样例通过的 AI C++ 参考解，其中包含 22 道五级题、28 道一级题、28 道二级题和 10 道三级题。
- 一级题已补充“基础程序设计”主范畴，并按题面继续细分为整数除法、因数枚举、日期条件、时间换算、取模筛选、奇偶计数、公式换算、四舍五入、分段计费、优惠比较等题型。
- 二级题已补充“基础程序设计”主范畴，并按题面继续细分为矩阵构造、日期时间模拟、奇偶计数、幂和判定、重复数位计数、字符图案输出、整数除法、坐标不等式计数等题型。
- 三级题首批已补充“基础程序设计 / 数论 / 排序模拟 / 贪心”等范畴，并细分为数组标记、字符串合法性判断、进制转换、逆向递推、单位换算、完全平方数配对计数等题型。
- 修正后的标签来源统一标为 `source_extracted_statement_ai_solution_review`，状态仍是 `needs_review`。
- `数字移动` 已从“数论”修正为“二分 / 排序模拟”，题型为“二分答案程序设计型 / 序列数组模拟型”。
- `相等序列` 已补充为“数论 / 排序模拟”，知识点包含“质因数指数统计 / 中位数最小化绝对距离”。
- `原根判断` 明确标记 `syllabus_fit = out_of_level`，因为公开题面背景提示可能超出 GESP 考纲范围。
- `有趣的数字和` 不归入五级 DP 核心分类，当前按“位运算 / 二进制计数前缀统计”处理。

## 公开 OJ 补采策略

- 只访问公开题页，不使用登录态或账号凭据。
- 默认低频运行：`--delay-ms 1500`，小批量 `--limit` 控制。
- 目前已补采 C++ 五级 22 道、一级 28 道、二级 28 道、三级 10 道洛谷题，均已抽取题面结构和样例。
- 当前已发现 2 个公开 OJ 题面图片资产，来自 `周长与面积计算`、`黄金格`；其余 86 道写入 `visual_assets.status = none_found`，不是待采集。
- 抽取题面写入 `statement.status = source_extracted`，同时保留 `source_terms_status = needs_review`。
- AI 讲解仍保留 `ai_generated_learning_aid` 标识，公开 OJ 抽取的题面不能变成官方题解。
- 如果最终无法从公开来源获取答案、图片或讲解，可以生成 AI 学习辅助内容或示意图，但必须显式标注 AI 生成、保留 `needs_review`，并提示用户甄别。

## 后续优化

- 继续分批补采完整题面、选择题选项、图片和样例。
- 对低置信度算法范畴、题型和知识点做人工复核。
- 对更多已补采题面和样例的编程题补充可通过评测的 C++ 参考解，并加入中文注释。
- 将确认后的补充题从 `needs_review` 提升为更高可信状态。
