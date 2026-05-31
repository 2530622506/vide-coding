# OJ 镜像采集

这个目录保存第三方 OJ、训练题单、题解页面和 GitHub 参考题库中抽取出来的题目候选 metadata。

## 文件

- `mirror-problem-candidates.json`：从洛谷、zqiceberg、Hydro、GitHub `jonaslgtm/gesp-exam-questions` 等来源抽取出的镜像 / 练习入口 / C++ PDF 参考候选。

## 存储策略

这里不保存第三方完整题面，也不保存完整 HTML。当前只保存：

- 来源 URL、实际访问 URL、状态码、hash 和字节数。
- 候选题目的 URL、标题、OJ 系统、OJ ID、来源类型和信任等级。
- 场次、等级、语言和社区标签等辅助线索。
- GitHub 参考源只保存 C++ PDF 的 `repository_path`、`github_sha`、`file_size` 和 `reference_kind`，不保存 PDF 正文。
- 短证据片段、抽取方式、置信度和复核状态。
- 与官方题目的重复候选关系。

第三方来源不能作为官方等级或官方知识点范围的依据，只能用于练习入口、题目映射和辅助标签证据。
