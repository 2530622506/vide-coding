# 实施计划与任务拆分

## P0：依赖与架构准备

1. 添加 `@ant-design/pro-components`。
   - 命令：`pnpm add @ant-design/pro-components`
   - 验收：`package.json` 有依赖，`npm run build:web` 不因依赖失败。

2. 建立 B 端布局骨架。
   - 新增 `apps/web/src/layouts/WorkbenchLayout.tsx`。
   - 使用 `ProLayout` 或 ProComponents 推荐布局能力。
   - 菜单固定为：题库练习、试做记录、练习包、知识点覆盖、来源证据、题目维护、算法题库。
   - 验收：所有页面共用左侧导航；不出现教师 / 教研 / 助教角色。

3. 抽出轻量路由配置。
   - 将 `App.tsx` 里的 pathname 判断改为明确 route map。
   - 保留无 react-router 的轻量方案，除非实际实现中路由复杂度明显上升。
   - 验收：`/`、`/maintenance`、`/source-evidence`、`/atcoder`、`/atcoder/:id`、`/atcoder/:id/edit`、`/ide/:id`、`/ide/atcoder/:id` 能跳转。

## P1：清理旧可见概念

4. 从 B 端可见 UI 移除“复核 / 冲突”表达。
   - 修改 `App.tsx`、`DomainPanel.tsx`、`catalogLabels.tsx`、`ProblemEditorModal.tsx`、`AtCoderCatalogPage.tsx` 的用户可见文案。
   - 内部类型可以保留 `needs_review/conflict`，但 UI 不展示为“复核队列 / 冲突标签”。
   - 替代表达：题面完整、样例可运行、来源入口、答案已填、可练、待补资料。
   - 验收：`rg -n "复核|冲突|教师|教研|助教" apps/web/src` 不命中用户可见文案。

5. 去掉主工作台对 `review-queue/summary` 的依赖。
   - `GespCatalogPage` 不再拉取 review summary。
   - 后端 review 接口保留，不在 B 端工作台入口使用。
   - 验收：主页面 Network 不请求 `/catalog/review-queue/summary`。

## P2：GESP B 端练习工作台

6. 重构首页为 `PracticeWorkbenchPage`。
   - 对齐 `b-01-practice-workbench.png`。
   - 用 `PageContainer` + `StatisticCard/ProCard` 做顶部指标。
   - 用 AntD `Input.Search`、`Select` 做筛选。
   - 中部保留算法范畴 / 题型 / 题目三级扫描结构，可用 `ProCard` 分栏。
   - 右侧展示当前题目、练习包草稿、覆盖概览。
   - 验收：B 端首屏是练习工作台，不是旧的“GESP C++ 题型分类目录”。

7. 题目详情与试做入口优化。
   - 对齐 `b-02-problem-practice.png`。
   - `ProblemDetailPanel` 改成更适合练习的结构：题面、样例、知识点讲解、来源、进入 IDE。
   - 验收：编程题可直接进入 `/ide/:id`；非编程题不展示无效 IDE 行为。

8. 练习包草稿前端态。
   - 初期使用前端 state 或 localStorage，避免先加后端。
   - 支持加入题目、查看已选题、按知识点显示预计时长。
   - 验收：刷新前能看到本页已选题；后续是否持久化进后端再单独决策。

## P3：题目维护与来源证据

9. 新建 `ProblemMaintenancePage`。
   - 对齐 `b-06-problem-maintenance.png`。
   - 左侧用 `ProTable` 做题目列表。
   - 中间用 `ProForm` + tabs 维护基础、题面、答案、样例、图片。
   - 右侧用 `ProCard` 做练习页预览、图片资产、保存检查。
   - 验收：替代现有 `ProblemEditorModal` 的主要维护能力；旧 Modal 可暂时保留为兼容入口。

