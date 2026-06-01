import { readFile } from "node:fs/promises";

const reviewPlanPath = "data/classification/review-workqueue-plan.json";
const supplementalPath = "data/classification/supplemental-cxx-problems.json";
const officialDetailsPath = "data/classification/problem-details.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const plan = JSON.parse(await readFile(reviewPlanPath, "utf8"));
  const supplemental = JSON.parse(await readFile(supplementalPath, "utf8"));
  const officialDetails = JSON.parse(await readFile(officialDetailsPath, "utf8"));
  const supplementalDetails = new Map(supplemental.problem_details.map((detail) => [detail.canonical_problem_id, detail]));
  const programmingSolutionsMissing = supplemental.records.some((record) => {
    if (record.question_type !== "programming") return false;
    const detail = supplementalDetails.get(record.canonical_problem_id);
    return !detail?.programming_solution?.code;
  });
  const statementsMissing = [
    ...officialDetails.records,
    ...supplemental.problem_details
  ].some((detail) => detail.statement?.status !== "source_extracted");

  assert(plan.schema_version === 1, "schema_version must be 1");
  assert(plan.summary.total_count > 0, "review workqueue must not be empty");
  assert(plan.summary.by_priority.high >= 2, "expected high priority review items");
  assert(plan.summary.by_type.source_conflict >= 1, "expected source conflict review item");
  assert(plan.summary.by_type.tag_conflict >= 1, "expected tag conflict review item");
  assert(plan.summary.by_type.tag_needs_review >= 1, "expected tag needs_review items");
  if (statementsMissing) {
    assert(plan.summary.by_type.statement_needs_collection >= 1, "expected statement collection review items");
  } else {
    assert(!plan.summary.by_type.statement_needs_collection, "statement collection review items should be absent after full statement extraction");
  }
  if (programmingSolutionsMissing) {
    assert(plan.summary.by_type.programming_solution_needs_review >= 1, "expected programming solution review items");
  }
  assert(Array.isArray(plan.next_batch) && plan.next_batch.length > 0, "next_batch must not be empty");
  assert(Array.isArray(plan.items) && plan.items.length === plan.summary.total_count, "items length must match summary");
  assert(plan.items.every((item) => item.status === "open"), "all generated review items must start open");
  assert(plan.items.every((item) => item.recommended_action), "all review items must include recommended_action");
  console.log(`review workqueue total: ${plan.summary.total_count}`);
  console.log(`review workqueue high priority: ${plan.summary.by_priority.high}`);
  console.log("Review workqueue validation passed");
}

main().catch((error) => {
  console.error(`Review workqueue validation failed: ${error.message}`);
  process.exitCode = 1;
});
