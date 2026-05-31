# OJ 镜像采集

Phase 4 负责把外部 OJ、训练题单、题解页面和 GitHub 参考题库转成可对齐的候选题目 metadata。当前项目主线只做 C++ GESP，因此这些候选也只会与 C++ 官方题目对齐。它的目标不是确认官方分类，而是给 Phase 5 的 canonical problem alignment 提供候选来源。

## 命令

```bash
npm run ingest:oj
npm run validate:oj-ingestion
```

## 当前适配来源

- 洛谷题库检索页：可公开解析，当前采集到 208 条 GESP 题库 entries。
- 洛谷 CCF GESP C++ 1-8 级上机题单：`training/551` 到 `training/558` 均可公开解析，当前合计采集 200 条按等级拆分的 C++ 练习 entries。
- 其他洛谷训练题单：部分页面返回 `401 login_required`，只记录受限状态，不强行绕过。
- zqiceberg GESP 五级页面：可解析洛谷题目链接，作为辅助证据。
- Hydro、AIJIE_OJ、ACGO、信创计划、羽润编程等镜像页：按 source registry 中的策略采集 metadata。
- GitHub `jonaslgtm/gesp-exam-questions`：通过 GitHub tree API 只采集 C++ PDF 路径 metadata，当前包含 83 个历年真题 PDF、8 个样题 PDF、15 个 C++ 解析 PDF。Python、Scratch 和图形化目录不会进入输出。

## 输出内容

`data/oj-ingestion/mirror-problem-candidates.json` 包含：

- `documents`：每个来源页面的访问 metadata，不含完整 HTML。
- `entries`：镜像 / 练习入口 / GitHub C++ 参考 PDF 候选，包含 `source_url`、`title`、`oj_system`、`oj_id`、`source_type`、`trust_level` 等字段。
- `duplicate_candidates`：按标题、场次和等级与 C++ 官方编程题或其他镜像题做出的重复候选。
- `failures`：网络或解析失败记录。

## 当前统计

最新一次校验通过的输出：

```text
OJ source document count: 24
OJ mirror/practice entry count: 545
OJ Luogu entry count: 432
OJ zqiceberg entry count: 24
OJ selected mirror entry count: 7
OJ GitHub C++ reference entry count: 106
OJ duplicate candidate count: 199
```

## 信任边界

所有第三方 entries 的 `trust_level` 都不能是 `canonical`。即使洛谷、Hydro、zqiceberg 或 GitHub 文件路径包含 “GESP 五级”，也只能作为练习入口或对齐证据，不能覆盖官方 PDF / 官方大纲给出的等级和知识点范围。

## 后续

Phase 5 会使用这些候选题目和官方 PDF 题目做 canonical problem alignment，输出可复核的重复候选、冲突候选和来源映射。
