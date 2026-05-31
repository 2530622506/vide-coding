# 官方 PDF 解析器

Phase 3 负责把官方 GESP PDF 转成结构化题目 metadata，供后续题源对齐、等级判断、算法范畴分类和知识点抽取使用。

## 命令

```bash
npm run parse:official-pdfs
npm run validate:pdf-parser
```

默认情况下，解析器会读取 `data/official-ingestion/official-source-index.json` 中最新一场官方真题的 PDF，并且只输出 C++ 题目数据。需要调试其他语言时可以显式使用 `--all-languages`，但主数据集和网站 MVP 不混入 Python 或图形化编程。

## 文本抽取器

当前抽取器通过 `scripts/pdfkit-extract-text.swift` 调用 macOS `PDFKit`。这样不需要新增 npm 依赖，也不会持久化保存 PDF 文件。

抽取器被刻意隔离在 `scripts/parse-official-pdfs.mjs` 后面。后续做后端服务或 CI 时，可以把这一层替换成 Docker 化的 `poppler` / `pdftotext` 抽取器，解析输出契约保持不变。

## 输出内容

`data/problem-ingestion/official-pdf-problems.json` 会保存：

- PDF 来源 URL、官方 source ID、来源 hash、字节数和页数。
- 推断出的考试场次、语言和 GESP 等级；默认输出语言必须是 C++。
- 题目记录：题型、题号、标题、页码、短证据片段、parser version、置信度和 review status。

它不会保存完整 PDF 文本，也不会保存完整题面。

## 当前版本

当前输出使用 `official-pdf-parser-v2`。这个版本放宽了编程题标题的前瞻范围，用于处理 PDF 文本流中“上一题参考程序”插入到下一题标题之前的情况，例如 2026 年 03 月 C++ 四级第 2 道编程题可以正确识别为“礼盒排序”。
