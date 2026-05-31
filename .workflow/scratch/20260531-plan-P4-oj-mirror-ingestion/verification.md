# Phase 4 OJ Mirror Ingestion 验证记录

Date: 2026-05-31
Plan: `PLN-20260531-P4-oj-mirror-ingestion`
Phase: `oj-mirror-ingestion`

## 命令

```bash
npm run validate:sources
npm run ingest:oj
npm run validate:oj-ingestion
npm run validate:pdf-parser
npm run validate:official-ingestion
```

## 输出摘要

```text
official source count: 5
secondary source count: 13
Source registry validation passed

OJ source document count: 16
OJ mirror/practice entry count: 345
OJ Luogu entry count: 232
OJ zqiceberg entry count: 24
OJ selected mirror entry count: 7
OJ GitHub C++ reference entry count: 106
OJ duplicate candidate count: 44
OJ mirror ingestion validation passed

parsed PDF document count: 8
parsed PDF problem count: 216
parsed PDF C++ level 5 problem count: 27
Official PDF parser validation passed

official ingestion document count: 180
official ingestion true-question session count: 10
official ingestion sample attachment count: 15
Official source ingestion validation passed
```

## 就绪状态

- GitHub `jonaslgtm/gesp-exam-questions` 已作为辅助题库参考源接入 source registry。
- GitHub 适配器只采集 C++ PDF metadata：83 个历年真题 PDF、8 个样题 PDF、15 个解析 PDF。
- Python、Scratch 和图形化目录不会进入 `mirror-problem-candidates.json`。
- 所有二级来源仍为非 canonical，只用于练习入口、题目映射和辅助证据。

## 后续风险

- GitHub 仓库 license 和内容来源仍按 `third_party_unknown` 处理，不能保存 PDF 正文。
- 同名不同场次题目会进入重复候选，Phase 5 需要按官方题目做 canonical alignment。
- 洛谷训练题单仍返回 `401 login_required`，当前只记录受限状态。
