# 万卷网 GESP C++ 采集

这个目录保存万卷网公开可见的 `GESP C++` 试卷解析 artifact。

当前范围：

- 只处理 `GESP C++`
- 只处理公开 HTML 页面
- 只采集 `单选题`、`判断题`、`编程题` 的题面结构、选项、样例、图片 URL、详情链接和来源 metadata
- 不采集登录后才能看到的答案、解析或其他受限内容

生成文件：

- `wanjuanwang-gesp-cpp-exams.json`
  - `discovery`：seed 页面和发现到的 level URL
  - `summary`：页面数、等级数、题目总数、题型统计
  - `pages[].questions[]`：结构化题目记录，包含 `questionid`、`stem_html`、`blocks`、`choice_options`、`programming_sections`、`sample_cases`、`images` 和 `source`

运行：

```bash
npm run ingest:wanjuanwang:gesp:cxx
npm run validate:wanjuanwang:gesp:cxx
npm run classify:wanjuanwang:gesp:cxx
npm run build:wanjuanwang:gesp:cxx
npm run validate:wanjuanwang:gesp:cxx:catalog
npm run export:wanjuanwang:gesp:cxx:rollback
```

可选参数：

```bash
node scripts/ingest-wanjuanwang-gesp-cpp.mjs --seed <url> --level-url <url> --level-url <url> --out <path>
```

说明：

- `--level-url` 可重复传入；一旦传入，就优先使用显式 URL 白名单。
- 默认 seed 是用户提供的 `2025 年 6 月 GESP（C++ 七级）` 页面。
- 图片当前只保留远端 URL metadata，二进制下载和本地资产落盘属于后续步骤。
- 如果本机没有可用 MySQL，当前链路仍可通过 JSON fallback 进入 `CatalogService` 和前端页面。
