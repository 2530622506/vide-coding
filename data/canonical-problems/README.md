# Canonical Problems

这个目录保存 GESP C++ canonical problem alignment 的输出。当前阶段只做题源对齐，不做算法范畴、题型模板或知识点分类。

## 文件

- `canonical-problem-alignment.json`：以官方 C++ PDF 题目为 canonical record，挂载可自动对齐的二级来源链接，并保留 duplicate / conflict / unmatched 复核队列。
- `cxx-level5-canonical-table.json`：面向前端分类目录的 C++ 五级 canonical table，包含 27 行官方题目和对应练习链接。

## 信任边界

- 官方 GESP PDF 是 canonical problem 的唯一来源。
- 洛谷、zqiceberg、Hydro、GitHub 等二级来源只能作为 `source_versions`，不能覆盖官方等级、题型或知识点范围。
- 当前不保存完整题面、完整 HTML 或 PDF 正文，只保存 metadata、短证据片段和链接。

## 当前结果

- C++ canonical problems：216
- C++ 五级 canonical table：27 行
- 自动对齐的编程题：16 道
- 二级 source versions：18 个
- duplicate candidates：44 个
- conflict candidates：1 个
