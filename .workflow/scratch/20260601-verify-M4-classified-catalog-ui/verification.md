# M4 Classified Catalog UI 验证记录

Date: 2026-06-01
Milestone: `M4`
Roadmap: `.workflow/roadmap.md#milestone-4-classified-catalog-ui`

## 覆盖范围

- Phase 9：目录信息架构，`level -> algorithm domain -> problem type -> problems -> knowledge points`。
- Phase 10：题目详情与来源对齐，展示答案、题面、选项、图片资产、C++ 参考解、来源链接、置信度和复核状态。
- Phase 11：C++ 五级目录发布，五级算法范畴页、题型页和知识点覆盖数据可由当前读模型生成。

## 命令

```bash
npm run build:api
npm run build:web
npm run validate:review-workqueue
npm run validate:problem-details
npm run validate:supplemental-cxx
node --input-type=module -e 'import { CatalogService } from "./dist/api/catalog.service.js"; /* service read-model validation */'
```

## 输出摘要

```text
API TypeScript build passed
Web production build passed
review workqueue total: 1229
review workqueue high priority: 2
Problem details validation passed
Supplemental C++ problem validation passed
service data source: json
level count: 8
level 5 problem count: 53
level 5 domain count: 11
review queue count: 70
Catalog service validation passed
```

## 沙箱说明

本地端口监听 `0.0.0.0:3001` 被沙箱拦截，沙箱外执行审批系统也拒绝了该动作。因此本次没有开放 HTTP 端口；验证改为直接实例化已编译的 `CatalogService`，覆盖同一套目录、详情和复核摘要读模型。

## 就绪状态

- M4 的 React / Nest / MySQL 优先、JSON 降级目录应用已存在，文档见 `docs/apps/catalog-app.md`。
- C++ 五级当前可展示 53 道题、11 个算法范畴。
- 题目详情、答案指导、图片资产、样例、来源链接和 AI 生成甄别提示已进入详情模型。
- 复核工作队列仍是 M5 的后续工作入口；`needs_review` 不能自动提升为已确认。
