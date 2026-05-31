import { Injectable } from "@nestjs/common";
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type EffectiveStatus = "confirmed" | "candidate" | "needs_review" | "conflict";

type ResolvedTag = {
  kind: string;
  value: string;
  label: string;
  final_confidence: number;
  effective_review_status: EffectiveStatus;
};

type ClassificationRecord = {
  canonical_problem_id: string;
  official_problem_id: string;
  session: string;
  language: "C++";
  level: number;
  question_type: "selection" | "judgment" | "programming";
  question_number: number;
  title: string;
  source_signals: Record<string, unknown>;
  source_conflict_refs: string[];
  review_queue_refs: string[];
  resolved_algorithm_domains: ResolvedTag[];
  resolved_problem_type_tags: ResolvedTag[];
  resolved_knowledge_point_tags: ResolvedTag[];
  effective_review_status: EffectiveStatus;
};

type ConflictConfidenceModel = {
  generated_at: string;
  summary: Record<string, unknown>;
  records: ClassificationRecord[];
};

type CanonicalAlignment = {
  canonical_problems: Array<{
    id: string;
    official_problem_id: string;
    source_versions: Array<Record<string, unknown>>;
  }>;
};

type ReviewQueue = {
  summary: Record<string, unknown>;
  items: Array<{
    id: string;
    type: string;
    priority: "high" | "medium" | "low";
    status: "open";
    canonical_problem_id: string | null;
    title: string;
    reason: string;
    final_confidence: number | null;
  }>;
};

type AnswerGuidance = {
  canonical_problem_id: string;
  reference_answer: {
    status: "confirmed" | "reference_link" | "needs_review";
    answer: string | null;
    answer_format: string;
    source: string;
    source_url: string;
    evidence: string;
    confidence: number;
    review_status: string;
  };
  understanding_example: {
    language: "zh-CN";
    summary: string;
    algorithm_domains: string[];
    problem_types: string[];
    knowledge_points: string[];
    steps: string[];
    chinese_comments: string[];
    example_hint: string;
  };
  reference_links: Array<Record<string, unknown>>;
  review_notes: string[];
};

type AnswerGuidanceData = {
  records: AnswerGuidance[];
};

type SupplementalCxxData = {
  records: ClassificationRecord[];
  answer_guidance: AnswerGuidance[];
  problem_details: ProblemDetail[];
  source_versions: Array<Record<string, unknown> & { canonical_problem_id: string }>;
};

type ProblemDetail = {
  canonical_problem_id: string;
  statement: {
    status: "partial" | "pending_collection" | "source_extracted";
    stem: string;
    evidence_snippet: string | null;
    source_url: string | null;
    source_page: number | null;
    source_terms_status?: "needs_review" | string;
    sections?: Array<{ id: string; title: string; markdown: string }>;
    notes: string[];
  };
  choice_options: {
    status: "pending_collection" | "source_extracted" | "needs_review" | "standard_binary" | "not_applicable";
    options: Array<{ key: string; text: string; source_status: string }>;
    extraction_method?: string;
    notes: string[];
  };
  visual_assets: {
    status: "pending_collection" | "ready" | "not_applicable" | "source_extracted" | "none_found";
    assets: Array<{
      id: string;
      asset_url: string;
      alt_text: string;
      source_url: string | null;
      source_page: number | null;
    }>;
    source_hint: {
      source_url: string | null;
      source_page: number | null;
    };
    notes: string[];
  };
  programming_solution: {
    status: "confirmed" | "reference_link" | "needs_review" | "not_applicable";
    language: "C++";
    code: string | null;
    content_origin?: "ai_generated_sample_verified" | string;
    ai_generation_notice?: string;
    algorithm?: string;
    complexity?: string;
    verification?: {
      status: "sample_passed" | string;
      sample_count: number;
      verified_at: string;
    };
    reference_answer?: string | null;
    notes: string[];
  };
  sample_cases: {
    status: "pending_collection" | "not_applicable" | "source_extracted" | "none_found";
    cases: Array<{ input: string; output: string }>;
    notes: string[];
  };
  source_links: Array<Record<string, unknown>>;
  completeness: {
    has_statement_stem: boolean;
    has_choice_options: boolean;
    has_visual_assets: boolean;
    has_reference_answer: boolean;
    needs_option_collection: boolean;
    needs_visual_asset_collection: boolean;
    needs_programming_solution: boolean;
    needs_source_enrichment: boolean;
    needs_solution_review?: boolean;
  };
};

