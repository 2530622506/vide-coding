import { BadRequestException, Injectable } from "@nestjs/common";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export type AtCoderTag = {
  id: number;
  name: string;
  type: number;
  parent: number | null;
};

export type AtCoderLabel = {
  id: string;
  label: string;
};

export type AtCoderAnswerGuidance = {
  status: "reference_link";
  answer: string;
  source: "luogu_problem_page";
  source_url: string;
  solution_outline: string;
  knowledge_points: string[];
  review_note: string;
};

export type AtCoderStatementSection = {
  id: string;
  title: string;
  markdown: string;
};

export type AtCoderSampleCase = {
  id: string;
  input: string;
  output: string;
};

export type AtCoderVisualAsset = {
  id: string;
  section_id: string;
  source_url: string;
  alt_text: string;
  status: "downloaded" | "download_failed";
  local_path: string | null;
  asset_url: string;
  content_type?: string | null;
  size_bytes?: number;
  error?: string;
};

export type AtCoderStatement = {
  status: "source_extracted" | "pending_collection";
  locale: string;
  source_terms_status: "needs_review";
  source_url: string;
  atcoder_url: string | null;
  sections: AtCoderStatementSection[];
  samples: AtCoderSampleCase[];
  limits: {
    time_ms: number | null;
    memory_kb: number | null;
  };
  notes: string[];
};

export type AtCoderProgrammingSolution = {
  status: "pending_ai_generation" | "needs_review";
  language: "C++17";
  code: string | null;
  content_origin: "pending_ai_generation" | "ai_generated_sample_verified" | "ai_generated_compile_verified" | "local_ai_generated_reference";
  ai_generation_notice: string;
  reference_answer: string;
  algorithm: string;
  complexity: string;
  verification: null | {
    status: "sample_passed" | "compiled_no_samples";
    verifier: string;
    verified_at: string;
    sample_count: number;
    sample_results: Array<{
      index: number;
      expected: string;
      actual: string;
      passed: boolean;
    }>;
  };
  notes: string[];
};

export type AtCoderProblem = {
  id: string;
  pid: string;
  title: string;
  title_zh: string;
  title_zh_source?: string;
  difficulty: 3 | 4 | 5;
  difficulty_label: "普及/提高-" | "普及+/提高" | "提高+/省选-";
  source_url: string;
  total_submit: number;
  total_accepted: number;
  acceptance_rate: number | null;
  algorithm_domains: AtCoderLabel[];
  problem_type_tags: AtCoderLabel[];
  knowledge_points: AtCoderLabel[];
  tags: AtCoderTag[];
  answer_guidance: AtCoderAnswerGuidance;
  statement: AtCoderStatement;
  visual_assets: {
    status: "source_extracted" | "none_found" | "pending_collection";
    assets: AtCoderVisualAsset[];
    notes: string[];
  };
  programming_solution: AtCoderProgrammingSolution;
  list_order: number;
};

export type AtCoderProblemSummary = Pick<
  AtCoderProblem,
  | "id"
  | "pid"
  | "title"
  | "title_zh"
  | "title_zh_source"
  | "difficulty"
  | "difficulty_label"
  | "source_url"
  | "total_submit"
  | "total_accepted"
  | "acceptance_rate"
  | "algorithm_domains"
  | "problem_type_tags"
  | "knowledge_points"
  | "answer_guidance"
>;

type AtCoderProblemTypeIndex = {
  problem_type_id: string;
  problem_type_label: string;
  problem_count: number;
  knowledge_points: AtCoderLabel[];
  problems: string[];
};

type AtCoderDomainIndex = {
  domain_id: string;
  domain_label: string;
  problem_count: number;
  difficulty_counts: Record<string, number>;
  problem_types: AtCoderProblemTypeIndex[];
};

type AtCoderBankData = {
  generated_at: string;
  source: {
    list_url: string;
    tag_url: string;
    total_source_problem_count: number;
    pages_crawled: number;
    crawl_delay_ms: number;
    difficulty_filter: Array<{ difficulty: number; label: string }>;
    notes: string[];
  };
  summary: {
    problem_count: number;
    difficulty_counts: Record<string, number>;
    domain_count: number;
    knowledge_point_count: number;
    local_ai_answer_count?: number;
    title_zh_count?: number;
    source_extracted_statement_count?: number;
    pending_statement_count?: number;
    ai_sample_verified_solution_count?: number;
    pending_ai_generation_count?: number;
  };
  domains: AtCoderDomainIndex[];
  problems: AtCoderProblem[];
};

type AtCoderProblemTypeBucket = Omit<AtCoderProblemTypeIndex, "knowledge_points"> & {
  knowledge_points: Map<string, AtCoderLabel>;
};

type AtCoderDomainBucket = Omit<AtCoderDomainIndex, "problem_types"> & {
  problem_types: Map<string, AtCoderProblemTypeBucket>;
};

@Injectable()
export class AtCoderCatalogService {
  private readonly dataPath = "data/atcoder/luogu-atcoder-problem-bank.json";
  private readonly assetRoot = "data/atcoder/assets";

  async getCatalog() {
    const bank = await this.loadBank();
    const problemById = new Map(bank.problems.map((problem) => [problem.id, problem]));

    return {
      generated_at: bank.generated_at,
      source: bank.source,
      summary: bank.summary,
      domains: bank.domains.map((domain) => ({
        ...domain,
        problem_types: domain.problem_types.map((problemType) => ({
          ...problemType,
          problems: problemType.problems
            .map((problemId) => problemById.get(problemId))
            .filter((problem): problem is AtCoderProblem => Boolean(problem))
            .map((problem) => this.problemSummary(problem))
        }))
      }))
    };
  }

