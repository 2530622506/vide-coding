# 前端原型落地分析

## 目标

根据 `prototypes/gesp-redesign/*.png` 重新优化现有 Web 前端，B 端优先，C 端暂不作为主线。实现时优先使用 `@ant-design/pro-components`，其次使用 `antd`，只有 IDE、复杂题面渲染、图片预览、代码编辑器等 ProComponents 不适合的场景保留自定义。

## 范围判定

`scope_verdict`: `large`

原因：改造跨 3 个以上独立区域：应用布局与路由、GESP B 端练习工作台、题目维护与来源证据、AtCoder 独立题库链路、IDE 试做页、可能新增后端聚合接口。需要分阶段执行和逐页验证。

## 已确认约束

- 不展示“复核队列”和“冲突标签”作为用户可见功能。
- 不区分教师、教研、助教等角色。
- B 端不是后台管理视角，而是统一练习工作台。
- AtCoder 与 GESP 数据结构不同，不能复用 GESP 题目目录组件。
- AtCoder 仍要接在同一 B 端工作台下，作为“算法题库”入口。
- ProComponents 可用：计划添加 `@ant-design/pro-components`，优先使用 `ProLayout`、`PageContainer`、`ProCard`、`ProTable`、`ProForm`、`ProDescriptions`。
- 保留 `ahooks useRequest` 作为页面级请求首选。

## 代码现状证据

- `apps/web/src/App.tsx:71` 到 `apps/web/src/App.tsx:113`：当前路由是手写 `pathname` 判断，适合先抽成轻量路由配置，再接 `ProLayout` 菜单。
- `apps/web/src/App.tsx:119` 到 `apps/web/src/App.tsx:586`：GESP 主页面逻辑集中在单个 `GespCatalogPage`，包含请求、筛选、sticky 控件、CRUD、详情栏，后续应拆到 `pages` / `features`。
- `apps/web/src/App.tsx:255` 到 `apps/web/src/App.tsx:263`、`apps/web/src/App.tsx:466`、`apps/web/src/App.tsx:512`：当前仍拉取并展示复核统计，需从 B 端可见页面移除。
- `apps/web/src/components/DomainPanel.tsx:38` 和 `apps/web/src/components/DomainPanel.tsx:148`：题目列表仍展示状态条和复核 tag，需替换成练习可用性、题面完整度、样例 / 图片 / C++ 可运行状态。
- `apps/web/src/components/catalogLabels.tsx:4` 到 `apps/web/src/components/catalogLabels.tsx:9`：可见标签含“待复核 / 冲突”，后续应改成非复核视角的展示映射，或仅在内部类型保留。
- `apps/web/src/pages/AtCoderCatalogPage.tsx:102` 到 `apps/web/src/pages/AtCoderCatalogPage.tsx:330`：AtCoder 列表、详情、编辑弹窗都在一个页面文件内；文件 1455 行，超过前端规范单文件 `< 1000` 红线。
- `apps/web/src/pages/ProblemIdePage.tsx:58`、`apps/web/src/pages/ProblemIdePage.tsx:78`、`apps/web/src/pages/ProblemIdePage.tsx:341` 到 `apps/web/src/pages/ProblemIdePage.tsx:354`：IDE 已支持 `gesp` / `atcoder` 双来源，后续主要是 UI 重排和练习动作补齐。
- `apps/api/src/atcoder-catalog.service.ts:225` 到 `apps/api/src/atcoder-catalog.service.ts:298`：AtCoder catalog、详情、创建、更新、删除接口已具备。
- `apps/api/src/atcoder-catalog.service.ts:380` 到 `apps/api/src/atcoder-catalog.service.ts:424`：AtCoder 保存依赖 `atcoder_problem_bank` 与 `atcoder_catalog_snapshots`，生产环境需要保证 seed 初始化。
- `apps/api/src/catalog.controller.ts:79` 到 `apps/api/src/catalog.controller.ts:87`：已有 audit summary/events，可作为来源证据页后端基础，但前端要改成“来源证据”而非复核工作台。

## ProComponents 使用边界

- `ProLayout`：统一 B 端侧栏、顶部区域和菜单路由。
- `PageContainer`：所有 B 端页面的标题、面包屑、页面 action。
- `ProCard`：指标卡、右侧详情卡、覆盖概览、练习包草稿。
- `StatisticCard` 或 `ProCard + Statistic`：工作台指标。
- `ProTable`：题目维护列表、来源证据表、AtCoder 维护表。
- `ProForm`：GESP 题目维护和 AtCoder 题目维护。
- `ProDescriptions`：题目详情的元数据区。
- 自定义保留：Monaco IDE、Markdown 渲染、图片预览、代码高亮、题目分组卡片。

## 后端接口判断

第一阶段不强行新增后端接口，先复用现有：

- GESP：`GET /api/catalog/levels`、`GET /api/catalog/levels/:level`、`GET /api/catalog/problems/:id`、CRUD。
- 来源证据：`GET /api/catalog/audit/summary`、`GET /api/catalog/audit/events`、题目详情中的 `source_versions` / `source_links`。
- AtCoder：`GET /api/atcoder-catalog`、`GET /api/atcoder-catalog/problems/:id`、CRUD。
- IDE：现有 code-run 服务。

第二阶段如果前端拼装成本过高，再新增聚合接口：

- `GET /api/catalog/workbench/summary`：B 端工作台指标、可练题量、样例可运行数、知识点覆盖。
- `GET /api/catalog/source-evidence`：来源注册表、题目来源映射、来源健康度。
- `GET /api/catalog/practice-package/draft` 或本地 draft store：练习包草稿。

## 风险

- 大范围 UI 重构容易把现有 CRUD 或 IDE 试做链路破坏；必须逐页验收。
- `@ant-design/pro-components` 引入后可能带来 peer 依赖或样式冲突，需要先跑 build。
- AtCoder 生产保存曾因缺表 500，执行前必须确认部署流程包含 `npm run db:seed:atcoder`。
- 如果一次性重写 `App.tsx` 和 `AtCoderCatalogPage.tsx`，回归面过大；应先抽组件和布局，再替换页面。

## Go / No-Go

Go，但必须按阶段执行。第一阶段只处理依赖、布局骨架、隐藏复核 / 冲突可见文案和页面拆分；第二阶段再做页面视觉和交互；第三阶段补后端聚合接口。