type ProblemDetailData = {
  records: ProblemDetail[];
};

type DataStore = {
  generated_at: string;
  records: ClassificationRecord[];
  reviewQueue: ReviewQueue;
  answerGuidanceByProblem: Map<string, AnswerGuidance>;
  problemDetailsByProblem: Map<string, ProblemDetail>;
  sourceVersionsByProblem: Map<string, Array<Record<string, unknown>>>;
  data_source: "mysql" | "json";
};

type ProblemSummary = {
  id: string;
  official_problem_id: string;
  session: string;
  title: string;
  question_type: string;
  question_number: number;
  status: EffectiveStatus;
  review_queue_count: number;
  source_conflict_count: number;
  problem_type_tags: ResolvedTag[];
  knowledge_point_tags: ResolvedTag[];
  answer_guidance: AnswerGuidance | null;
  detail_completeness: ProblemDetail["completeness"] | null;
};

@Injectable()
export class CatalogService {
  private readonly fallbackModel = this.readJson<ConflictConfidenceModel>("data/classification/conflict-confidence-model.json");
  private readonly fallbackCanonical = this.readJson<CanonicalAlignment>("data/canonical-problems/canonical-problem-alignment.json");
  private readonly fallbackReviewQueue = this.readJson<ReviewQueue>("data/classification/review-queue.json");
  private readonly fallbackAnswerGuidance = this.readJson<AnswerGuidanceData>("data/classification/problem-answer-guidance.json");
  private readonly fallbackProblemDetails = this.readJson<ProblemDetailData>("data/classification/problem-details.json");
  private readonly fallbackSupplemental = this.readJson<SupplementalCxxData>("data/classification/supplemental-cxx-problems.json");

  async getLevels() {
    const store = await this.loadStore();
    const levels = new Map<number, {
      level: number;
      problem_count: number;
      domain_count: number;
      status_counts: Record<EffectiveStatus, number>;
      domains: Set<string>;
    }>();

    for (const record of store.records) {
      if (!levels.has(record.level)) {
        levels.set(record.level, {
          level: record.level,
          problem_count: 0,
          domain_count: 0,
          status_counts: { confirmed: 0, candidate: 0, needs_review: 0, conflict: 0 },
          domains: new Set<string>()
        });
      }
      const bucket = levels.get(record.level);
      if (!bucket) {
        continue;
      }
      bucket.problem_count += 1;
      bucket.status_counts[record.effective_review_status] += 1;
      for (const domain of record.resolved_algorithm_domains) {
        bucket.domains.add(domain.value);
      }
      bucket.domain_count = bucket.domains.size;
    }

    return {
      generated_at: store.generated_at,
      data_source: store.data_source,
      levels: [...levels.values()]
        .map(({ domains, ...level }) => ({ ...level, domain_ids: [...domains].sort() }))
        .sort((a, b) => a.level - b.level)
    };
  }

