import { readFile } from "node:fs/promises";

const modelPath = "data/classification/conflict-confidence-model.json";
const reviewQueuePath = "data/classification/review-queue.json";
const problemKnowledgePath = "data/classification/problem-type-knowledge.json";
const canonicalAlignmentPath = "data/canonical-problems/canonical-problem-alignment.json";

const requiredSyllabusFit = new Set([
  "exact",
  "adjacent",
  "out_of_level",
  "community_inferred",
  "disputed",
  "needs_review"
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertResolvedTag(tag, context) {
  assert(typeof tag.kind === "string" && tag.kind.length > 0, `${context}: kind required`);
  assert(typeof tag.value === "string" && tag.value.length > 0, `${context}: value required`);
  assert(typeof tag.raw_confidence === "number", `${context}: raw_confidence required`);
  assert(typeof tag.final_confidence === "number" && tag.final_confidence >= 0 && tag.final_confidence <= 1, `${context}: final_confidence must be 0..1`);
  assert(Array.isArray(tag.confidence_breakdown) && tag.confidence_breakdown.length > 0, `${context}: confidence_breakdown required`);
  assert(Array.isArray(tag.conflict_reasons), `${context}: conflict_reasons required`);
  assert(["confirmed", "candidate", "needs_review", "conflict"].includes(tag.effective_review_status), `${context}: invalid effective_review_status`);
  assert(Array.isArray(tag.review_reason) && tag.review_reason.length > 0, `${context}: review_reason required`);
}

async function main() {
  const model = await readJson(modelPath);
  const reviewQueue = await readJson(reviewQueuePath);
  const problemKnowledge = await readJson(problemKnowledgePath);
  const canonicalAlignment = await readJson(canonicalAlignmentPath);

  assert(model.schema_version === 1, "model schema_version must be 1");
  assert(reviewQueue.schema_version === 1, "review queue schema_version must be 1");
  assert(Array.isArray(model.score_policy?.allowed_syllabus_fit), "allowed_syllabus_fit must be array");
  for (const item of requiredSyllabusFit) {
    assert(model.score_policy.allowed_syllabus_fit.includes(item), `missing syllabus_fit ${item}`);
  }
  assert(Array.isArray(model.score_policy?.factors) && model.score_policy.factors.length >= 8, "score factors must be defined");
  assert(typeof model.score_policy?.confidence_thresholds?.candidate === "number", "candidate threshold required");
  assert(Array.isArray(model.records), "model records must be array");
  assert(model.records.length === problemKnowledge.records.length, "model record count must match problem knowledge");

  let tagCount = 0;
  let level5Count = 0;
  let level5ExactDpCount = 0;
  const statusCounts = {};

  for (const record of model.records) {
    assert(record.language === "C++", `${record.canonical_problem_id}: language must be C++`);
    assert(["confirmed", "candidate", "needs_review", "conflict"].includes(record.effective_review_status), `${record.canonical_problem_id}: invalid record status`);
    assert(Array.isArray(record.review_queue_refs), `${record.canonical_problem_id}: review_queue_refs required`);
    const tags = [
      ...record.resolved_algorithm_domains,
      ...record.resolved_problem_type_tags,
      ...record.resolved_knowledge_point_tags
    ];
    for (const tag of tags) {
      assertResolvedTag(tag, `${record.canonical_problem_id}:${tag.kind}:${tag.value}`);
      tagCount += 1;
      statusCounts[tag.effective_review_status] = (statusCounts[tag.effective_review_status] || 0) + 1;
      if (record.level === 5 && /dynamic|dp|动态规划/i.test(`${tag.value} ${tag.label}`) && tag.syllabus_fit === "exact") {
        level5ExactDpCount += 1;
      }
    }
    if (record.level === 5) {
      level5Count += 1;
    }
  }

  assert(level5Count === 27, `expected 27 C++ level 5 records, got ${level5Count}`);
  assert(level5ExactDpCount === 0, "level 5 exact DP tags must be zero");
  assert(model.summary.record_count === model.records.length, "summary record count mismatch");
  assert(model.summary.tag_count === tagCount, "summary tag count mismatch");
  assert(model.summary.source_conflict_count === canonicalAlignment.review_queue.conflict_candidates.length, "source conflict count mismatch");
  assert(model.summary.source_duplicate_count === canonicalAlignment.review_queue.duplicate_candidates.length, "source duplicate count mismatch");
  assert(model.summary.review_queue_item_count === reviewQueue.items.length, "review queue item count mismatch");
  assert(model.summary.cxx_level5_record_count === 27, "summary level 5 count mismatch");
  assert(model.summary.cxx_level5_needs_review_count >= 6, "level 5 review queue should include untyped or uncovered problems");
  assert(statusCounts.candidate > 0, "expected candidate tags");
  assert(statusCounts.needs_review > 0, "expected needs_review tags");

  assert(reviewQueue.source_model === modelPath, "review queue source_model mismatch");
  assert(Array.isArray(reviewQueue.items), "review queue items must be array");
  assert(reviewQueue.items.some((item) => item.type === "source_conflict"), "review queue must include source conflicts");
  assert(reviewQueue.items.some((item) => item.type === "source_duplicate"), "review queue must include duplicate source candidates");
  assert(reviewQueue.items.some((item) => item.type === "untyped_level5_problem"), "review queue must include untyped level 5 problems");
  assert(reviewQueue.items.some((item) => item.type === "no_knowledge_level5_problem"), "review queue must include no-knowledge level 5 problems");
  for (const item of reviewQueue.items) {
    assert(typeof item.id === "string" && item.id.length > 0, "review item id required");
    assert(["high", "medium", "low"].includes(item.priority), `${item.id}: invalid priority`);
    assert(item.status === "open", `${item.id}: review item status must be open`);
    assert(typeof item.reason === "string" && item.reason.length > 0, `${item.id}: reason required`);
  }
  assert(reviewQueue.summary.total_count === reviewQueue.items.length, "review queue summary mismatch");

  console.log(`conflict-confidence record count: ${model.summary.record_count}`);
  console.log(`confidence tag count: ${model.summary.tag_count}`);
  console.log(`candidate tag count: ${statusCounts.candidate || 0}`);
  console.log(`needs-review tag count: ${statusCounts.needs_review || 0}`);
  console.log(`source conflict count: ${model.summary.source_conflict_count}`);
  console.log(`source duplicate count: ${model.summary.source_duplicate_count}`);
  console.log(`review queue item count: ${reviewQueue.items.length}`);
  console.log(`C++ level 5 needs review count: ${model.summary.cxx_level5_needs_review_count}`);
  console.log(`C++ level 5 conflict count: ${model.summary.cxx_level5_conflict_count}`);
  console.log("Conflict/confidence model validation passed");
}

main().catch((error) => {
  console.error(`Conflict/confidence model validation failed: ${error.message}`);
  process.exitCode = 1;
});
