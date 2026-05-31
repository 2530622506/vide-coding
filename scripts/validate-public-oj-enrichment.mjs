import { readFile } from "node:fs/promises";

const enrichmentPath = "data/enrichment/public-oj-problem-details.json";
const supplementalPath = "data/classification/supplemental-cxx-problems.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const [enrichment, supplemental] = await Promise.all([
    readJson(enrichmentPath),
    readJson(supplementalPath)
  ]);

  assert(enrichment.schema_version === 1, "enrichment schema_version must be 1");
  assert(enrichment.crawl_policy.public_pages_only === true, "crawl policy must be public only");
  assert(enrichment.crawl_policy.login_used === false, "login must not be used");
  assert(enrichment.crawl_policy.credentials_used === false, "credentials must not be used");
  assert(enrichment.records.length >= 88, `expected at least 88 extracted enrichment records, got ${enrichment.records.length}`);
  assert(enrichment.summary.statement_extracted_count >= 88, "expected at least 88 extracted statements");
  assert(enrichment.summary.sample_extracted_count >= 88, "expected at least 88 extracted sample groups");

  for (const record of enrichment.records) {
    assert(record.source_url.startsWith("https://www.luogu.com.cn/problem/"), `${record.canonical_problem_id}: source URL must be Luogu problem page`);
    assert(record.source_terms_status === "needs_review", `${record.canonical_problem_id}: source terms must need review`);
    assert(record.statement.status === "source_extracted", `${record.canonical_problem_id}: statement must be extracted`);
    assert(record.statement.sections.length > 0, `${record.canonical_problem_id}: statement sections required`);
    assert(record.sample_cases.status === "source_extracted", `${record.canonical_problem_id}: sample cases must be extracted`);
    assert(record.sample_cases.cases.length > 0, `${record.canonical_problem_id}: sample cases required`);
    assert(["source_extracted", "none_found"].includes(record.visual_assets.status), `${record.canonical_problem_id}: visual asset status invalid`);
  }

  const enrichedDetails = supplemental.problem_details.filter((detail) => detail.statement.status === "source_extracted");
  assert(enrichedDetails.length >= 88, `expected at least 88 applied details, got ${enrichedDetails.length}`);
  for (const detail of enrichedDetails) {
    assert(detail.content_origin.includes("ai_generated_learning_aid"), `${detail.canonical_problem_id}: AI learning-aid origin must remain visible`);
    assert(detail.statement.source_terms_status === "needs_review", `${detail.canonical_problem_id}: source terms status required`);
    assert(detail.sample_cases.cases.length > 0, `${detail.canonical_problem_id}: applied sample cases required`);
    assert(detail.completeness.needs_source_enrichment === false, `${detail.canonical_problem_id}: source enrichment should be marked complete`);
  }

  console.log(`public OJ enrichment records: ${enrichment.records.length}`);
  console.log(`statement extracted count: ${enrichment.summary.statement_extracted_count}`);
  console.log(`sample extracted count: ${enrichment.summary.sample_extracted_count}`);
  console.log(`applied supplemental detail count: ${enrichedDetails.length}`);
  console.log("Public OJ enrichment validation passed");
}

main().catch((error) => {
  console.error(`Public OJ enrichment validation failed: ${error.message}`);
  process.exitCode = 1;
});
