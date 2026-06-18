---
title: "Debug Notes"
readMode: optional
priority: medium
category: debug
keywords:
  - debug
  - issue
  - workaround
  - root-cause
  - gotcha
---

# Debug Notes

## Entries



<spec-entry category="debug" keywords="atcoder,production,mysql,seed,er-no-such-table" date="2026-06-11" source="docker logs gesp-catalog-api-prod 2026-06-11; apps/api/src/atcoder-catalog.service.ts:380">

### AtCoder 保存 500：生产库缺少 atcoder_problem_bank

症状：线上 http://193.112.176.242/atcoder 页面新增或编辑 AtCoder 题目时，保存接口 PUT /api/atcoder-catalog/problems/:id 返回 500，响应为 {statusCode:500,message:'Internal server error'}；但 GET /api/atcoder-catalog 和 GET /api/atcoder-catalog/problems/AT_abc022_a 正常。排查方法：先 GET 线上题目 JSON，再用原样 JSON no-op PUT 回同一题号；如果仍然 500，可排除前端 payload 问题。日志特征：docker logs --tail=200 gesp-catalog-api-prod 出现 ER_NO_SUCH_TABLE，sqlMessage 为 Table 'gesp_catalog.atcoder_problem_bank' doesn't exist，SQL 为 DELETE FROM atcoder_problem_bank。根因：AtCoder 读取路径会在 MySQL 失败时降级读取 data/atcoder/luogu-atcoder-problem-bank.json，所以页面可展示；保存路径 AtCoderCatalogService.saveProblems 会连接 MySQL 并重建 AtCoder 表数据，第一步 DELETE FROM atcoder_problem_bank，生产库未初始化 AtCoder 表时直接抛错。修复：在服务器执行 docker exec gesp-catalog-api-prod node scripts/seed-atcoder-mysql.mjs，成功输出 seeded AtCoder problems 和 seeded AtCoder catalog snapshot 后，再用原样 GET/PUT 验证应返回 200。注意：该脚本会重置 AtCoder 两张表，已有人工编辑数据时需先备份。部署预防：生产首次初始化不能只跑 scripts/seed-mysql-catalog.mjs，还要初始化 AtCoder 的 scripts/seed-atcoder-mysql.mjs。

</spec-entry>