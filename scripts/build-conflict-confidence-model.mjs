import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const problemKnowledgePath = "data/classification/problem-type-knowledge.json";
const levelDomainPath = "data/classification/level-domain-classification.json";
const canonicalAlignmentPath = "data/canonical-problems/canonical-problem-alignment.json";
const outputDir = "data/classification";
const modelPath = `${outputDir}/conflict-confidence-model.json`;
const reviewQueuePath = `${outputDir}/review-queue.json`;
const generator = "scripts/build-conflict-confidence-model.mjs";

const allowedSyllabusFit = [
  "exact",
  "adjacent",
  "out_of_level",
  "community_inferred",
  "disputed",
  "needs_review"
];

const confidenceThresholds = {
  confirmed: 0.9,
  candidate: 0.7,
  needs_review: 0.0
};

const scoreFactors = [
  { id: "official_problem_text", delta: 0.08, description: "official PDF short evidence exists" },
  { id: "practice_link", delta: 0.04, description: "aligned OJ practice link exists" },
  { id: "code_signal", delta: 0.02, description: "code or solution metadata exists" },
  { id: "solution_text", delta: 0.02, description: "solution/reference source exists" },
  { id: "seed_rule_source", delta: -0.05, description: "tag came only from title override seed rule" },
  { id: "syllabus_exact", delta: 0.1, description: "tag is exact syllabus fit" },
  { id: "syllabus_needs_review", delta: -0.02, description: "tag still needs syllabus review" },
  { id: "syllabus_community_inferred", delta: -0.04, description: "tag is inferred from community or seed evidence" },
  { id: "syllabus_out_or_disputed", delta: -0.18, description: "tag is out of level or disputed" },
  { id: "review_confirmed", delta: 0.08, description: "tag has reviewer confirmation" },
  { id: "known_conflict", delta: -0.25, description: "record has source or level conflict" }
];

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function clampScore(value) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

function makeId(prefix, value) {
  return `${prefix}:${sha256(value).slice(0, 16)}`;
}

function addFactor(breakdown, factorId, condition) {
  if (!condition) {
    return 0;
  }
  const factor = scoreFactors.find((item) => item.id === factorId);
  breakdown.push({
    factor: factor.id,
    delta: factor.delta,
    description: factor.description
  });
  return factor.delta;
}

function conflictReasonsForTag({ tag, record, recordConflictRefs }) {
  const reasons = [];
  if (recordConflictRefs.length > 0) {
    reasons.push("record_has_source_conflict");
  }
  if (tag.syllabus_fit === "out_of_level" || tag.syllabus_fit === "disputed") {
    reasons.push(`syllabus_fit_${tag.syllabus_fit}`);
  }
  if (record.level === 5 && /dynamic|dp|动态规划/i.test(`${tag.value} ${tag.label}`) && tag.syllabus_fit === "exact") {
    reasons.push("level5_dp_exact_is_disallowed");
  }
  return reasons;
}

function effectiveStatus({ tag, finalConfidence, conflictReasons }) {
  if (conflictReasons.length > 0) {
    return "conflict";
  }
  if (tag.review_status === "confirmed" && finalConfidence >= confidenceThresholds.confirmed) {
    return "confirmed";
  }
  if (tag.syllabus_fit === "community_inferred") {
    return "needs_review";
  }
  if (finalConfidence < confidenceThresholds.candidate) {
    return "needs_review";
  }
  return "candidate";
}

function reviewReason({ tag, finalConfidence, conflictReasons, effectiveReviewStatus }) {
  if (conflictReasons.length > 0) {
    return conflictReasons;
  }
  const reasons = [];
  if (effectiveReviewStatus === "confirmed") {
    reasons.push("confirmed_by_trusted_source_or_reviewer");
  }
  if (effectiveReviewStatus === "candidate") {
    reasons.push("candidate_above_threshold");
  }
  if (effectiveReviewStatus === "needs_review") {
    if (tag.syllabus_fit === "community_inferred") {
      reasons.push("community_or_seed_inferred");
    }
    if (finalConfidence < confidenceThresholds.candidate) {
      reasons.push("below_candidate_threshold");
    }
  }
  return reasons.length > 0 ? reasons : ["needs_human_review"];
}