  async getLevelCatalog(level: number) {
    const store = await this.loadStore();
    const records = store.records.filter((record) => record.level === level);
    if (records.length === 0) {
      return null;
    }

    const domainMap = new Map<string, {
      domain_id: string;
      domain_label: string;
      problem_count: number;
      status_counts: Record<EffectiveStatus, number>;
      problem_types: Map<string, {
        problem_type_id: string;
        problem_type_label: string;
        problem_count: number;
        knowledge_points: Map<string, { id: string; label: string }>;
        problems: ProblemSummary[];
      }>;
    }>();

    for (const record of records) {
      const domains = record.resolved_algorithm_domains.length > 0
        ? record.resolved_algorithm_domains
        : [{ value: "unclassified", label: "未分类", final_confidence: 0, effective_review_status: "needs_review" as const, kind: "algorithm_domain" }];
      const problemTypes = record.resolved_problem_type_tags.length > 0
        ? record.resolved_problem_type_tags
        : [{ value: "untyped", label: "待抽取题型", final_confidence: 0, effective_review_status: "needs_review" as const, kind: "problem_type" }];

      for (const domain of domains) {
        if (!domainMap.has(domain.value)) {
          domainMap.set(domain.value, {
            domain_id: domain.value,
            domain_label: domain.label,
            problem_count: 0,
            status_counts: { confirmed: 0, candidate: 0, needs_review: 0, conflict: 0 },
            problem_types: new Map()
          });
        }
        const domainBucket = domainMap.get(domain.value);
        if (!domainBucket) {
          continue;
        }
        domainBucket.problem_count += 1;
        domainBucket.status_counts[record.effective_review_status] += 1;

        for (const problemType of problemTypes) {
          if (!domainBucket.problem_types.has(problemType.value)) {
            domainBucket.problem_types.set(problemType.value, {
              problem_type_id: problemType.value,
              problem_type_label: problemType.label,
              problem_count: 0,
              knowledge_points: new Map(),
              problems: []
            });
          }
          const typeBucket = domainBucket.problem_types.get(problemType.value);
          if (!typeBucket) {
            continue;
          }
          typeBucket.problem_count += 1;
          for (const knowledgePoint of record.resolved_knowledge_point_tags) {
            typeBucket.knowledge_points.set(knowledgePoint.value, {
              id: knowledgePoint.value,
              label: knowledgePoint.label
            });
          }
          typeBucket.problems.push(this.problemSummary(record, store.answerGuidanceByProblem, store.problemDetailsByProblem));
        }
      }
    }

    return {
      generated_at: store.generated_at,
      data_source: store.data_source,
      level,
      language: "C++",
      summary: this.levelSummary(records),
      domains: [...domainMap.values()].map((domain) => ({
        domain_id: domain.domain_id,
        domain_label: domain.domain_label,
        problem_count: domain.problem_count,
        status_counts: domain.status_counts,
        problem_types: [...domain.problem_types.values()].map((type) => ({
          problem_type_id: type.problem_type_id,
          problem_type_label: type.problem_type_label,
          problem_count: type.problem_count,
          knowledge_points: [...type.knowledge_points.values()].sort((a, b) => a.id.localeCompare(b.id)),
          problems: type.problems.sort((a, b) => a.question_type.localeCompare(b.question_type) || a.question_number - b.question_number)
        })).sort((a, b) => b.problem_count - a.problem_count || a.problem_type_id.localeCompare(b.problem_type_id))
      })).sort((a, b) => b.problem_count - a.problem_count || a.domain_id.localeCompare(b.domain_id))
    };
  }

  async getProblem(id: string) {
    const store = await this.loadStore();
    const record = store.records.find((item) => item.canonical_problem_id === id);
    if (!record) {
      return null;
    }
    return {
      ...record,
      data_source: store.data_source,
      answer_guidance: store.answerGuidanceByProblem.get(id) || null,
      detail: store.problemDetailsByProblem.get(id) || null,
      source_versions: store.sourceVersionsByProblem.get(id) || [],
      review_items: this.groupReviewItemsByProblem(store.reviewQueue).get(id) || []
    };
  }

