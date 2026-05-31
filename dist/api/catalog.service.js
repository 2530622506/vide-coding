var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from "@nestjs/common";
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
let CatalogService = class CatalogService {
    fallbackModel = this.readJson("data/classification/conflict-confidence-model.json");
    fallbackCanonical = this.readJson("data/canonical-problems/canonical-problem-alignment.json");
    fallbackReviewQueue = this.readJson("data/classification/review-queue.json");
    fallbackAnswerGuidance = this.readJson("data/classification/problem-answer-guidance.json");
    fallbackProblemDetails = this.readJson("data/classification/problem-details.json");
    fallbackSupplemental = this.readJson("data/classification/supplemental-cxx-problems.json");
    async getLevels() {
        const store = await this.loadStore();
        const levels = new Map();
        for (const record of store.records) {
            if (!levels.has(record.level)) {
                levels.set(record.level, {
                    level: record.level,
                    problem_count: 0,
                    domain_count: 0,
                    status_counts: { confirmed: 0, candidate: 0, needs_review: 0, conflict: 0 },
                    domains: new Set()
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
    async getLevelCatalog(level) {
        const store = await this.loadStore();
        const records = store.records.filter((record) => record.level === level);
        if (records.length === 0) {
            return null;
        }
        const domainMap = new Map();
        for (const record of records) {
            const domains = record.resolved_algorithm_domains.length > 0
                ? record.resolved_algorithm_domains
                : [{ value: "unclassified", label: "未分类", final_confidence: 0, effective_review_status: "needs_review", kind: "algorithm_domain" }];
            const problemTypes = record.resolved_problem_type_tags.length > 0
                ? record.resolved_problem_type_tags
                : [{ value: "untyped", label: "待抽取题型", final_confidence: 0, effective_review_status: "needs_review", kind: "problem_type" }];
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
    async getProblem(id) {
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
    async loadStore() {
        try {
            return await this.loadMysqlStore();
        }
        catch (error) {
            if (process.env.CATALOG_MYSQL_REQUIRED === "true") {
                throw error;
            }
            return this.loadJsonStore();
        }
    }
    async loadMysqlStore() {
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
            const meta = new Map(metaRows.map((row) => [row.meta_key, this.parseJson(row.meta_value)]));
            const records = recordRows.map((row) => this.parseJson(row.record_json));
            const items = reviewRows.map((row) => this.parseJson(row.item_json));
            const answerGuidanceByProblem = new Map();
            for (const row of guidanceRows) {
                answerGuidanceByProblem.set(row.canonical_problem_id, this.parseJson(row.guidance_json));
            }
            const problemDetailsByProblem = new Map();
            for (const row of detailRows) {
                problemDetailsByProblem.set(row.canonical_problem_id, this.parseJson(row.detail_json));
            }
            const sourceVersionsByProblem = new Map();
            for (const row of sourceRows) {
                if (!sourceVersionsByProblem.has(row.canonical_problem_id)) {
                    sourceVersionsByProblem.set(row.canonical_problem_id, []);
                }
                sourceVersionsByProblem.get(row.canonical_problem_id)?.push(this.parseJson(row.source_json));
            }
            return {
                generated_at: meta.get("conflict_confidence_generated_at")?.generated_at || new Date().toISOString(),
                records,
                reviewQueue: {
                    schema_version: 1,
                    generated_at: new Date().toISOString(),
                    generator: "mysql",
                    source_model: "data/classification/conflict-confidence-model.json",
                    summary: meta.get("review_queue_summary"),
                    items
                },
                answerGuidanceByProblem,
                problemDetailsByProblem,
                sourceVersionsByProblem,
                data_source: "mysql"
            };
        }
        finally {
            await connection.end();
        }
    }
    loadJsonStore() {
        const sourceVersionsByProblem = new Map();
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
            ...this.fallbackAnswerGuidance.records.map((record) => [record.canonical_problem_id, record]),
            ...this.fallbackSupplemental.answer_guidance.map((record) => [record.canonical_problem_id, record])
        ]);
        const problemDetailsByProblem = new Map([
            ...this.fallbackProblemDetails.records.map((record) => [record.canonical_problem_id, record]),
            ...this.fallbackSupplemental.problem_details.map((record) => [record.canonical_problem_id, record])
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
    parseJson(value) {
        return (typeof value === "string" ? JSON.parse(value) : value);
    }
    readJson(relativePath) {
        return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), "utf8"));
    }
    groupReviewItemsByProblem(reviewQueue) {
        const grouped = new Map();
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
    levelSummary(records) {
        const statusCounts = { confirmed: 0, candidate: 0, needs_review: 0, conflict: 0 };
        const problemTypeIds = new Set();
        const knowledgePointIds = new Set();
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
    problemSummary(record, answerGuidanceByProblem, problemDetailsByProblem) {
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
};
CatalogService = __decorate([
    Injectable()
], CatalogService);
export { CatalogService };