function scoreTag(tag, record, sourceSignals, recordConflictRefs) {
  const breakdown = [{
    factor: "raw_tag_confidence",
    delta: tag.confidence,
    description: "confidence emitted by upstream extraction"
  }];
  let score = tag.confidence;
  score += addFactor(breakdown, "official_problem_text", sourceSignals.official_problem_text);
  score += addFactor(breakdown, "practice_link", sourceSignals.practice_link);
  score += addFactor(breakdown, "code_signal", sourceSignals.code_signal);
  score += addFactor(breakdown, "solution_text", sourceSignals.solution_text);
  score += addFactor(breakdown, "seed_rule_source", tag.source === "seed_rule");
  score += addFactor(breakdown, "syllabus_exact", tag.syllabus_fit === "exact");
  score += addFactor(breakdown, "syllabus_needs_review", tag.syllabus_fit === "needs_review");
  score += addFactor(breakdown, "syllabus_community_inferred", tag.syllabus_fit === "community_inferred");
  score += addFactor(breakdown, "syllabus_out_or_disputed", tag.syllabus_fit === "out_of_level" || tag.syllabus_fit === "disputed");
  score += addFactor(breakdown, "review_confirmed", tag.review_status === "confirmed");
  score += addFactor(breakdown, "known_conflict", recordConflictRefs.length > 0);

  const finalConfidence = clampScore(score);
  const conflictReasons = conflictReasonsForTag({ tag, record, recordConflictRefs });
  const effectiveReviewStatus = effectiveStatus({ tag, finalConfidence, conflictReasons });

  return {
    ...tag,
    raw_confidence: tag.confidence,
    final_confidence: finalConfidence,
    confidence_breakdown: breakdown,
    conflict_reasons: conflictReasons,
    effective_review_status: effectiveReviewStatus,
    review_reason: reviewReason({ tag, finalConfidence, conflictReasons, effectiveReviewStatus })
  };
}

function recordStatus(enrichedTags, recordReviewItemIds, recordConflictRefs) {
  if (recordConflictRefs.length > 0 || enrichedTags.some((tag) => tag.effective_review_status === "conflict")) {
    return "conflict";
  }
  if (recordReviewItemIds.length > 0 || enrichedTags.some((tag) => tag.effective_review_status === "needs_review")) {
    return "needs_review";
  }
  if (enrichedTags.some((tag) => tag.effective_review_status === "candidate")) {
    return "candidate";
  }
  return "needs_review";
}

function priorityFor(type) {
  if (type === "source_conflict" || type === "out_of_level_signal" || type === "tag_conflict") {
    return "high";
  }
  if (type === "low_confidence_tag" || type === "inferred_seed_rule" || type === "untyped_level5_problem" || type === "no_knowledge_level5_problem") {
    return "medium";
  }
  return "low";
}

function priorityRank(priority) {
  return { high: 0, medium: 1, low: 2 }[priority] ?? 3;
}

function reviewItem({ type, title, record, tag, sourceRef, reason }) {
  const canonicalProblemId = record?.canonical_problem_id || null;
  const tagValue = tag?.value || null;
  const id = makeId("review", `${type}:${canonicalProblemId || ""}:${tagValue || ""}:${sourceRef?.id || ""}:${reason}`);
  return {
    id,
    type,
    priority: priorityFor(type),
    status: "open",
    canonical_problem_id: canonicalProblemId,
    title,
    tag_kind: tag?.kind || null,
    tag_value: tagValue,
    final_confidence: tag?.final_confidence ?? null,
    reason,
    source_ref: sourceRef || null
  };
}

function summarizeReviewQueue(items) {
  const byType = {};
  const byPriority = {};
  for (const item of items) {
    byType[item.type] = (byType[item.type] || 0) + 1;
    byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
  }
  return {
    total_count: items.length,
    by_type: byType,
    by_priority: byPriority
  };
}

function summarizeRecords(records) {
  const statusCounts = {};
  const tagStatusCounts = {};
  let tagCount = 0;
  let level5Count = 0;
  let level5ConflictCount = 0;
  let level5NeedsReviewCount = 0;

  for (const record of records) {
    statusCounts[record.effective_review_status] = (statusCounts[record.effective_review_status] || 0) + 1;
    if (record.language === "C++" && record.level === 5) {
      level5Count += 1;
      if (record.effective_review_status === "conflict") {
        level5ConflictCount += 1;
      }
      if (record.effective_review_status === "needs_review") {
        level5NeedsReviewCount += 1;
      }
    }
    for (const tag of [
      ...record.resolved_algorithm_domains,
      ...record.resolved_problem_type_tags,
      ...record.resolved_knowledge_point_tags
    ]) {
      tagCount += 1;
      tagStatusCounts[tag.effective_review_status] = (tagStatusCounts[tag.effective_review_status] || 0) + 1;
    }
  }

  return {
    record_count: records.length,
    cxx_level5_record_count: level5Count,
    cxx_level5_conflict_count: level5ConflictCount,
    cxx_level5_needs_review_count: level5NeedsReviewCount,
    tag_count: tagCount,
    record_status_counts: statusCounts,
    tag_status_counts: tagStatusCounts
  };
}

