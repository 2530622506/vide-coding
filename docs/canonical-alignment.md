# Canonical Problem Alignment

Phase 5 把官方 C++ PDF 题目和二级来源候选合并成 canonical problem records。它解决的是“同一道题有哪些官方来源、练习入口和辅助来源”，不是算法分类。

## 命令

```bash
npm run align:canonical
npm run validate:canonical-alignment
```

## 匹配策略

- canonical problem 只来自官方 GESP C++ PDF。
- 自动对齐要求：归一化标题一致，并且场次、等级一致。
- 缺失场次或等级的同名候选进入 `needs_review`。
- 同名但场次或等级冲突的候选进入 `conflict_candidates`。
- 当前没有可用的完整题面 fingerprint，因此 `statement_hash_available` 明确为 `false`。后续引入题面 hash 后再提高匹配强度。

## 输出

`data/canonical-problems/canonical-problem-alignment.json` 包含：

- `canonical_problems`：216 条 C++ 官方题目。
- `source_versions`：官方 PDF source version，以及可自动对齐的练习链接。
- `review_queue.duplicate_candidates`：需要人工复核的重复候选。
- `review_queue.conflict_candidates`：标题相同但场次 / 等级冲突的候选。
- `review_queue.unmatched_secondary_candidates`：当前没有匹配到官方题目的二级候选。

`data/canonical-problems/cxx-level5-canonical-table.json` 是给前端分类目录使用的五级表：

- 27 行 C++ 五级题目。
- 15 道单选、10 道判断、2 道编程。
- 2 道编程题都挂上了洛谷练习链接；其中 zqiceberg 也作为辅助 source version 挂载到相同 canonical problem。

## 当前统计

```text
canonical problem count: 216
official source version count: 216
secondary source version count: 18
auto-aligned problem count: 16
C++ level 5 canonical count: 27
C++ level 5 table rows: 27
duplicate candidate count: 44
conflict candidate count: 1
```

## 下一步

Milestone 3 会在 canonical problem records 上生成等级、算法范畴、题型模板、知识点、证据和置信度。五级中的 DP 标签如果来自社区来源，只能进入 `community_inferred`、`out_of_level` 或 `disputed`，不能覆盖官方五级分类。