10. 新建 `SourceEvidencePage`。
    - 对齐 `b-05-source-evidence.png`。
    - 前端先组合 `audit/summary`、`audit/events`、题目详情 `source_versions`。
    - 如果组合成本过高，再加 `GET /api/catalog/source-evidence`。
    - 验收：页面展示来源注册表、证据链路、来源健康和题目来源映射；不展示复核队列。

11. 新建 `KnowledgeCoveragePage`。
    - 对齐 `b-04-knowledge-coverage.png`。
    - 展示知识点覆盖、弱项、练习包入口。
    - 验收：可按知识点跳回练习工作台筛题。

## P4：AtCoder 独立题库链路

12. 拆分 AtCoder 页面文件。
    - 目标：`AtCoderCatalogPage.tsx` 从 1455 行拆到 `< 1000`。
    - 建议结构：
      - `pages/atcoder/AtCoderCatalogPage.tsx`
      - `pages/atcoder/AtCoderProblemDetailPage.tsx`
      - `pages/atcoder/AtCoderMaintenancePage.tsx`
      - `features/atcoder/AtCoderProblemEditor.tsx`
      - `features/atcoder/AtCoderProblemList.tsx`
      - `features/atcoder/AtCoderStatement.tsx`
    - 验收：每个文件职责单一，build 通过。

13. AtCoder 列表页优化。
    - 对齐 `b-07-atcoder-catalog.png`。
    - 用 `PageContainer`、`StatisticCard`、`Tabs`、`ProCard`。
    - 保留 AtCoder 独立 difficulty、algorithm_domains、problem_type_tags、knowledge_points。
    - 验收：点击题目进入详情路由，而不是只在同页右栏展示。

14. AtCoder 题目详情页。
    - 对齐 `b-08-atcoder-problem-detail.png`。
    - 用 `ProDescriptions` 展示 pid、提交、通过率、限制、题面状态、解法状态。
    - 右侧保留进入 IDE、加入练习包、编辑题目。
    - 验收：`/atcoder/:id` 可以单独打开、刷新、返回列表。

15. AtCoder 维护页。
    - 对齐 `b-10-atcoder-maintenance.png`。
    - 用 `ProTable` + `ProForm` 替换当前大 Modal。
    - 字段保留 `pid/title/title_zh/difficulty_label/source_url/total_submit/total_accepted/acceptance_rate/algorithm_domains/problem_type_tags/knowledge_points/statement.sections/samples/limits/visual_assets/programming_solution`。
    - 验收：保存走现有 `POST/PUT /api/atcoder-catalog/problems`；保存后刷新 catalog。

16. AtCoder IDE 页微调。
    - 对齐 `b-09-atcoder-ide-practice.png`。
    - 继续使用 `@monaco-editor/react`。
    - 优化左题面、中编辑器、右运行结果结构。
    - 验收：GESP 和 AtCoder 双来源都能运行当前样例与全部样例。

## P5：后端补口与验证

17. 后端聚合接口评估。
    - 如果 P2/P3 前端需要多次请求才能拼出页面，再新增聚合接口。
    - 优先新增只读接口，不改变现有 CRUD。
    - 验收：接口有返回类型，JSON fallback 和 MySQL fallback 行为明确。

18. AtCoder 生产初始化保护。
    - 在部署文档或启动检查中补 `npm run db:seed:atcoder`。
    - 可选：在 `AtCoderCatalogService.saveProblems` 捕获缺表时返回更明确错误。
    - 验收：保存失败时前端提示“需要初始化 AtCoder 表”，而不是泛化 500。

19. 构建与回归。
    - `npm run build:web`
    - `npm run build:api`
    - 如改后端接口：补对应验证脚本或最小 smoke 测试。
    - 用 Browser / Chrome 检查 desktop 1440、mobile 390。

## 执行顺序建议

1. P0 + P1：先建立可控架构和去掉旧概念。
2. P4 AtCoder：它已有接口和页面，先拆分并落地独立链路，风险更可控。
3. P2 GESP 工作台：替换旧首页。
4. P3 来源证据 / 题目维护 / 覆盖页。
5. P5 后端补口和验证。
