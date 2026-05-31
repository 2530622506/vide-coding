# 来源注册表

## 目的

来源注册表定义所有可能参与 GESP 数据建设的上游来源，包括官方 metadata、练习链接、题解线索和分类证据。后续爬虫、对齐逻辑和分类器都从这里读取来源信息，不再临时猜测某个网站到底是官方来源、OJ 镜像、训练题单还是辅助文章。

这个注册表是 metadata-first 的。它保存 source URL、trust level、crawl strategy、license status 和 storage policy。除非来源授权和产品策略都明确允许，否则这里不能演变成完整题面仓库。

## 来源类型

- `official_home`：官方 GESP 入口，用于发现官方页面。
- `official_syllabus`：官方认证标准、大纲页面和大纲 PDF。
- `official_true_questions`：官方真题索引和附件。
- `official_sample_questions`：官方样题页面和附件。
- `training_list`：第三方训练题单和练习集合。
- `oj_mirror`：OJ 镜像题目和练习入口。
- `solution_article`：博客或文字题解。
- `video_explanation`：视频讲解。

## 信任等级

- `canonical`：官方 GESP 来源。它们决定等级和官方知识点范围。
- `practice`：第三方训练题单和 OJ 集合。
- `mirror`：镜像题目。只用于练习入口和题目对齐。
- `auxiliary`：题解文章、代码提示、评论和社区标签。

官方 GESP 来源是等级和官方知识点范围的 canonical evidence。OJ 镜像、训练题单、题解文章和视频讲解不能覆盖官方分类。

## 存储策略

默认不保存全文。除非项目有明确授权或清晰的 license 判断，来源都应该使用 `can_store_full_text: false`。在此之前，下游采集只保存 metadata、来源链接、hash、页码引用和短证据片段。

## 添加来源

1. 只有来自官方 GESP 网站的来源才能加入 `data/source-registry/sources.official.json`。
2. OJ 镜像、训练题单、博客、视频和 GitHub 参考题库放入 `data/source-registry/sources.secondary.json`。
3. `id` 使用 kebab-case，例如 `official-gesp-syllabus` 或 `luogu-gesp-level5-training`。
4. 按 `data/source-registry/schema.json` 设置 `source_type`、`trust_level`、`crawl_strategy` 和 `license_status`。
5. 除非存储策略变化，否则保持 `can_store_full_text: false`。
6. 来源进入下游流程前必须先跑验证。

## 验证

运行：

```bash
npm run validate:sources
```

验证器会检查必填字段、枚举值、URL 可解析性、重复 source ID、官方来源 trust 规则、二级来源 trust 规则和最小来源数量。

## 分类边界

来源注册表不直接给题目分类。它只定义证据从哪里来，以及这些证据应该被信任到什么程度。后续分类阶段仍然必须给每个题型标签和知识点标签附上 source、evidence、confidence、`syllabus_fit` 和 `review_status`。

## C++ 口径

当前主线只建设 GESP C++ 数据。二级来源即使同时包含 Python、Scratch 或图形化编程内容，也只能在采集器中保留 C++ metadata。比如 GitHub `jonaslgtm/gesp-exam-questions` 只接入 `C++` 目录下的样题、历年真题和解析 PDF 路径，非 C++ 目录不会进入下游输出。
