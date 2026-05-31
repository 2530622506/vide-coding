# 官方来源采集

这个目录保存从 canonical GESP 官方来源中发现的 metadata。这里是 metadata-only：不要保存完整官方 HTML、PDF 字节或完整题面。

生成文件：

- `official-source-index.json`：来源 URL metadata、状态码、content type、hash、字节数、发现到的官方链接和来源关系。
  - `true_question_sessions`：官方真题场次页面、场次月份、可发现的发布日期和关联 PDF URL。
  - `sample_attachments`：官方样题附件 URL。

运行：

```bash
npm run ingest:official
npm run validate:official-ingestion
```

官方来源采集只是上游发现步骤。题目抽取、PDF 解析、canonical problem 对齐和分类都属于后续阶段。
