var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { BadRequestException, Injectable } from "@nestjs/common";
import mysql from "mysql2/promise";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
let AtCoderCatalogService = class AtCoderCatalogService {
    dataPath = "data/atcoder/luogu-atcoder-problem-bank.json";
    assetRoot = "data/atcoder/assets";
    catalogCache = null;
    async getCatalog() {
        if (this.catalogCache) {
            return this.catalogCache;
        }
        const bank = await this.loadBank();
        const problemById = new Map(bank.problems.map((problem) => [problem.id, problem]));
        this.catalogCache = {
            generated_at: bank.generated_at,
            source: bank.source,
            summary: bank.summary,
            domains: bank.domains.map((domain) => ({
                ...domain,
                problem_types: domain.problem_types.map((problemType) => ({
                    ...problemType,
                    problems: problemType.problems
                        .map((problemId) => problemById.get(problemId))
                        .filter((problem) => Boolean(problem))
                        .map((problem) => this.problemSummary(problem))
                }))
            }))
        };
        return this.catalogCache;
    }
    async getProblem(id) {
        const mysqlProblem = await this.getMysqlProblem(id);
        if (mysqlProblem) {
            return mysqlProblem;
        }
        return (await this.loadJsonBank()).problems.find((problem) => problem.id === id) || null;
    }
    async createProblem(input) {
        const bank = await this.loadBank();
        if (!input.pid || !input.title) {
            throw new BadRequestException("pid and title are required");
        }
        if (bank.problems.some((problem) => problem.id === input.pid || problem.pid === input.pid)) {
            throw new BadRequestException(`AtCoder problem ${input.pid} already exists`);
        }
        const problem = this.normalizeEditableProblem(input, bank.problems.length + 1);
        await this.saveProblems([...bank.problems, problem], bank);
        return problem;
    }
    async updateProblem(id, input) {
        const bank = await this.loadBank();
        const index = bank.problems.findIndex((problem) => problem.id === id);
        if (index < 0) {
            return null;
        }
        const updated = this.normalizeEditableProblem({
            ...bank.problems[index],
            ...input,
            id,
            pid: bank.problems[index].pid
        }, bank.problems[index].list_order);
        const problems = [...bank.problems];
        problems[index] = updated;
        await this.saveProblems(problems, bank);
        return updated;
    }
    async deleteProblem(id) {
        const bank = await this.loadBank();
        const problems = bank.problems.filter((problem) => problem.id !== id);
        if (problems.length === bank.problems.length) {
            return false;
        }
        await this.saveProblems(problems, bank);
        return true;
    }
    resolveAssetPath(filename) {
        if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
            return null;
        }
        return resolve(process.cwd(), this.assetRoot, filename);
    }
    problemSummary(problem) {
        return {
            id: problem.id,
            pid: problem.pid,
            title: problem.title,
            title_zh: problem.title_zh,
            title_zh_source: problem.title_zh_source,
            difficulty: problem.difficulty,
            difficulty_label: problem.difficulty_label,
            total_submit: problem.total_submit,
            total_accepted: problem.total_accepted,
            acceptance_rate: problem.acceptance_rate,
            knowledge_points: problem.knowledge_points
        };
    }
    async loadBank() {
        const mysqlBank = await this.loadMysqlBank();
        return mysqlBank || this.loadJsonBank();
    }
    loadJsonBank() {
        return JSON.parse(readFileSync(resolve(process.cwd(), this.dataPath), "utf8"));
    }
    async loadMysqlBank() {
        const connection = await this.mysqlConnection();
        if (!connection) {
            return null;
        }
        try {
            const [rows] = await connection.execute("SELECT catalog_json FROM atcoder_catalog_snapshots WHERE snapshot_id = 'active'");
            return rows[0]?.catalog_json || null;
        }
        catch {
            return null;
        }
        finally {
            await connection.end();
        }
    }
    async getMysqlProblem(id) {
        const connection = await this.mysqlConnection();
        if (!connection) {
            return null;
        }
        try {
            const [rows] = await connection.execute("SELECT problem_json FROM atcoder_problem_bank WHERE pid = ?", [id]);
            return rows[0]?.problem_json || null;
        }
        catch {
            return null;
        }
        finally {
            await connection.end();
        }
    }
    async saveProblems(problems, previousBank) {
        const bank = this.rebuildCatalog(problems, previousBank);
        this.catalogCache = null;
        const connection = await this.mysqlConnection();
        if (!connection) {
            writeFileSync(resolve(process.cwd(), this.dataPath), `${JSON.stringify(bank, null, 2)}\n`, "utf8");
            return;
        }
        try {
            await connection.beginTransaction();
            await connection.query("DELETE FROM atcoder_problem_bank");
            for (const problem of bank.problems) {
                await connection.execute(`INSERT INTO atcoder_problem_bank (
            pid,
            difficulty,
            difficulty_label,
            title,
            title_zh,
            problem_json
          ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))`, [
                    problem.pid,
                    problem.difficulty,
                    problem.difficulty_label,
                    problem.title,
                    problem.title_zh,
                    JSON.stringify(problem)
                ]);
            }
            await connection.execute(`INSERT INTO atcoder_catalog_snapshots (snapshot_id, catalog_json)
         VALUES ('active', CAST(? AS JSON))
         ON DUPLICATE KEY UPDATE catalog_json = VALUES(catalog_json)`, [JSON.stringify(bank)]);
            await connection.commit();
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            await connection.end();
        }
    }
    rebuildCatalog(problems, previousBank) {
        const difficultyCounts = {};
        for (const problem of problems) {
            difficultyCounts[problem.difficulty_label] = (difficultyCounts[problem.difficulty_label] || 0) + 1;
        }
        return {
            ...previousBank,
            generated_at: new Date().toISOString(),
            summary: {
                ...previousBank.summary,
                problem_count: problems.length,
                difficulty_counts: difficultyCounts,
                domain_count: this.groupCatalog(problems).length,
                knowledge_point_count: new Set(problems.flatMap((problem) => problem.knowledge_points.map((point) => point.id))).size,
                local_ai_answer_count: problems.length,
                title_zh_count: problems.filter((problem) => problem.title_zh).length
            },
            domains: this.groupCatalog(problems),
            problems
        };
    }
    groupCatalog(problems) {
        const domainMap = new Map();
        for (const problem of problems) {
            for (const domain of problem.algorithm_domains) {
                if (!domainMap.has(domain.id)) {
                    domainMap.set(domain.id, {
                        domain_id: domain.id,
                        domain_label: domain.label,
                        problem_count: 0,
                        difficulty_counts: {},
                        problem_types: new Map()
                    });
                }
                const domainBucket = domainMap.get(domain.id);
                if (!domainBucket) {
                    continue;
                }
                domainBucket.problem_count += 1;
                domainBucket.difficulty_counts[problem.difficulty_label] = (domainBucket.difficulty_counts[problem.difficulty_label] || 0) + 1;
                for (const type of problem.problem_type_tags) {
                    if (!domainBucket.problem_types.has(type.id)) {
                        domainBucket.problem_types.set(type.id, {
                            problem_type_id: type.id,
                            problem_type_label: type.label,
                            problem_count: 0,
                            knowledge_points: new Map(),
                            problems: []
                        });
                    }
                    const typeBucket = domainBucket.problem_types.get(type.id);
                    if (!typeBucket) {
                        continue;
                    }
                    typeBucket.problem_count += 1;
                    typeBucket.problems.push(problem.id);
                    for (const point of problem.knowledge_points) {
                        typeBucket.knowledge_points.set(point.id, point);
                    }
                }
            }
        }
        return [...domainMap.values()]
            .map((domain) => ({
            ...domain,
            problem_types: [...domain.problem_types.values()].map((type) => ({
                ...type,
                knowledge_points: [...type.knowledge_points.values()],
                problems: type.problems
            }))
        }))
            .sort((a, b) => b.problem_count - a.problem_count || a.domain_label.localeCompare(b.domain_label, "zh-CN"));
    }
    normalizeEditableProblem(input, listOrder) {
        const pid = input.pid || input.id || "";
        const difficulty = input.difficulty || 3;
        const difficultyLabel = input.difficulty_label || (difficulty === 2 ? "普及-" : difficulty === 4 ? "普及+/提高" : difficulty === 5 ? "提高+/省选-" : "普及/提高-");
        const sourceUrl = input.source_url || `https://www.luogu.com.cn/problem/${pid}`;
        return {
            id: pid,
            pid,
            title: input.title || pid,
            title_zh: input.title_zh || input.title || pid,
            title_zh_source: input.title_zh_source || "user_input",
            difficulty,
            difficulty_label: difficultyLabel,
            source_url: sourceUrl,
            total_submit: input.total_submit || 0,
            total_accepted: input.total_accepted || 0,
            acceptance_rate: input.acceptance_rate ?? null,
            algorithm_domains: input.algorithm_domains?.length ? input.algorithm_domains : [{ id: "user_custom", label: "自定义" }],
            problem_type_tags: input.problem_type_tags?.length ? input.problem_type_tags : [{ id: "user_custom", label: "自定义" }],
            knowledge_points: input.knowledge_points?.length ? input.knowledge_points : [{ id: "user_custom", label: "自定义维护" }],
            tags: input.tags || [],
            answer_guidance: input.answer_guidance || {
                status: "reference_link",
                answer: "当前答案是 AI 生成，仅供参考。该题为用户新增题目，请继续补充参考思路。",
                source: "luogu_problem_page",
                source_url: sourceUrl,
                solution_outline: "用户新增题目，答案待完善。",
                knowledge_points: [],
                review_note: "当前答案是 AI 生成，仅供参考；不是官方题解。"
            },
            statement: input.statement || {
                status: "pending_collection",
                locale: "zh-CN",
                source_terms_status: "needs_review",
                source_url: sourceUrl,
                atcoder_url: null,
                sections: [],
                samples: [],
                limits: { time_ms: null, memory_kb: null },
                notes: ["用户新增题目，题面待补。"]
            },
            visual_assets: input.visual_assets || {
                status: "none_found",
                assets: [],
                notes: []
            },
            programming_solution: input.programming_solution || {
                status: "needs_review",
                language: "C++17",
                code: null,
                content_origin: "local_ai_generated_reference",
                ai_generation_notice: "当前答案是 AI 生成，仅供参考；不是官方题解。",
                reference_answer: "当前答案是 AI 生成，仅供参考。",
                algorithm: "",
                complexity: "",
                verification: null,
                notes: []
            },
            list_order: listOrder
        };
    }
    async mysqlConnection() {
        try {
            return await mysql.createConnection({
                host: process.env.MYSQL_HOST || "127.0.0.1",
                port: Number(process.env.MYSQL_PORT || 3310),
                database: process.env.MYSQL_DATABASE || "gesp_catalog",
                user: process.env.MYSQL_USER || "gesp",
                password: process.env.MYSQL_PASSWORD || "gesp_dev_password"
            });
        }
        catch {
            return null;
        }
    }
};
AtCoderCatalogService = __decorate([
    Injectable()
], AtCoderCatalogService);
export { AtCoderCatalogService };