  async getReviewQueueSummary() {
    const store = await this.loadStore();
    return {
      data_source: store.data_source,
      summary: store.reviewQueue.summary,
      high_priority: store.reviewQueue.items.filter((item) => item.priority === "high"),
      medium_priority_count: store.reviewQueue.items.filter((item) => item.priority === "medium").length,
      low_priority_count: store.reviewQueue.items.filter((item) => item.priority === "low").length
    };
  }

  private async loadStore(): Promise<DataStore> {
    try {
      return await this.loadMysqlStore();
    } catch (error) {
      if (process.env.CATALOG_MYSQL_REQUIRED === "true") {
        throw error;
      }
      return this.loadJsonStore();
    }
  }

  private async loadMysqlStore(): Promise<DataStore> {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT || 3310),
      database: process.env.MYSQL_DATABASE || "gesp_catalog",
      user: process.env.MYSQL_USER || "gesp",
      password: process.env.MYSQL_PASSWORD || "gesp_dev_password",
      charset: "utf8mb4"
    });
    try {
      const [recordRows] = await connection.query("SELECT record_json FROM classification_records ORDER BY level_no, question_type, question_number");
      const [reviewRows] = await connection.query("SELECT item_json FROM review_queue_items ORDER BY FIELD(priority, 'high', 'medium', 'low'), item_type, canonical_problem_id");
      const [guidanceRows] = await connection.query("SELECT canonical_problem_id, guidance_json FROM problem_answer_guidance ORDER BY canonical_problem_id");
      const [detailRows] = await connection.query("SELECT canonical_problem_id, detail_json FROM problem_details ORDER BY canonical_problem_id");
      const [sourceRows] = await connection.query("SELECT canonical_problem_id, source_json FROM source_versions ORDER BY canonical_problem_id, id");
      const [metaRows] = await connection.query("SELECT meta_key, meta_value FROM catalog_metadata");
      const meta = new Map((metaRows as Array<{ meta_key: string; meta_value: unknown }>).map((row) => [row.meta_key, this.parseJson(row.meta_value)]));
      const records = (recordRows as Array<{ record_json: unknown }>).map((row) => this.parseJson<ClassificationRecord>(row.record_json));
      const items = (reviewRows as Array<{ item_json: unknown }>).map((row) => this.parseJson<ReviewQueue["items"][number]>(row.item_json));
      const answerGuidanceByProblem = new Map<string, AnswerGuidance>();
      for (const row of guidanceRows as Array<{ canonical_problem_id: string; guidance_json: unknown }>) {
        answerGuidanceByProblem.set(row.canonical_problem_id, this.parseJson<AnswerGuidance>(row.guidance_json));
      }
      const problemDetailsByProblem = new Map<string, ProblemDetail>();
      for (const row of detailRows as Array<{ canonical_problem_id: string; detail_json: unknown }>) {
        problemDetailsByProblem.set(row.canonical_problem_id, this.parseJson<ProblemDetail>(row.detail_json));
      }
      const sourceVersionsByProblem = new Map<string, Array<Record<string, unknown>>>();
      for (const row of sourceRows as Array<{ canonical_problem_id: string; source_json: unknown }>) {
        if (!sourceVersionsByProblem.has(row.canonical_problem_id)) {
          sourceVersionsByProblem.set(row.canonical_problem_id, []);
        }
        sourceVersionsByProblem.get(row.canonical_problem_id)?.push(this.parseJson<Record<string, unknown>>(row.source_json));
      }

      return {
        generated_at: (meta.get("conflict_confidence_generated_at") as { generated_at?: string } | undefined)?.generated_at || new Date().toISOString(),
        records,
        reviewQueue: {
          schema_version: 1,
          generated_at: new Date().toISOString(),
          generator: "mysql",
          source_model: "data/classification/conflict-confidence-model.json",
          summary: meta.get("review_queue_summary") as Record<string, unknown>,
          items
        } as ReviewQueue,
        answerGuidanceByProblem,
        problemDetailsByProblem,
        sourceVersionsByProblem,
        data_source: "mysql"
      };
    } finally {
      await connection.end();
    }
  }

  private loadJsonStore(): DataStore {
    const sourceVersionsByProblem = new Map<string, Array<Record<string, unknown>>>();
    for (const problem of this.fallbackCanonical.canonical_problems) {
      sourceVersionsByProblem.set(problem.id, problem.source_versions);
    }
    for (const source of this.fallbackSupplemental.source_versions) {
      if (!sourceVersionsByProblem.has(source.canonical_problem_id)) {
        sourceVersionsByProblem.set(source.canonical_problem_id, []);
      }
      sourceVersionsByProblem.get(source.canonical_problem_id)?.push(source);
    }
    const answerGuidanceByProblem = new Map([
      ...this.fallbackAnswerGuidance.records.map((record) => [record.canonical_problem_id, record] as const),
      ...this.fallbackSupplemental.answer_guidance.map((record) => [record.canonical_problem_id, record] as const)
    ]);
    const problemDetailsByProblem = new Map([
      ...this.fallbackProblemDetails.records.map((record) => [record.canonical_problem_id, record] as const),
      ...this.fallbackSupplemental.problem_details.map((record) => [record.canonical_problem_id, record] as const)
    ]);
    return {
      generated_at: this.fallbackModel.generated_at,
      records: [...this.fallbackModel.records, ...this.fallbackSupplemental.records],
      reviewQueue: this.fallbackReviewQueue,
      answerGuidanceByProblem,
      problemDetailsByProblem,
      sourceVersionsByProblem,
      data_source: "json"
    };
  }

  private parseJson<T>(value: unknown): T {
    return (typeof value === "string" ? JSON.parse(value) : value) as T;
  }

  private readJson<T>(relativePath: string): T {
    return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), "utf8")) as T;
  }

  private groupReviewItemsByProblem(reviewQueue: ReviewQueue) {
    const grouped = new Map<string, ReviewQueue["items"]>();
    for (const item of reviewQueue.items) {
      if (!item.canonical_problem_id) {
        continue;
      }
      if (!grouped.has(item.canonical_problem_id)) {
        grouped.set(item.canonical_problem_id, []);
      }
      grouped.get(item.canonical_problem_id)?.push(item);
    }
    return grouped;
  }

  private levelSummary(records: ClassificationRecord[]) {
    const statusCounts: Record<EffectiveStatus, number> = { confirmed: 0, candidate: 0, needs_review: 0, conflict: 0 };
    const problemTypeIds = new Set<string>();
    const knowledgePointIds = new Set<string>();
    for (const record of records) {
      statusCounts[record.effective_review_status] += 1;
      for (const tag of record.resolved_problem_type_tags) {
        problemTypeIds.add(tag.value);
      }
      for (const tag of record.resolved_knowledge_point_tags) {
        knowledgePointIds.add(tag.value);
      }
    }
    return {
      problem_count: records.length,
      status_counts: statusCounts,
      problem_type_count: problemTypeIds.size,
      knowledge_point_count: knowledgePointIds.size
    };
  }

  private problemSummary(
    record: ClassificationRecord,
    answerGuidanceByProblem: Map<string, AnswerGuidance>,
    problemDetailsByProblem: Map<string, ProblemDetail>
  ): ProblemSummary {
    const detail = problemDetailsByProblem.get(record.canonical_problem_id);
    return {
      id: record.canonical_problem_id,
      official_problem_id: record.official_problem_id,
      session: record.session,
      title: record.title,
      question_type: record.question_type,
      question_number: record.question_number,
      status: record.effective_review_status,
      review_queue_count: record.review_queue_refs.length,
      source_conflict_count: record.source_conflict_refs.length,
      problem_type_tags: record.resolved_problem_type_tags,
      knowledge_point_tags: record.resolved_knowledge_point_tags,
      answer_guidance: answerGuidanceByProblem.get(record.canonical_problem_id) || null,
      detail_completeness: detail?.completeness || null
    };
  }
}
