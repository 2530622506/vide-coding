# 来源注册表

这个目录是 GESP 来源发现的 metadata-first 注册表。它保存来源 metadata、信任策略、爬取策略和存储策略，不是题面存储目录。

来源信任规则和更新流程见 `docs/source-registry.md`。

使用注册表前先运行验证：

```bash
npm run validate:sources
```
