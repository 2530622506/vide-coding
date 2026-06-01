# Classification Data

这个目录保存 canonical problems 之上的分类结果。当前已完成 Phase 6 等级 / 算法范畴候选、Phase 7 题型 / 知识点候选抽取，以及 Phase 8 冲突 / 置信度模型。

## 文件

- `level-domain-classification.json`：216 条 C++ canonical problem 的等级标签和算法范畴候选。
- `cxx-level5-domain-table.json`：面向分类目录的 C++ 五级算法范畴表。
- `problem-type-knowledge.json`：216 条 C++ canonical problem 的题型和知识点候选标签。
- `cxx-level5-taxonomy-table.json`：面向前端分类目录的 C++ 五级 taxonomy 表。
- `conflict-confidence-model.json`：带最终置信度、展示状态和冲突引用的分类模型。
- `review-queue.json`：复核队列，包含来源冲突、重复候选、低置信度标签和五级待补标签。
- `problem-answer-guidance.json`：每道题的参考答案状态、中文理解示例和中文注释。
- `problem-details.json`：每道题详情结构，用于承载题干片段、选择题选项、图片资产、样例、C++ 参考解和来源链接。
- `supplemental-cxx-problems.json`：公开 OJ 单题补充题库，包含分类候选、AI 生成学习辅助说明、题目详情槽位和来源版本。

## 当前结果

- 官方 C++ 题目：216 条。
- 补充 C++ 题目：195 条。
- 合计 C++ 题目：411 条。
- 官方 C++ 五级题目：27 条，全部有官方等级标签。
- 补充 C++ 五级题目：26 条。
- 合计 C++ 五级题目：53 条。
- C++ 五级有算法范畴候选：24 条。
- 编程题有算法范畴候选：16 / 16。
- C++ 五级有题型候选：21 条。
- C++ 五级有知识点候选：21 条。
- 题型候选标签：54 个。
- 知识点候选标签：80 个。
- 可评分标签：298 个。
- 来源冲突：1 个。
- 来源重复候选：44 个。
- 复核队列：69 条。
- C++ 五级需复核题目：10 条。
- C++ 五级冲突题目：0 条。
- 参考答案 / 理解示例记录：216 条。
- 题目详情记录：216 条。
- 官方五级题面：27 条 `source_extracted`，其中 25 条选择 / 判断题来自官方 PDF 文本层题干片段，仍标记 `needs_review`；2 条编程题来自公开 OJ 题面补采。
- 官方确认选择题答案：120 条。
- 编程题参考入口：0 条。
- 待复核答案：96 条，其中判断题 80 条、官方编程题 AI 参考解 16 条。
- 选择题选项已从官方 PDF 文本层稳定抽取：97 条。
- 选择题选项待复核：23 条，均保留 A/B/C/D 选项槽位并标记 `needs_review`，没有官方选择题详情为空选项数组。
- 官方题目图片资产：101 条题目详情存在 `source_extracted` 图片资产，共 219 个资产；其中官方 PDF 裁剪资产 218 个，覆盖 100 道题，另有公开 OJ 题面图 1 个。
- 官方题目图片资产未发现：115 条，均标记 `none_found`，如后续仍需示意图必须标注 AI 生成和需甄别。
- 官方题目图片资产待采集：0 条。
- 官方编程题公开 OJ 题面补采：16 条 `source_extracted` 题面、16 组样例，图片总数 1。
- 官方编程题完整 C++ 参考解待补充：0 条。
- 官方编程题 AI C++ 参考解：16 条 `ai_generated_sample_verified`，均通过当前公开样例，答案状态仍为 `needs_review`，页面提示需甄别。
- 官方编程题分类修正：16 条，依据公开 OJ 题面和样例通过的 AI C++ 参考解重打标签，标签仍为 `needs_review`。
- 补充题 source versions：400 条，新增接入洛谷 CCF GESP C++ 1-8 级公开题单作为练习来源证据。
- 补充题 AI 生成学习辅助：195 条，全部标为 `ai_generated_learning_aid`。
- 公开 OJ 题面补采：170 条 `source_extracted` 题面、170 组样例，当前图片总数 5，165 条标记为 `none_found`。
- AI C++ 参考解：170 条 `ai_generated_sample_verified`，均通过当前公开样例，答案状态仍为 `needs_review`。
- 补充题分类修正：170 条，依据公开题面和样例通过的 AI C++ 参考解，标签仍为 `needs_review`；其中 28 道一级题、28 道二级题、25 道三级题、26 道四级题、26 道五级题、22 道六级题和 15 道七级题已归入“基础程序设计 / 字符串 / 数论 / 位运算 / 前缀和 / 网格 / 分治 / 排序模拟 / 贪心 / 动态规划 / 数据结构 / 图论 / 树 / 枚举搜索 / 博弈游戏”等目录。
- 如果公开来源最终无法采集到答案、图片或讲解，可补充 AI 生成学习辅助内容或示意图，但必须在数据和页面明确标记 AI 生成、需甄别、`needs_review`，不得伪装为官方答案或官方图片。
- 五级 DP exact-domain 标签：0。
- 五级 DP exact 题型 / 知识点标签：0。

## 标签规则

每个标签必须包含：

- `source`
- `evidence`
- `confidence`
- `syllabus_fit`
- `review_status`

算法范畴、题型和知识点标签默认仍是候选标签。前端展示时应优先读取 Phase 8 的 `effective_review_status`、`final_confidence` 和 `review_queue_refs`，不要把候选标签直接当作人工确认结果。
