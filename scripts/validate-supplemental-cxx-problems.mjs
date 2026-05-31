import { readFile } from "node:fs/promises";

const supplementalPath = "data/classification/supplemental-cxx-problems.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const data = JSON.parse(await readFile(supplementalPath, "utf8"));
  assert(data.schema_version === 1, "schema_version must be 1");
  assert(data.summary.supplemental_record_count === data.records.length, "summary supplemental record count mismatch");
  assert(data.records.length >= 190, `expected at least 190 supplemental records, got ${data.records.length}`);
  assert(data.answer_guidance.length === data.records.length, "answer guidance length mismatch");
  assert(data.problem_details.length === data.records.length, "problem details length mismatch");
  assert(data.source_versions.length >= data.records.length, "source versions length mismatch");
  assert(data.summary.ai_generated_learning_aid_count === data.records.length, "all supplemental explanations must disclose AI generation");

  const ids = new Set();
  for (const record of data.records) {
    assert(record.language === "C++", `${record.canonical_problem_id}: language must be C++`);
    assert(record.record_origin === "supplemental_public_oj", `${record.canonical_problem_id}: record origin required`);
    assert(record.question_type === "programming", `${record.canonical_problem_id}: supplemental OJ entries must be programming`);
    assert(Number.isInteger(record.level) && record.level >= 1 && record.level <= 8, `${record.canonical_problem_id}: level must be 1-8`);
    assert(record.effective_review_status === "needs_review", `${record.canonical_problem_id}: supplemental records must need review`);
    assert(!ids.has(record.canonical_problem_id), `${record.canonical_problem_id}: duplicate id`);
    ids.add(record.canonical_problem_id);
  }

  for (const guidance of data.answer_guidance) {
    assert(guidance.content_origin === "ai_generated_learning_aid", `${guidance.canonical_problem_id}: AI origin required`);
    assert(/AI|生成|甄别/.test(guidance.ai_generation_notice), `${guidance.canonical_problem_id}: AI notice required`);
    assert(["reference_link", "needs_review"].includes(guidance.reference_answer.status), `${guidance.canonical_problem_id}: answer must be reference link or needs review`);
    if (guidance.reference_answer.source === "ai_generated_sample_verified") {
      assert(guidance.reference_answer.status === "needs_review", `${guidance.canonical_problem_id}: AI sample-verified answer must remain needs_review`);
    }
  }

  for (const detail of data.problem_details) {
    assert(detail.ai_generation_notice, `${detail.canonical_problem_id}: detail AI notice required`);
    assert(["pending_collection", "source_extracted", "none_found"].includes(detail.visual_assets.status), `${detail.canonical_problem_id}: visual assets status invalid`);
    assert(["reference_link", "needs_review"].includes(detail.programming_solution.status), `${detail.canonical_problem_id}: solution must remain reference link or needs review`);
    if (detail.programming_solution.content_origin === "ai_generated_sample_verified") {
      assert(detail.programming_solution.code, `${detail.canonical_problem_id}: AI sample-verified solution code required`);
      assert(detail.programming_solution.verification?.status === "sample_passed", `${detail.canonical_problem_id}: AI solution sample verification required`);
      assert(detail.completeness.needs_programming_solution === false, `${detail.canonical_problem_id}: AI sample-verified solution should not be missing`);
    }
    if (detail.statement.status === "source_extracted") {
      assert(Array.isArray(detail.statement.sections) && detail.statement.sections.length > 0, `${detail.canonical_problem_id}: extracted statement sections required`);
      assert(detail.statement.source_terms_status === "needs_review", `${detail.canonical_problem_id}: extracted statement source terms status required`);
      assert(detail.sample_cases.status === "source_extracted", `${detail.canonical_problem_id}: extracted sample status required`);
      assert(detail.sample_cases.cases.length > 0, `${detail.canonical_problem_id}: extracted sample cases required`);
      assert(detail.completeness.needs_source_enrichment === false, `${detail.canonical_problem_id}: extracted details should not need source enrichment`);
    }
  }

  console.log(`supplemental C++ problem count: ${data.records.length}`);
  console.log(`supplemental level 5 count: ${data.summary.by_level["5"]}`);
  console.log(`AI generated learning aid count: ${data.summary.ai_generated_learning_aid_count}`);
  console.log(`source extracted statement count: ${data.summary.source_extracted_statement_count || 0}`);
  console.log(`AI sample verified solution count: ${data.summary.ai_sample_verified_solution_count || 0}`);
  console.log("Supplemental C++ problem validation passed");
}

main().catch((error) => {
  console.error(`Supplemental C++ validation failed: ${error.message}`);
  process.exitCode = 1;
});
