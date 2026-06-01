import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
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
  content_origin?: "official_extracted" | "ai_generated_learning_aid" | "user_input" | string;
  ai_generation_notice?: string;
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
  content_origin?: string;
  ai_generation_notice?: string;
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
  visual_asset_thumbnails: Array<{
    id: string;
    asset_url: string;
    alt_text: string;
    source_url: string | null;
    source_page: number | null;
  }>;
};

type ProblemMutationInput = {
  canonical_problem_id?: string;
  title?: string;
  session?: string;
  level?: number;
  question_type?: ClassificationRecord["question_type"];
  question_number?: number;
  algorithm_domains?: string[];
  problem_types?: string[];
  knowledge_points?: string[];
  statement?: string;
  answer?: string;
  explanation?: string;
  solution_code?: string;
  choice_options?: Array<{ key: string; text: string }>;
  sample_cases?: Array<{ input: string; output: string }>;
  visual_assets?: Array<{ asset_url: string; alt_text: string; source_url?: string | null }>;
  source_url?: string;
  source_title?: string;
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
      id: record.canonical_problem_id,
      ...record,
      data_source: store.data_source,
      answer_guidance: store.answerGuidanceByProblem.get(id) || null,
      detail: store.problemDetailsByProblem.get(id) || null,
      source_versions: store.sourceVersionsByProblem.get(id) || [],
      review_items: this.groupReviewItemsByProblem(store.reviewQueue).get(id) || []
    };
  }

  async createProblem(body: unknown) {
    const input = this.normalizeProblemInput(body, true);
    const id = input.canonical_problem_id || `user:${Date.now()}`;
    if (await this.loadEditableProblem(id)) {
      throw new ConflictException(`题目 ID ${id} 已存在，请换一个 ID 或使用修改功能`);
    }
    const record = this.buildEditableRecord(id, input, null);
    const guidance = this.buildEditableGuidance(id, input, record, null);
    const detail = this.buildEditableDetail(id, input, record, null);
    const sourceVersion = this.buildEditableSourceVersion(id, record, input);

    await this.upsertEditableProblem(record, guidance, detail, sourceVersion, true);
    const created = await this.getProblem(id);
    if (!created) {
      throw new BadRequestException("题目创建后未能读取，请检查数据库状态");
    }
    return created;
  }

  async updateProblem(id: string, body: unknown) {
    const input = this.normalizeProblemInput(body, false);
    const existing = await this.loadEditableProblem(id);
    if (!existing) {
      return null;
    }

    const record = this.buildEditableRecord(id, input, existing.record);
    const guidance = this.buildEditableGuidance(id, input, record, existing.guidance);
    const detail = this.buildEditableDetail(id, input, record, existing.detail);
    await this.upsertEditableProblem(record, guidance, detail, null, false);
    return this.getProblem(id);
  }

  async deleteProblem(id: string) {
    const connection = await this.createMysqlConnection();
    try {
      const [result] = await connection.execute("DELETE FROM classification_records WHERE canonical_problem_id = ?", [id]);
      return (result as { affectedRows?: number }).affectedRows === 1;
    } finally {
      await connection.end();
    }
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

  private async loadEditableProblem(id: string) {
    const connection = await this.createMysqlConnection();
    try {
      const [recordRows] = await connection.query("SELECT record_json FROM classification_records WHERE canonical_problem_id = ?", [id]);
      const record = (recordRows as Array<{ record_json: unknown }>)[0]?.record_json;
      if (!record) {
        return null;
      }
      const [guidanceRows] = await connection.query("SELECT guidance_json FROM problem_answer_guidance WHERE canonical_problem_id = ?", [id]);
      const [detailRows] = await connection.query("SELECT detail_json FROM problem_details WHERE canonical_problem_id = ?", [id]);
      return {
        record: this.parseJson<ClassificationRecord>(record),
        guidance: (guidanceRows as Array<{ guidance_json: unknown }>)[0]?.guidance_json
          ? this.parseJson<AnswerGuidance>((guidanceRows as Array<{ guidance_json: unknown }>)[0].guidance_json)
          : null,
        detail: (detailRows as Array<{ detail_json: unknown }>)[0]?.detail_json
          ? this.parseJson<ProblemDetail>((detailRows as Array<{ detail_json: unknown }>)[0].detail_json)
          : null
      };
    } finally {
      await connection.end();
    }
  }

  private async upsertEditableProblem(
    record: ClassificationRecord,
    guidance: AnswerGuidance,
    detail: ProblemDetail,
    sourceVersion: Record<string, unknown> | null,
    insertSourceVersion: boolean
  ) {
    const connection = await this.createMysqlConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO classification_records (
          canonical_problem_id,
          official_problem_id,
          session_code,
          language,
          level_no,
          question_type,
          question_number,
          title,
          effective_review_status,
          record_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
        ON DUPLICATE KEY UPDATE
          official_problem_id = VALUES(official_problem_id),
          session_code = VALUES(session_code),
          language = VALUES(language),
          level_no = VALUES(level_no),
          question_type = VALUES(question_type),
          question_number = VALUES(question_number),
          title = VALUES(title),
          effective_review_status = VALUES(effective_review_status),
          record_json = VALUES(record_json)`,
        [
          record.canonical_problem_id,
          record.official_problem_id,
          record.session,
          record.language,
          record.level,
          record.question_type,
          record.question_number,
          record.title,
          record.effective_review_status,
          JSON.stringify(record)
        ]
      );

      await connection.execute(
        `INSERT INTO problem_answer_guidance (
          canonical_problem_id,
          answer_status,
          answer_text,
          answer_source,
          confidence,
          guidance_json
        ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))
        ON DUPLICATE KEY UPDATE
          answer_status = VALUES(answer_status),
          answer_text = VALUES(answer_text),
          answer_source = VALUES(answer_source),
          confidence = VALUES(confidence),
          guidance_json = VALUES(guidance_json)`,
        [
          guidance.canonical_problem_id,
          guidance.reference_answer.status,
          guidance.reference_answer.answer,
          guidance.reference_answer.source,
          guidance.reference_answer.confidence,
          JSON.stringify(guidance)
        ]
      );

      await connection.execute(
        `INSERT INTO problem_details (
          canonical_problem_id,
          statement_status,
          option_status,
          option_count,
          visual_asset_status,
          visual_asset_count,
          programming_solution_status,
          detail_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
        ON DUPLICATE KEY UPDATE
          statement_status = VALUES(statement_status),
          option_status = VALUES(option_status),
          option_count = VALUES(option_count),
          visual_asset_status = VALUES(visual_asset_status),
          visual_asset_count = VALUES(visual_asset_count),
          programming_solution_status = VALUES(programming_solution_status),
          detail_json = VALUES(detail_json)`,
        [
          detail.canonical_problem_id,
          detail.statement.status,
          detail.choice_options.status,
          detail.choice_options.options.length,
          detail.visual_assets.status,
          detail.visual_assets.assets.length,
          detail.programming_solution.status,
          JSON.stringify(detail)
        ]
      );

      if (insertSourceVersion && sourceVersion) {
        await connection.execute(
          `INSERT INTO source_versions (
            canonical_problem_id,
            source_kind,
            source_id,
            source_url,
            source_json
          ) VALUES (?, ?, ?, ?, CAST(? AS JSON))`,
          [
            record.canonical_problem_id,
            "user_input",
            String(sourceVersion.source_id || record.canonical_problem_id),
            null,
            JSON.stringify(sourceVersion)
          ]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.end();
    }
  }

  private normalizeProblemInput(body: unknown, requireTitle: boolean): ProblemMutationInput {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("请求体必须是对象");
    }
    const value = body as Record<string, unknown>;
    const title = this.optionalString(value.title);
    if (requireTitle && !title) {
      throw new BadRequestException("题目标题不能为空");
    }
    const level = value.level === undefined || value.level === "" ? undefined : Number(value.level);
    if (level !== undefined && (!Number.isInteger(level) || level < 1 || level > 8)) {
      throw new BadRequestException("等级必须是 1 到 8 的整数");
    }
    const questionNumber = value.question_number === undefined || value.question_number === "" ? undefined : Number(value.question_number);
    if (questionNumber !== undefined && (!Number.isInteger(questionNumber) || questionNumber < 1)) {
      throw new BadRequestException("题号必须是正整数");
    }
    const questionType = this.optionalString(value.question_type) as ClassificationRecord["question_type"] | undefined;
    if (questionType && !["selection", "judgment", "programming"].includes(questionType)) {
      throw new BadRequestException("题型必须是 selection、judgment 或 programming");
    }
    const id = this.optionalString(value.canonical_problem_id);
    if (id && !/^[a-zA-Z0-9:_-]+$/.test(id)) {
      throw new BadRequestException("题目 ID 只能包含字母、数字、冒号、下划线和短横线");
    }
    return {
      canonical_problem_id: id,
      title,
      session: this.optionalString(value.session),
      level,
      question_type: questionType,
      question_number: questionNumber,
      algorithm_domains: this.optionalStringArray(value.algorithm_domains),
      problem_types: this.optionalStringArray(value.problem_types),
      knowledge_points: this.optionalStringArray(value.knowledge_points),
      statement: this.optionalString(value.statement),
      answer: this.optionalString(value.answer),
      explanation: this.optionalString(value.explanation),
      solution_code: this.optionalString(value.solution_code),
      choice_options: this.optionalChoiceOptions(value.choice_options),
      sample_cases: this.optionalSampleCases(value.sample_cases),
      visual_assets: this.optionalVisualAssets(value.visual_assets),
      source_url: this.optionalString(value.source_url),
      source_title: this.optionalString(value.source_title)
    };
  }

  private optionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private optionalStringArray(value: unknown) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
    }
    return undefined;
  }

  private optionalChoiceOptions(value: unknown) {
    if (value === undefined) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException("选择题选项必须是数组");
    }
    return value.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new BadRequestException("选择题选项必须包含 key 和 text");
      }
      const option = item as Record<string, unknown>;
      const key = this.optionalString(option.key) || String.fromCharCode(65 + index);
      const text = this.optionalString(option.text);
      if (!text) {
        throw new BadRequestException("选择题选项内容不能为空");
      }
      return { key, text };
    });
  }

  private optionalSampleCases(value: unknown) {
    if (value === undefined) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException("样例必须是数组");
    }
    return value.map((item) => {
      if (!item || typeof item !== "object") {
        throw new BadRequestException("样例必须包含 input 和 output");
      }
      const sample = item as Record<string, unknown>;
      return {
        input: this.optionalString(sample.input) || "",
        output: this.optionalString(sample.output) || ""
      };
    }).filter((sample) => sample.input || sample.output);
  }

  private optionalVisualAssets(value: unknown) {
    if (value === undefined) {
      return undefined;
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException("图片资源必须是数组");
    }
    return value.map((item) => {
      if (!item || typeof item !== "object") {
        throw new BadRequestException("图片资源必须包含 asset_url");
      }
      const asset = item as Record<string, unknown>;
      const assetUrl = this.optionalString(asset.asset_url);
      if (!assetUrl) {
        throw new BadRequestException("图片 URL 不能为空");
      }
      return {
        asset_url: assetUrl,
        alt_text: this.optionalString(asset.alt_text) || "用户维护的题目图片",
        source_url: this.optionalString(asset.source_url) || null
      };
    });
  }

  private buildEditableRecord(id: string, input: ProblemMutationInput, existing: ClassificationRecord | null): ClassificationRecord {
    const title = input.title || existing?.title || "未命名题目";
    const level = input.level ?? existing?.level ?? 1;
    const questionType = input.question_type || existing?.question_type || "programming";
    const questionNumber = input.question_number ?? existing?.question_number ?? Math.floor(Date.now() % 1000000);
    const algorithmDomains = input.algorithm_domains !== undefined
      ? this.buildUserTags("algorithm_domain", input.algorithm_domains)
      : existing?.resolved_algorithm_domains || [];
    const problemTypes = input.problem_types !== undefined
      ? this.buildUserTags("problem_type", input.problem_types)
      : existing?.resolved_problem_type_tags || [];
    const knowledgePoints = input.knowledge_points !== undefined
      ? this.buildUserTags("knowledge_point", input.knowledge_points)
      : existing?.resolved_knowledge_point_tags || [];

    return {
      ...(existing || {}),
      canonical_problem_id: id,
      official_problem_id: existing?.official_problem_id || id,
      session: input.session || existing?.session || "user",
      language: "C++",
      level,
      question_type: questionType,
      question_number: questionNumber,
      title,
      source_signals: {
        ...(existing?.source_signals || {}),
        user_editable: true,
        user_updated_at: new Date().toISOString()
      },
      source_conflict_refs: existing?.source_conflict_refs || [],
      review_queue_refs: existing?.review_queue_refs || [],
      resolved_algorithm_domains: algorithmDomains,
      resolved_problem_type_tags: problemTypes,
      resolved_knowledge_point_tags: knowledgePoints,
      effective_review_status: "needs_review"
    };
  }

  private buildEditableGuidance(
    id: string,
    input: ProblemMutationInput,
    record: ClassificationRecord,
    existing: AnswerGuidance | null
  ): AnswerGuidance {
    const answer = input.answer ?? existing?.reference_answer.answer ?? null;
    const explanation = input.explanation || existing?.understanding_example.summary || `用户维护的「${record.title}」题目讲解，仍需结合题面和评测结果复核。`;
    const algorithmLabels = record.resolved_algorithm_domains.map((tag) => tag.label);
    const typeLabels = record.resolved_problem_type_tags.map((tag) => tag.label);
    const knowledgeLabels = record.resolved_knowledge_point_tags.map((tag) => tag.label);

    return {
      ...(existing || {}),
      canonical_problem_id: id,
      content_origin: "user_input",
      ai_generation_notice: existing?.ai_generation_notice,
      reference_answer: {
        status: "needs_review",
        answer,
        answer_format: record.question_type === "judgment" ? "true_false" : record.question_type === "selection" ? "choice" : "free_text",
        source: "user_input",
        source_url: "",
        evidence: answer ? "用户在页面中维护的参考答案，仍需复核。" : "用户尚未填写参考答案。",
        confidence: answer ? 0.6 : 0,
        review_status: "needs_review"
      },
      understanding_example: {
        language: "zh-CN",
        summary: explanation,
        algorithm_domains: algorithmLabels,
        problem_types: typeLabels,
        knowledge_points: knowledgeLabels,
        steps: [
          "先核对题面、输入输出和限制条件。",
          "再检查算法范畴、题型和知识点标签是否与解法一致。",
          "最后用样例或公开 OJ 评测结果复核答案。"
        ],
        chinese_comments: [
          "中文注释：该题由用户在页面中维护，默认保留待复核状态。",
          "中文注释：确认来源和评测结果后，再提升可信状态。"
        ],
        example_hint: "用户维护内容不会自动视为官方答案。"
      },
      reference_links: existing?.reference_links || [],
      review_notes: [
        "用户通过页面维护，默认进入 needs_review。",
        ...(existing?.review_notes || []).filter((note) => !note.includes("用户通过页面维护"))
      ]
    };
  }

  private buildEditableDetail(
    id: string,
    input: ProblemMutationInput,
    record: ClassificationRecord,
    existing: ProblemDetail | null
  ): ProblemDetail {
    const statement = input.statement
      ?? existing?.statement.sections?.[0]?.markdown
      ?? existing?.statement.stem
      ?? "";
    const solutionCode = input.solution_code ?? existing?.programming_solution.code ?? null;
    const hasStatement = Boolean(statement);
    const hasSolution = Boolean(solutionCode);
    const choiceOptions = input.choice_options !== undefined
      ? {
        status: input.choice_options.length > 0 ? "source_extracted" as const : record.question_type === "programming" ? "not_applicable" as const : "pending_collection" as const,
        options: input.choice_options.map((option) => ({
          key: option.key,
          text: option.text,
          source_status: "user_input_needs_review"
        })),
        extraction_method: "user_input",
        notes: input.choice_options.length > 0
          ? ["用户在页面中维护的选项，需复核来源和准确性。"]
          : ["暂未结构化维护选择项。"]
      }
      : existing?.choice_options || {
        status: record.question_type === "programming" ? "not_applicable" as const : "pending_collection" as const,
        options: [],
        notes: ["暂未结构化维护选择项。"]
      };
    const visualAssets = input.visual_assets !== undefined
      ? {
        status: input.visual_assets.length > 0 ? "ready" as const : "none_found" as const,
        assets: input.visual_assets.map((asset, index) => ({
          id: `user_asset_${index + 1}`,
          asset_url: asset.asset_url,
          alt_text: asset.alt_text,
          source_url: asset.source_url || input.source_url || null,
          source_page: null
        })),
        source_hint: {
          source_url: input.source_url || input.visual_assets[0]?.source_url || null,
          source_page: null
        },
        notes: input.visual_assets.length > 0
          ? ["用户在页面中维护的图片，需复核版权、来源和是否与题面一致。"]
          : ["当前题目未维护图片。"]
      }
      : existing?.visual_assets || {
        status: "none_found" as const,
        assets: [],
        source_hint: { source_url: null, source_page: null },
        notes: ["用户维护题暂未添加图片；如使用 AI 生成示意图，必须显式标注。"]
      };
    const sampleCases = input.sample_cases !== undefined
      ? {
        status: input.sample_cases.length > 0 ? "source_extracted" as const : record.question_type === "programming" ? "pending_collection" as const : "not_applicable" as const,
        cases: input.sample_cases,
        notes: input.sample_cases.length > 0
          ? ["用户在页面中维护的样例，需用 C++ 参考解或 OJ 结果复核。"]
          : ["暂未维护样例。"]
      }
      : existing?.sample_cases || {
        status: record.question_type === "programming" ? "pending_collection" as const : "not_applicable" as const,
        cases: [],
        notes: ["暂未维护样例。"]
      };
    const sourceLinks = input.source_url
      ? [{
        role: "user_source",
        source_kind: "user_input",
        title: input.source_title || "用户维护来源",
        url: input.source_url,
        source_url: input.source_url,
        trust_level: "needs_review"
      }]
      : existing?.source_links || [];

    return {
      ...(existing || {}),
      canonical_problem_id: id,
      content_origin: "user_input",
      ai_generation_notice: existing?.ai_generation_notice,
      statement: {
        status: hasStatement ? "source_extracted" : "pending_collection",
        stem: hasStatement ? statement.slice(0, 240) : record.title,
        evidence_snippet: hasStatement ? statement.slice(0, 240) : null,
        source_url: existing?.statement.source_url || null,
        source_page: existing?.statement.source_page || null,
        source_terms_status: "user_input_needs_review",
        sections: hasStatement ? [{ id: "user_statement", title: "用户题面", markdown: statement }] : [],
        notes: ["用户在页面中维护的题面，需复核来源和准确性。"]
      },
      choice_options: choiceOptions,
      visual_assets: visualAssets,
      programming_solution: {
        status: hasSolution ? "needs_review" : record.question_type === "programming" ? "needs_review" : "not_applicable",
        language: "C++",
        code: solutionCode,
        content_origin: hasSolution ? "user_input" : existing?.programming_solution.content_origin,
        ai_generation_notice: existing?.programming_solution.ai_generation_notice,
        algorithm: existing?.programming_solution.algorithm || "",
        complexity: existing?.programming_solution.complexity || "",
        verification: existing?.programming_solution.verification,
        reference_answer: hasSolution ? "用户维护的 C++ 参考解，仍需样例或 OJ 复核。" : existing?.programming_solution.reference_answer,
        notes: hasSolution
          ? ["用户维护的 C++ 参考解，默认待复核。"]
          : ["暂未维护 C++ 参考解。"]
      },
      sample_cases: sampleCases,
      source_links: sourceLinks,
      completeness: {
        has_statement_stem: hasStatement,
        has_choice_options: choiceOptions.options.length > 0,
        has_visual_assets: visualAssets.assets.length > 0,
        has_reference_answer: Boolean(input.answer ?? existing?.completeness.has_reference_answer),
        needs_option_collection: record.question_type === "selection" && choiceOptions.options.length === 0,
        needs_visual_asset_collection: false,
        needs_programming_solution: record.question_type === "programming" && !hasSolution,
        needs_source_enrichment: !hasStatement,
        needs_solution_review: hasSolution
      }
    };
  }

  private buildEditableSourceVersion(id: string, record: ClassificationRecord, input: ProblemMutationInput) {
    return {
      id: `source-version:${id}:user-input`,
      canonical_problem_id: id,
      role: "user_maintained_entry",
      source_kind: "user_input",
      source_id: id,
      source_url: input.source_url || null,
      title: input.source_title || record.title,
      trust_level: "needs_review",
      review_status: "needs_review"
    };
  }

  private buildUserTags(kind: string, labels: string[]): ResolvedTag[] {
    return labels.map((label, index) => {
      const value = kind === "algorithm_domain"
        ? this.knownDomainId(label, index)
        : this.slugify(label) || `custom_${kind}_${index + 1}`;
      return {
        kind,
        value,
        label,
        source: "user_input",
        evidence: {
          source: "user_input",
          evidence: "用户在页面中维护的分类标签，需复核。"
        },
        confidence: 0.6,
        syllabus_fit: "community_inferred",
        review_status: "needs_review",
        raw_confidence: 0.6,
        final_confidence: 0.54,
        effective_review_status: "needs_review"
      } as ResolvedTag;
    });
  }

  private knownDomainId(label: string, index: number) {
    const normalized = label.trim().toLowerCase();
    const map = new Map<string, string>([
      ["基础程序设计", "basic_programming"],
      ["basic_programming", "basic_programming"],
      ["字符串", "string"],
      ["string", "string"],
      ["数论", "number_theory"],
      ["number_theory", "number_theory"],
      ["位运算", "bit_operation"],
      ["bit_operation", "bit_operation"],
      ["排序/模拟", "sort_simulation"],
      ["模拟", "sort_simulation"],
      ["sort_simulation", "sort_simulation"],
      ["贪心", "greedy"],
      ["greedy", "greedy"],
      ["二分", "binary_search"],
      ["binary_search", "binary_search"],
      ["链表", "linked_list"],
      ["linked_list", "linked_list"],
      ["递归", "recursion"],
      ["recursion", "recursion"],
      ["分治", "divide_conquer"],
      ["divide_conquer", "divide_conquer"],
      ["图论", "graph"],
      ["graph", "graph"],
      ["动态规划", "dynamic_programming"],
      ["dynamic_programming", "dynamic_programming"],
      ["高精度", "high_precision"],
      ["high_precision", "high_precision"],
      ["复杂度", "complexity"],
      ["complexity", "complexity"]
    ]);
    return map.get(normalized) || this.slugify(label) || `custom_domain_${index + 1}`;
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
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
    const connection = await this.createMysqlConnection();
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

  private createMysqlConnection() {
    return mysql.createConnection({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT || 3310),
      database: process.env.MYSQL_DATABASE || "gesp_catalog",
      user: process.env.MYSQL_USER || "gesp",
      password: process.env.MYSQL_PASSWORD || "gesp_dev_password",
      charset: "utf8mb4"
    });
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
      detail_completeness: detail?.completeness || null,
      visual_asset_thumbnails: detail?.visual_assets.assets.slice(0, 2).map((asset) => ({
        id: asset.id,
        asset_url: asset.asset_url,
        alt_text: asset.alt_text,
        source_url: asset.source_url,
        source_page: asset.source_page
      })) || []
    };
  }
}
