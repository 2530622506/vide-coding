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
  content_origin:
    | "pending_ai_generation"
    | "ai_generated_sample_verified"
    | "ai_generated_compile_verified"
    | "local_ai_generated_reference"
    | "ai_generated_unverified_reference"
    | "subagent_ai_generated_reference";
  ai_generation_notice: string;
  reference_answer: string;
  algorithm: string;
  complexity: string;
  verification: null | {
    status: "sample_passed" | "compiled_no_samples" | "not_verified_by_request";
    verifier: string;
    verified_at?: string;
    checked_at?: string;
    sample_count?: number;
    sample_results?: Array<{
      index: number;
      expected: string;
      actual: string;
      passed: boolean;
    }>;
    sample_passed?: boolean | null;
    compile_passed?: boolean | null;
  };
  notes: string[];
};

export type AtCoderProblem = {
  id: string;
  pid: string;
  title: string;
  title_zh: string;
  title_zh_source?: string;
  difficulty: 2 | 3 | 4 | 5;
  difficulty_label: "普及-" | "普及/提高-" | "普及+/提高" | "提高+/省选-";
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
  | "total_submit"
  | "total_accepted"
  | "acceptance_rate"
  | "knowledge_points"
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

type AtCoderProblemTypeResponse = Omit<AtCoderProblemTypeIndex, "problems"> & {
  problems: AtCoderProblemSummary[];
};

type AtCoderDomainResponse = Omit<AtCoderDomainIndex, "problem_types"> & {
  problem_types: AtCoderProblemTypeResponse[];
};

type AtCoderCatalogResponse = {
  generated_at: string;
  source: AtCoderBankData["source"];
  summary: AtCoderBankData["summary"];
  domains: AtCoderDomainResponse[];
};

type AtCoderProblemTypeBucket = Omit<AtCoderProblemTypeIndex, "knowledge_points"> & {
  knowledge_points: Map<string, AtCoderLabel>;
};

type AtCoderDomainBucket = Omit<AtCoderDomainIndex, "problem_types"> & {
  problem_types: Map<string, AtCoderProblemTypeBucket>;
};

const FALLBACK_DOMAIN: AtCoderLabel = { id: "uncategorized", label: "待分类" };
const FALLBACK_PROBLEM_TYPE: AtCoderLabel = { id: "untagged", label: "待分类" };
const DIFFICULTY_FILTERS: AtCoderBankData["source"]["difficulty_filter"] = [
  { difficulty: 2, label: "普及-" },
  { difficulty: 3, label: "普及/提高-" },
  { difficulty: 4, label: "普及+/提高" },
  { difficulty: 5, label: "提高+/省选-" }
];

@Injectable()
export class AtCoderCatalogService {
  private readonly dataPath = "data/atcoder/luogu-atcoder-problem-bank.json";
  private readonly assetRoot = "data/atcoder/assets";
  private catalogCache: AtCoderCatalogResponse | null = null;

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
            .filter((problem): problem is AtCoderProblem => Boolean(problem))
            .map((problem) => this.problemSummary(problem))
        }))
      }))
    };
    return this.catalogCache;
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
      total_submit: problem.total_submit,
      total_accepted: problem.total_accepted,
      acceptance_rate: problem.acceptance_rate,
      knowledge_points: problem.knowledge_points
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
      const snapshot = rows[0]?.catalog_json || null;
      if (snapshot && this.isCatalogIndexConsistent(snapshot)) {
        return snapshot;
      }

      const jsonBank = this.loadJsonBank();
      const [problemRows] = await connection.execute<Array<RowDataPacket & { problem_json: AtCoderProblem }>>(
        "SELECT problem_json FROM atcoder_problem_bank ORDER BY difficulty, pid"
      );
      const problems = problemRows.map((row) => row.problem_json).filter((problem): problem is AtCoderProblem => Boolean(problem));
      if (problems.length) {
        return this.rebuildCatalog(this.mergeProblems(jsonBank.problems, problems), snapshot || jsonBank);
      }
      return jsonBank;
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
    const domains = this.groupCatalog(problems);
    return {
      ...previousBank,
      generated_at: new Date().toISOString(),
      source: {
        ...previousBank.source,
        difficulty_filter: DIFFICULTY_FILTERS
      },
      summary: {
        ...previousBank.summary,
        problem_count: problems.length,
        difficulty_counts: difficultyCounts,
        domain_count: domains.length,
        knowledge_point_count: new Set(problems.flatMap((problem) => problem.knowledge_points.map((point) => point.id))).size,
        local_ai_answer_count: problems.length,
        title_zh_count: problems.filter((problem) => problem.title_zh).length
      },
      domains,
      problems
    };
  }

  private groupCatalog(problems: AtCoderProblem[]) {
    const domainMap = new Map<string, AtCoderDomainBucket>();
    for (const problem of problems) {
      const domains = problem.algorithm_domains.length ? problem.algorithm_domains : [FALLBACK_DOMAIN];
      const problemTypes = problem.problem_type_tags.length ? problem.problem_type_tags : [FALLBACK_PROBLEM_TYPE];
      for (const domain of domains) {
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
        for (const type of problemTypes) {
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

  private isCatalogIndexConsistent(bank: AtCoderBankData) {
    if (!Array.isArray(bank.problems) || !Array.isArray(bank.domains)) {
      return false;
    }
    const expectedByDifficulty = new Map<string, Set<string>>();
    for (const problem of bank.problems) {
      if (!expectedByDifficulty.has(problem.difficulty_label)) {
        expectedByDifficulty.set(problem.difficulty_label, new Set());
      }
      expectedByDifficulty.get(problem.difficulty_label)?.add(problem.id);
    }
    if (bank.summary.problem_count !== bank.problems.length) {
      return false;
    }
    for (const [difficultyLabel, count] of Object.entries(bank.summary.difficulty_counts || {})) {
      if ((expectedByDifficulty.get(difficultyLabel)?.size || 0) !== count) {
        return false;
      }
    }
    for (const filter of DIFFICULTY_FILTERS) {
      if (!expectedByDifficulty.get(filter.label)?.size) {
        return false;
      }
    }

    const indexedByDifficulty = new Map<string, Set<string>>();
    const problemById = new Map(bank.problems.map((problem) => [problem.id, problem]));
    for (const domain of bank.domains) {
      for (const type of domain.problem_types || []) {
        for (const problemId of type.problems || []) {
          const problem = problemById.get(problemId);
          if (!problem) {
            continue;
          }
          if (!indexedByDifficulty.has(problem.difficulty_label)) {
            indexedByDifficulty.set(problem.difficulty_label, new Set());
          }
          indexedByDifficulty.get(problem.difficulty_label)?.add(problem.id);
        }
      }
    }

    for (const [difficultyLabel, expectedIds] of expectedByDifficulty) {
      const indexedIds = indexedByDifficulty.get(difficultyLabel);
      if (!indexedIds || indexedIds.size !== expectedIds.size) {
        return false;
      }
      for (const problemId of expectedIds) {
        if (!indexedIds.has(problemId)) {
          return false;
        }
      }
    }

    return true;
  }

  private mergeProblems(baseProblems: AtCoderProblem[], overlayProblems: AtCoderProblem[]) {
    const problemById = new Map<string, AtCoderProblem>();
    for (const problem of baseProblems) {
      problemById.set(problem.id, problem);
    }
    for (const problem of overlayProblems) {
      problemById.set(problem.id, problem);
    }
    return [...problemById.values()].sort((a, b) => a.list_order - b.list_order || a.pid.localeCompare(b.pid));
  }

  private normalizeEditableProblem(input: Partial<AtCoderProblem>, listOrder: number): AtCoderProblem {
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
