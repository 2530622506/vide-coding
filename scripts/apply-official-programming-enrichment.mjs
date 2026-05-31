import { readFile, writeFile } from "node:fs/promises";

const detailsPath = "data/classification/problem-details.json";
const enrichmentPath = "data/enrichment/official-programming-oj-details.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function summarize(data) {
  const base = {
    ...data.summary,
    selection_pending_option_count: data.records.filter((record) => record.question_type === "selection" && record.completeness.needs_option_collection).length,
    selection_source_extracted_option_count: data.records.filter((record) => record.question_type === "selection" && record.choice_options.status === "source_extracted").length,
    selection_needs_review_option_count: data.records.filter((record) => record.question_type === "selection" && record.choice_options.status === "needs_review").length,
    pending_visual_asset_collection_count: data.records.filter((record) => record.completeness.needs_visual_asset_collection).length,
    programming_pending_solution_count: data.records.filter((record) => record.question_type === "programming" && record.completeness.needs_programming_solution).length,
    judgment_standard_binary_option_count: data.records.filter((record) => record.question_type === "judgment" && record.choice_options.status === "standard_binary").length
  };
  return {
    ...base,
    official_programming_source_extracted_statement_count: data.records.filter((record) => record.question_type === "programming" && record.statement.status === "source_extracted").length,
    official_programming_source_extracted_sample_count: data.records.filter((record) => record.question_type === "programming" && record.sample_cases.status === "source_extracted").length,
    official_programming_source_extracted_visual_asset_count: data.records.filter((record) => record.question_type === "programming" && record.visual_assets.status === "source_extracted").length,
    official_programming_visual_asset_none_found_count: data.records.filter((record) => record.question_type === "programming" && record.visual_assets.status === "none_found").length
  };
}

function mergeDetail(detail, enrichment) {
  const hasVisualAssets = enrichment.visual_assets.assets.length > 0;
  return {
    ...detail,
    statement: {
      ...detail.statement,
      ...enrichment.statement,
      stem: enrichment.statement.title || detail.statement.stem,
      evidence_snippet: detail.statement.evidence_snippet,
      extracted_at: enrichment.fetched_at,
      notes: enrichment.statement.notes
    },
    visual_assets: {
      ...detail.visual_assets,
      ...enrichment.visual_assets,
      notes: enrichment.visual_assets.notes
    },
    sample_cases: {
      ...detail.sample_cases,
      ...enrichment.sample_cases,
      notes: enrichment.sample_cases.notes
    },
    source_enrichment: {
      status: enrichment.fetch_status,
      extraction_method: enrichment.extraction_method,
      source_url: enrichment.source_url,
      fetched_at: enrichment.fetched_at,
      source_terms_status: enrichment.source_terms_status,
      review_status: enrichment.review_status
    },
    completeness: {
      ...detail.completeness,
      has_statement_stem: true,
      has_visual_assets: hasVisualAssets,
      needs_visual_asset_collection: enrichment.visual_assets.status === "pending_collection",
      needs_source_enrichment: false,
      needs_programming_solution: !detail.programming_solution?.code,
      needs_solution_review: Boolean(detail.programming_solution?.code)
    }
  };
}

async function main() {
  const [details, enrichment] = await Promise.all([
    readJson(detailsPath),
    readJson(enrichmentPath)
  ]);
  const enrichmentById = new Map(enrichment.records
    .filter((record) => record.fetch_status === "source_extracted")
    .map((record) => [record.canonical_problem_id, record]));
  let appliedCount = 0;

  details.records = details.records.map((detail) => {
    const matched = enrichmentById.get(detail.canonical_problem_id);
    if (!matched) {
      return detail;
    }
    appliedCount += 1;
    return mergeDetail(detail, matched);
  });

  details.generated_at = new Date().toISOString();
  details.official_programming_enrichment = {
    source_file: enrichmentPath,
    applied_at: details.generated_at,
    applied_count: appliedCount,
    source_terms_status: "needs_review",
    crawl_policy: enrichment.crawl_policy
  };
  details.summary = summarize(details);

  await writeFile(detailsPath, `${JSON.stringify(details, null, 2)}\n`);

  console.log(`applied official programming enrichment count: ${appliedCount}`);
  console.log(`official programming source extracted statements: ${details.summary.official_programming_source_extracted_statement_count}`);
  console.log(`official programming source extracted samples: ${details.summary.official_programming_source_extracted_sample_count}`);
  console.log(`wrote ${detailsPath}`);
}

main().catch((error) => {
  console.error(`Apply official programming enrichment failed: ${error.message}`);
  process.exitCode = 1;
});
