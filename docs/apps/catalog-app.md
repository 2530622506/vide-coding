# Catalog App

M4 从分类数据进入可运行网站骨架。当前实现使用 MySQL 作为后端读模型，生成好的 JSON 数据作为导入源；如果 MySQL 不可用，API 会降级读取 JSON，方便本地调试。

## MySQL

启动 Docker MySQL：

```bash
npm run db:up
```

导入分类数据：

```bash
npm run db:seed
npm run validate:db
```

默认连接：

- host：`127.0.0.1`
- port：`3310`
- database：`gesp_catalog`
- user：`gesp`

开发默认密码写在 `.env.example`，只用于本地容器。

## 后端

Nest API 位于 `apps/api`。

命令：

```bash
npm run dev:api
```

默认地址：

- `GET /api/catalog/levels`
- `GET /api/catalog/levels/:level`
- `GET /api/catalog/problems/:id`
- `POST /api/catalog/problems`
- `PATCH /api/catalog/problems/:id`
- `DELETE /api/catalog/problems/:id`
- `GET /api/catalog/review-queue/summary`

API 优先读取 MySQL 表：

- `classification_records`
- `review_queue_items`
- `problem_answer_guidance`
- `problem_details`
- `source_versions`
- `catalog_metadata`

JSON 降级读取：

- `data/classification/conflict-confidence-model.json`
- `data/classification/review-queue.json`
- `data/classification/problem-answer-guidance.json`
- `data/classification/problem-details.json`
- `data/classification/supplemental-cxx-problems.json`
- `data/canonical-problems/canonical-problem-alignment.json`

## 前端

React + Vite 位于 `apps/web`。

命令：

```bash
npm run dev:web
```

默认地址：`http://localhost:5173`

页面默认打开 C++ 五级目录，信息架构是：

```text
level -> algorithm domain -> problem type -> problems -> knowledge points
```

页面不会以搜索框作为主入口。

页面支持用户维护题目：

- 新增题目：写入 MySQL，并默认标记为 `needs_review`。
- 修改当前：可维护等级、题型、算法范畴、题型标签、知识点、题面、选择题选项、样例、图片 URL、来源链接、参考答案、知识点讲解和 C++ 参考解。
- 删除当前：只删除当前 MySQL 目录中的题目、详情、答案和来源记录，不会删除原始 JSON 题源或公开站点内容。
- 新增时如果题目 ID 已存在，API 返回冲突错误，避免覆盖官方题或已维护题。
- 点击题目后右侧详情面板会滚动到顶部；新增/修改时会滚动到编辑器顶部，适配页面底部点击场景。
- 中间题目列表会为已采集图片的题目展示缩略图，点击缩略图可直接预览，不需要先打开右侧详情。

点击题目后，右侧题目详情面板展示：

- 参考答案状态和答案证据。
- 已补采题目的结构化题面和来源条款复核状态。
- 已补采题目的样例输入输出。
- 知识点讲解、理解步骤和中文注释。
- 选择题选项状态；已稳定抽取的官方 PDF A/B/C/D 选项会直接展示，未抽取完整选项时保留 A/B/C/D 槽位并标为待复核。
- 图片资产状态；已采集的官方 PDF 裁剪图 / OJ 题面图按 asset metadata 渲染，未发现图片时显示“未发现”并保留复核提示。
- 图片资产支持点击预览；预览可通过关闭按钮、遮罩点击或 `Esc` 关闭。
- 编程题 C++ 参考解状态；AI 生成参考解会展示生成提示、算法说明、复杂度和样例验证状态。
- 官方 PDF / OJ 等来源链接。
- 如果讲解是 AI 生成的学习辅助内容，会显示 AI 辅助和需甄别提示。

## 构建

```bash
npm run build:api
npm run build:web
```

## 数据边界

- 首版只展示 C++ 数据。
- 题型和知识点展示优先使用 `effective_review_status` 与 `final_confidence`。
- 每道题展示 `reference_answer`、`understanding_example` 和中文注释。
- 每道题详情展示 `problem_details`，用于承载题干片段、选项、图片资产、样例和编程参考解。
- 选择题答案来自官方答案表；判断题暂时标为待复核；官方编程题已补 AI C++ 参考解，但必须保持 `needs_review` 并展示“AI 生成、请甄别”提示。
- 已补充的 AI C++ 参考解只在样例通过后展示，状态仍为 `needs_review`，不能当作官方答案。
- 当前已有选择题答案，97 道选择题已稳定抽取官方 PDF A/B/C/D 选项；剩余 23 道选择题保留 A/B/C/D 槽位并标为 `needs_review`，没有官方选择题详情为空选项数组，但仍需对照原 PDF 复核。
- 当前已有 101 道官方题目详情带图片资产，共 219 个资产；其中官方 PDF 裁剪图片 / 代码截图 218 个，覆盖 100 道题，公开 OJ 题面图 1 个。其余 115 道官方题目标为 `none_found`，仍可在人工复核后补充。
- 官方五级 27 道题面已补为 `source_extracted`：25 道选择 / 判断题来自官方 PDF 文本层题干片段，2 道编程题来自公开 OJ 题面；PDF 文本层可能丢失公式或代码缩进，因此仍保留 `needs_review`。
- 16 道官方编程题已从公开 OJ 补齐题面和样例，其中 1 道题抽取到题面图片；16 道已补 AI 生成 C++ 参考解并通过当前公开样例。
- 16 道官方编程题已按公开题面和样例通过解法重打分类标签，例如“五级 找数”对齐到排序后二分查找，“六级 选数”对齐到一维 DP；标签仍需复核。
- 公开 OJ 补充题全部标为 `needs_review`，其知识点讲解属于 AI 生成学习辅助，不作为官方题解。
- 公开 OJ 题面补采只访问公开页面，不使用登录态；已抽取题面仍标记 `source_terms_status = needs_review`。
- 公开 OJ 补充题可在题面和样例通过解法补齐后做分类修正；修正标签来源为 `source_extracted_statement_ai_solution_review`，仍需复核。
- 如果公开来源最终没有答案、图片或讲解，允许生成 AI 学习辅助内容或示意图，但页面必须展示 AI 生成和需甄别提示。
- `review_queue_refs` 不为空的题目需要在后续 Review Workflow 中人工确认。
- 当前未使用洛谷登录态，也没有爬取账号私有数据。
- 后续按 [GESP C++ 题库扩充待办](../future-cpp-source-expansion.md) 扩充更多 C++ 题源并导入 MySQL；下一批公开 OJ 补采目标可用 `npm run plan:next-public-oj` 生成。