function sourceSignalsFor(record, canonicalProblem) {
  const sourceVersions = canonicalProblem?.source_versions || [];
  return {
    ...record.extraction_sources,
    secondary_source_count: sourceVersions.filter((source) => source.source_kind !== "official_pdf").length,
    source_version_count: sourceVersions.length
  };
}

async function main() {
  const problemKnowledge = await readJson(problemKnowledgePath);
  const levelDomain = await readJson(levelDomainPath);
  const canonicalAlignment = await readJson(canonicalAlignmentPath);
  const levelDomainById = new Map(levelDomain.records.map((record) => [record.canonical_problem_id, record]));
  const canonicalByOfficialId = new Map();
  const canonicalById = new Map();

  for (const problem of canonicalAlignment.canonical_problems) {
    canonicalById.set(problem.id, problem);
    canonicalByOfficialId.set(problem.official_problem_id, problem);
  }

  const conflictByOfficialId = new Map();
  for (const conflict of canonicalAlignment.review_queue.conflict_candidates || []) {
    for (const officialProblemId of conflict.official_problem_ids || []) {
      if (!conflictByOfficialId.has(officialProblemId)) {
        conflictByOfficialId.set(officialProblemId, []);
      }
      conflictByOfficialId.get(officialProblemId).push(conflict);
    }
  }

  const reviewItems = [];
  for (const conflict of canonicalAlignment.review_queue.conflict_candidates || []) {
    for (const officialProblemId of conflict.official_problem_ids || []) {
      const canonicalProblem = canonicalByOfficialId.get(officialProblemId);
      reviewItems.push(reviewItem({
        type: "source_conflict",
        title: conflict.candidate_title,
        record: canonicalProblem ? { canonical_problem_id: canonicalProblem.id } : null,
        sourceRef: conflict,
        reason: conflict.conflict_basis
      }));
    }
  }
  for (const duplicate of canonicalAlignment.review_queue.duplicate_candidates || []) {
    reviewItems.push(reviewItem({
      type: "source_duplicate",
      title: duplicate.title,
      sourceRef: duplicate,
      reason: duplicate.match_basis
    }));
  }

  const records = [];
  for (const record of problemKnowledge.records) {
    const levelRecord = levelDomainById.get(record.canonical_problem_id);
    const canonicalProblem = canonicalById.get(record.canonical_problem_id);
    const sourceSignals = sourceSignalsFor(record, canonicalProblem);
    const sourceConflicts = conflictByOfficialId.get(record.official_problem_id) || [];
    const outOfLevelSignals = levelRecord?.out_of_level_signals || [];
    const recordConflictRefs = [
      ...sourceConflicts.map((item) => item.id),
      ...outOfLevelSignals.map((item) => item.id)
    ];

    const resolvedAlgorithmDomains = (levelRecord?.labels?.algorithm_domain || [])
      .map((tag) => scoreTag(tag, record, sourceSignals, recordConflictRefs));
    const resolvedProblemTypes = record.problem_type_tags
      .map((tag) => scoreTag(tag, record, sourceSignals, recordConflictRefs));
    const resolvedKnowledgePoints = record.knowledge_point_tags
      .map((tag) => scoreTag(tag, record, sourceSignals, recordConflictRefs));
    const enrichedTags = [...resolvedAlgorithmDomains, ...resolvedProblemTypes, ...resolvedKnowledgePoints];
    const recordReviewItemIds = [];

    for (const signal of outOfLevelSignals) {
      const item = reviewItem({
        type: "out_of_level_signal",
        title: record.title,
        record,
        sourceRef: signal,
        reason: signal.conflict_type || "out_of_level_signal"
      });
      reviewItems.push(item);
      recordReviewItemIds.push(item.id);
    }

    for (const tag of enrichedTags) {
      if (tag.effective_review_status === "conflict") {
        const item = reviewItem({
          type: "tag_conflict",
          title: record.title,
          record,
          tag,
          reason: tag.review_reason.join(",")
        });
        reviewItems.push(item);
        recordReviewItemIds.push(item.id);
      } else if (tag.effective_review_status === "needs_review") {
        const item = reviewItem({
          type: tag.syllabus_fit === "community_inferred" ? "inferred_seed_rule" : "low_confidence_tag",
          title: record.title,
          record,
          tag,
          reason: tag.review_reason.join(",")
        });
        reviewItems.push(item);
        recordReviewItemIds.push(item.id);
      }
    }

    if (record.language === "C++" && record.level === 5 && record.problem_type_tags.length === 0) {
      const item = reviewItem({
        type: "untyped_level5_problem",
        title: record.title,
        record,
        reason: "level5_problem_has_no_problem_type_tag"
      });
      reviewItems.push(item);
      recordReviewItemIds.push(item.id);
    }

    if (record.language === "C++" && record.level === 5 && record.knowledge_point_tags.length === 0) {
      const item = reviewItem({
        type: "no_knowledge_level5_problem",
        title: record.title,
        record,
        reason: "level5_problem_has_no_knowledge_point_tag"
      });
      reviewItems.push(item);
      recordReviewItemIds.push(item.id);
    }

    records.push({
      canonical_problem_id: record.canonical_problem_id,
      official_problem_id: record.official_problem_id,
      session: record.session,
      language: record.language,
      level: record.level,
      question_type: record.question_type,
      question_number: record.question_number,
      title: record.title,
      source_signals: sourceSignals,
      source_conflict_refs: sourceConflicts.map((item) => item.id),
      out_of_level_signal_refs: outOfLevelSignals.map((item) => item.id),
      review_queue_refs: recordReviewItemIds,
      resolved_algorithm_domains: resolvedAlgorithmDomains,
      resolved_problem_type_tags: resolvedProblemTypes,
      resolved_knowledge_point_tags: resolvedKnowledgePoints,
      effective_review_status: recordStatus(enrichedTags, recordReviewItemIds, recordConflictRefs)
    });
  }

  const dedupedReviewItems = [...new Map(reviewItems.map((item) => [item.id, item])).values()]
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.type.localeCompare(b.type) || (a.canonical_problem_id || "").localeCompare(b.canonical_problem_id || ""));
  const summary = summarizeRecords(records);
  summary.source_conflict_count = (canonicalAlignment.review_queue.conflict_candidates || []).length;
  summary.source_duplicate_count = (canonicalAlignment.review_queue.duplicate_candidates || []).length;
  summary.review_queue_item_count = dedupedReviewItems.length;

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator,
    inputs: {
      problem_knowledge: problemKnowledgePath,
      level_domain_classification: levelDomainPath,
      canonical_alignment: canonicalAlignmentPath
    },
    score_policy: {
      allowed_syllabus_fit: allowedSyllabusFit,
      confidence_thresholds: confidenceThresholds,
      factors: scoreFactors,
      final_status_rule: "confirmed requires upstream confirmation; candidate requires score >= 0.70 without conflicts; conflicts and community/low-confidence tags go to review."
    },
    summary,
    records
  };
  const reviewQueue = {
    schema_version: 1,
    generated_at: output.generated_at,
    generator,
    source_model: modelPath,
    summary: summarizeReviewQueue(dedupedReviewItems),
    items: dedupedReviewItems
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(modelPath, `${JSON.stringify(output, null, 2)}\n`);
  await writeFile(reviewQueuePath, `${JSON.stringify(reviewQueue, null, 2)}\n`);

  console.log(`conflict-confidence record count: ${summary.record_count}`);
  console.log(`confidence tag count: ${summary.tag_count}`);
  console.log(`source conflict count: ${summary.source_conflict_count}`);
  console.log(`source duplicate count: ${summary.source_duplicate_count}`);
  console.log(`review queue item count: ${summary.review_queue_item_count}`);
  console.log(`C++ level 5 needs review count: ${summary.cxx_level5_needs_review_count}`);
  console.log(`C++ level 5 conflict count: ${summary.cxx_level5_conflict_count}`);
  console.log(`wrote ${modelPath}`);
  console.log(`wrote ${reviewQueuePath}`);
}

main().catch((error) => {
  console.error(`Conflict/confidence model build failed: ${error.message}`);
  process.exitCode = 1;
});