  async getProblem(id: string) {
    const mysqlProblem = await this.getMysqlProblem(id);
    if (mysqlProblem) {
      return mysqlProblem;
    }
    return (await this.loadJsonBank()).problems.find((problem) => problem.id === id) || null;
  }

  async createProblem(input: Partial<AtCoderProblem>) {
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

  async updateProblem(id: string, input: Partial<AtCoderProblem>) {
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

  async deleteProblem(id: string) {
    const bank = await this.loadBank();
    const problems = bank.problems.filter((problem) => problem.id !== id);
    if (problems.length === bank.problems.length) {
      return false;
    }
    await this.saveProblems(problems, bank);
    return true;
  }

  resolveAssetPath(filename: string) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
      return null;
    }
    return resolve(process.cwd(), this.assetRoot, filename);
  }

  private problemSummary(problem: AtCoderProblem): AtCoderProblemSummary {
    return {
      id: problem.id,
      pid: problem.pid,
      title: problem.title,
      title_zh: problem.title_zh,
      title_zh_source: problem.title_zh_source,
      difficulty: problem.difficulty,
      difficulty_label: problem.difficulty_label,
      source_url: problem.source_url,
      total_submit: problem.total_submit,
      total_accepted: problem.total_accepted,
      acceptance_rate: problem.acceptance_rate,
      algorithm_domains: problem.algorithm_domains,
      problem_type_tags: problem.problem_type_tags,
      knowledge_points: problem.knowledge_points,
      answer_guidance: problem.answer_guidance
    };
  }

  private async loadBank(): Promise<AtCoderBankData> {
    const mysqlBank = await this.loadMysqlBank();
    return mysqlBank || this.loadJsonBank();
  }

  private loadJsonBank(): AtCoderBankData {
    return JSON.parse(readFileSync(resolve(process.cwd(), this.dataPath), "utf8")) as AtCoderBankData;
  }

  private async loadMysqlBank() {
    const connection = await this.mysqlConnection();
    if (!connection) {
      return null;
    }
    try {
      const [rows] = await connection.execute<Array<RowDataPacket & { catalog_json: AtCoderBankData }>>(
        "SELECT catalog_json FROM atcoder_catalog_snapshots WHERE snapshot_id = 'active'"
      );
      return rows[0]?.catalog_json || null;
    } catch {
      return null;
    } finally {
      await connection.end();
    }
  }

  private async getMysqlProblem(id: string) {
    const connection = await this.mysqlConnection();
    if (!connection) {
      return null;
    }
    try {
      const [rows] = await connection.execute<Array<RowDataPacket & { problem_json: AtCoderProblem }>>(
        "SELECT problem_json FROM atcoder_problem_bank WHERE pid = ?",
        [id]
      );
      return rows[0]?.problem_json || null;
    } catch {
      return null;
    } finally {
      await connection.end();
    }
  }

  private async saveProblems(problems: AtCoderProblem[], previousBank: AtCoderBankData) {
    const bank = this.rebuildCatalog(problems, previousBank);
    const connection = await this.mysqlConnection();
    if (!connection) {
      writeFileSync(resolve(process.cwd(), this.dataPath), `${JSON.stringify(bank, null, 2)}\n`, "utf8");
      return;
    }
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM atcoder_problem_bank");
      for (const problem of bank.problems) {
        await connection.execute(
          `INSERT INTO atcoder_problem_bank (
            pid,
            difficulty,
            difficulty_label,
            title,
            title_zh,
            problem_json
          ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))`,
          [
            problem.pid,
            problem.difficulty,
            problem.difficulty_label,
            problem.title,
            problem.title_zh,
            JSON.stringify(problem)
          ]
        );
      }
      await connection.execute(
        `INSERT INTO atcoder_catalog_snapshots (snapshot_id, catalog_json)
         VALUES ('active', CAST(? AS JSON))
         ON DUPLICATE KEY UPDATE catalog_json = VALUES(catalog_json)`,
        [JSON.stringify(bank)]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.end();
    }
  }

  private rebuildCatalog(problems: AtCoderProblem[], previousBank: AtCoderBankData): AtCoderBankData {
    const difficultyCounts: Record<string, number> = {};
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

  private groupCatalog(problems: AtCoderProblem[]) {
    const domainMap = new Map<string, AtCoderDomainBucket>();
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

  private normalizeEditableProblem(input: Partial<AtCoderProblem>, listOrder: number): AtCoderProblem {
    const pid = input.pid || input.id || "";
    const difficulty = input.difficulty || 3;
    const difficultyLabel = input.difficulty_label || (difficulty === 4 ? "普及+/提高" : difficulty === 5 ? "提高+/省选-" : "普及/提高-");
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

  private async mysqlConnection() {
    try {
      return await mysql.createConnection({
        host: process.env.MYSQL_HOST || "127.0.0.1",
        port: Number(process.env.MYSQL_PORT || 3310),
        database: process.env.MYSQL_DATABASE || "gesp_catalog",
        user: process.env.MYSQL_USER || "gesp",
        password: process.env.MYSQL_PASSWORD || "gesp_dev_password"
      });
    } catch {
      return null;
    }
  }
}
