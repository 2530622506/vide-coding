import { readFile } from "node:fs/promises";

const enrichmentPath = "data/enrichment/official-programming-oj-details.json";
const detailsPath = "data/classification/problem-details.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const [enrichment, details] = await Promise.all([
    readJson(enrichmentPath),
    readJson(detailsPath)
  ]);

  assert(enrichment.schema_version === 1, "enrichment schema_version must be 1");
  assert(enrichment.crawl_policy.public_pages_only === true, "official programming enrichment must use public pages only");
  assert(enrichment.crawl_policy.login_used === false, "login must not be used");
  assert(enrichment.crawl_policy.credentials_used === false, "credentials must not be used");
  assert(enrichment.records.length >= 16, `expected 16 official programming enrichment records, got ${enrichment.records.length}`);
  assert(enrichment.summary.statement_extracted_count >= 16, "expected 16 official programming statements");
  assert(enrichment.summary.sample_extracted_count >= 16, "expected 16 official programming sample groups");

  for (const record of enrichment.records) {
    assert(/^canonical:/.test(record.canonical_problem_id), `${record.canonical_problem_id}: expected canonical id`);
    assert(record.source_url.startsWith("https://www.luogu.com.cn/problem/"), `${record.canonical_problem_id}: source URL must be Luogu problem page`);
    assert(record.source_terms_status === "needs_review", `${record.canonical_problem_id}: source terms must need review`);
    assert(record.statement.status === "source_extracted", `${record.canonical_problem_id}: statement must be extracted`);
    assert(record.statement.sections.length > 0, `${record.canonical_problem_id}: statement sections required`);
    assert(record.sample_cases.status === "source_extracted", `${record.canonical_problem_id}: sample cases must be extracted`);
    assert(record.sample_cases.cases.length > 0, `${record.canonical_problem_id}: sample cases required`);
    assert(["source_extracted", "none_found"].includes(record.visual_assets.status), `${record.canonical_problem_id}: visual asset status invalid`);
  }

  const enrichedDetails = details.records.filter((detail) => detail.question_type === "programming" && detail.statement.status === "source_extracted");
  assert(enrichedDetails.length >= 16, `expected 16 enriched official programming details, got ${enrichedDetails.length}`);
  for (const detail of enrichedDetails) {
    assert(detail.source_enrichment?.source_terms_status === "needs_review", `${detail.canonical_problem_id}: source terms status required`);
    assert(detail.sample_cases.status === "source_extracted", `${detail.canonical_problem_id}: sample status required`);
    assert(detail.sample_cases.cases.length > 0, `${detail.canonical_problem_id}: sample cases required`);
    assert(detail.completeness.needs_source_enrichment === false, `${detail.canonical_problem_id}: source enrichment should be complete`);
    if (detail.programming_solution.content_origin === "ai_generated_sample_verified") {
      assert(detail.programming_solution.status === "needs_review", `${detail.canonical_problem_id}: AI solution must remain needs_review`);
      assert(detail.programming_solution.verification?.status === "sample_passed", `${detail.canonical_problem_id}: AI solution sample verification required`);
      assert(detail.completeness.needs_programming_solution === false, `${detail.canonical_problem_id}: AI solution should close pending flag`);
      assert(detail.completeness.needs_solution_review === true, `${detail.canonical_problem_id}: AI solution review flag required`);
    } else {
      assert(detail.completeness.needs_programming_solution === true, `${detail.canonical_problem_id}: official programming solutions should be pending before AI enrichment`);
    }
  }

  console.log(`official programming OJ enrichment records: ${enrichment.records.length}`);
  console.log(`official programming statement extracted count: ${enrichment.summary.statement_extracted_count}`);
  console.log(`official programming sample extracted count: ${enrichment.summary.sample_extracted_count}`);
  console.log(`official programming applied detail count: ${enrichedDetails.length}`);
  console.log("Official programming enrichment validation passed");
}

main().catch((error) => {
  console.error(`Official programming enrichment validation failed: ${error.message}`);
  process.exitCode = 1;
});
