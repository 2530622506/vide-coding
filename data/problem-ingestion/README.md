# 题目采集

这个目录保存从官方 GESP 来源中抽取出来的结构化题目 metadata。当前项目主线只面向 C++ GESP，不把 Python 或图形化编程混入主数据集。

## 文件

- `official-pdf-problems.json`：从官方 PDF 中解析出的题目 metadata。
- `official-pdf-visual-assets.json`：从官方 PDF 中抽取的题目图片 / 代码截图资产 metadata；实际 PNG 文件位于 `apps/web/public/gesp-assets/official-pdf/`。

## 存储策略

解析器不保存完整 PDF 文本，也不保存完整题面。当前只保存：

- 来源 PDF URL 和来源 hash。
- 推断出的场次、语言和等级；默认主数据只保留 C++。
- 题型和题号。
- 选择题 A/B/C/D 结构化选项；当前可从官方 PDF 文本层稳定抽取 97 / 120 道，剩余 23 道保留 A/B/C/D 选项槽位并标记为 `needs_review`，避免页面出现空选项，同时提示需要人工复核原 PDF。
- 题目相关图片或代码截图裁剪资产；当前从 8 份官方 C++ PDF 抽取 218 个官方 PDF 图片区域，覆盖 100 道题，全部标记 `needs_review` 并保留来源页码和 hash。
- 页码引用。
- 短证据片段。
- parser version 和 review status。

完整 PDF 内容只会在解析过程中临时下载，运行结束后会删除。图片采集器只保存裁剪后的题目相关区域，不保存完整 PDF 页面。
