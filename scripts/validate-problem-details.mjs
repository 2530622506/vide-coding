import { readFile } from "node:fs/promises";

const detailPath = "data/classification/problem-details.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const details = JSON.parse(await readFile(detailPath, "utf8"));
  assert(details.schema_version === 1, "problem detail schema_version must be 1");
  assert(details.records.length === 216, `expected 216 detail records, got ${details.records.length}`);
  assert(details.summary.record_count === details.records.length, "summary record count mismatch");
  assert(details.storage_policy?.visual_assets, "visual asset storage policy required");

  let selectionPending = 0;
  let selectionSourceExtracted = 0;
  let selectionNeedsReview = 0;
  let programmingPending = 0;
  let visualPending = 0;
  let judgmentBinary = 0;
  let officialProgrammingStatement = 0;
  let officialProgrammingSamples = 0;
  let officialProgrammingVisualExtracted = 0;
  let officialProgrammingAiSolutions = 0;
  let visualSourceExtractedRecords = 0;
  let visualSourceExtractedAssets = 0;
  let visualNoneFound = 0;

  for (const record of details.records) {
    assert(record.canonical_problem_id, "canonical_problem_id required");
    assert(record.statement?.stem, `${record.canonical_problem_id}: statement stem required`);
    assert(Array.isArray(record.choice_options?.options), `${record.canonical_problem_id}: choice options array required`);
    assert(Array.isArray(record.visual_assets?.assets), `${record.canonical_problem_id}: visual assets array required`);
    assert(Array.isArray(record.source_links), `${record.canonical_problem_id}: source links required`);
    assert(record.completeness && typeof record.completeness === "object", `${record.canonical_problem_id}: completeness required`);

    if (record.question_type === "selection" && record.choice_options.status === "pending_collection") {
      selectionPending += 1;
    }
    if (record.question_type === "selection" && record.choice_options.status === "source_extracted") {
      selectionSourceExtracted += 1;
      assert(record.choice_options.options.length === 4, `${record.canonical_problem_id}: source-extracted selection options must have A/B/C/D`);
      assert(record.choice_options.options.map((option) => option.key).join("") === "ABCD", `${record.canonical_problem_id}: option keys must be ABCD`);
      assert(record.choice_options.options.every((option) => option.text && option.source_status === "source_extracted"), `${record.canonical_problem_id}: option text/source required`);
    }
    if (record.question_type === "selection" && record.choice_options.status === "needs_review") {
      selectionNeedsReview += 1;
      assert(record.choice_options.options.length === 4, `${record.canonical_problem_id}: needs-review selection options must keep A/B/C/D slots`);
      assert(record.choice_options.options.map((option) => option.key).join("") === "ABCD", `${record.canonical_problem_id}: needs-review option keys must be ABCD`);
      assert(
        record.choice_options.options.every((option) => option.text && ["source_extracted", "needs_review"].includes(option.source_status)),
        `${record.canonical_problem_id}: needs-review option text/source required`
      );
      assert(record.choice_options.options.some((option) => option.source_status === "needs_review"), `${record.canonical_problem_id}: needs-review options should include at least one uncertain option`);
    }
    if (record.question_type === "programming" && record.completeness.needs_programming_solution) {
      programmingPending += 1;
    }
    if (record.question_type === "programming" && record.statement.status === "source_extracted") {
      officialProgrammingStatement += 1;
      assert(record.source_enrichment?.source_terms_status === "needs_review", `${record.canonical_problem_id}: programming source terms required`);
    }
    if (record.question_type === "programming" && record.sample_cases.status === "source_extracted") {
      officialProgrammingSamples += 1;
      assert(record.sample_cases.cases.length > 0, `${record.canonical_problem_id}: programming samples required`);
    }
    if (record.question_type === "programming" && record.visual_assets.status === "source_extracted") {
      officialProgrammingVisualExtracted += 1;
      assert(record.visual_assets.assets.length > 0, `${record.canonical_problem_id}: visual assets required`);
    }
    if (record.question_type === "programming" && record.programming_solution.content_origin === "ai_generated_sample_verified") {
      officialProgrammingAiSolutions += 1;
      assert(record.programming_solution.status === "needs_review", `${record.canonical_problem_id}: AI solution must remain needs_review`);
      assert(record.programming_solution.verification?.status === "sample_passed", `${record.canonical_problem_id}: AI solution sample verification required`);
      assert(/AI|生成|复核|甄别/.test(record.programming_solution.ai_generation_notice || ""), `${record.canonical_problem_id}: AI solution notice required`);
      assert(record.completeness.needs_solution_review === true, `${record.canonical_problem_id}: AI solution review flag required`);
    }
    if (record.completeness.needs_visual_asset_collection) {
      visualPending += 1;
    }
    if (record.visual_assets.status === "source_extracted") {
      visualSourceExtractedRecords += 1;
      visualSourceExtractedAssets += record.visual_assets.assets.length;
      assert(record.visual_assets.assets.length > 0, `${record.canonical_problem_id}: source-extracted visual assets required`);
      assert(
        record.visual_assets.assets.every((asset) => asset.asset_url && asset.alt_text && asset.source_url),
        `${record.canonical_problem_id}: source-extracted visual asset metadata incomplete`
      );
      assert(
        record.visual_assets.assets
          .filter((asset) => asset.extraction_method === "pymupdf_image_region_crop")
          .every((asset) => asset.source_page && asset.review_status === "needs_review" && asset.sha256),
        `${record.canonical_problem_id}: official PDF visual asset metadata incomplete`
      );
    }
    if (record.visual_assets.status === "none_found") {
      visualNoneFound += 1;
      assert(record.visual_assets.assets.length === 0, `${record.canonical_problem_id}: none_found visual assets must be empty`);
      assert(record.visual_assets.notes.some((note) => /AI|甄别|复核/.test(note)), `${record.canonical_problem_id}: none_found visual assets should mention review or AI fallback`);
    }
    if (record.question_type === "judgment" && record.choice_options.options.length === 2) {
      judgmentBinary += 1;
    }
  }

  assert(selectionPending === 0, `expected 0 selection records pending options, got ${selectionPending}`);
  assert(selectionSourceExtracted === 97, `expected 97 selection records with source-extracted options, got ${selectionSourceExtracted}`);
  assert(selectionNeedsReview === 23, `expected 23 selection records with needs-review options, got ${selectionNeedsReview}`);
  assert(details.summary.selection_source_extracted_option_count === selectionSourceExtracted, "summary source-extracted option count mismatch");
  assert(details.summary.selection_pending_option_count === selectionPending, "summary pending option count mismatch");
  assert(details.summary.selection_needs_review_option_count === selectionNeedsReview, "summary needs-review option count mismatch");
  assert(programmingPending === 0, `expected 0 programming records pending full solutions after AI enrichment, got ${programmingPending}`);
  assert(visualPending === 0, `expected 0 records pending visual asset collection after official PDF asset scan, got ${visualPending}`);
  assert(visualSourceExtractedRecords === 101, `expected 101 records with source-extracted visual assets, got ${visualSourceExtractedRecords}`);
  assert(visualSourceExtractedAssets === 219, `expected 219 source-extracted visual assets, got ${visualSourceExtractedAssets}`);
  assert(visualNoneFound === 115, `expected 115 records with no visual assets found, got ${visualNoneFound}`);
  assert(judgmentBinary === 80, `expected 80 judgment records with binary options, got ${judgmentBinary}`);
  assert(officialProgrammingStatement === 16, `expected 16 official programming statements, got ${officialProgrammingStatement}`);
  assert(officialProgrammingSamples === 16, `expected 16 official programming sample groups, got ${officialProgrammingSamples}`);
  assert(officialProgrammingVisualExtracted === 1, `expected 1 official programming visual asset group, got ${officialProgrammingVisualExtracted}`);
  assert(officialProgrammingAiSolutions === 16, `expected 16 official AI sample-verified solutions, got ${officialProgrammingAiSolutions}`);
  assert(details.summary.official_programming_source_extracted_statement_count === officialProgrammingStatement, "summary official programming statement count mismatch");
  assert(details.summary.official_programming_source_extracted_sample_count === officialProgrammingSamples, "summary official programming sample count mismatch");
  assert(details.summary.official_programming_ai_sample_verified_solution_count === officialProgrammingAiSolutions, "summary official AI solution count mismatch");
  assert(details.summary.pending_visual_asset_collection_count === visualPending, "summary pending visual asset count mismatch");
  assert(details.summary.official_pdf_visual_asset_record_count === 100, "summary official PDF visual asset record count mismatch");
  assert(details.summary.official_pdf_visual_asset_count === 218, "summary official PDF visual asset count mismatch");
  assert(details.summary.source_extracted_visual_asset_record_count === visualSourceExtractedRecords, "summary source-extracted visual asset record count mismatch");
  assert(details.summary.source_extracted_visual_asset_count === visualSourceExtractedAssets, "summary source-extracted visual asset count mismatch");
  assert(details.summary.visual_asset_none_found_count === visualNoneFound, "summary visual none-found count mismatch");

  console.log(`problem detail record count: ${details.records.length}`);
  console.log(`selection pending option count: ${selectionPending}`);
  console.log(`selection source-extracted option count: ${selectionSourceExtracted}`);
  console.log(`selection needs-review option count: ${selectionNeedsReview}`);
  console.log(`official programming source-extracted statement count: ${officialProgrammingStatement}`);
  console.log(`official programming source-extracted sample count: ${officialProgrammingSamples}`);
  console.log(`official programming AI sample-verified solution count: ${officialProgrammingAiSolutions}`);
  console.log(`source-extracted visual asset records: ${visualSourceExtractedRecords}`);
  console.log(`source-extracted visual assets: ${visualSourceExtractedAssets}`);
  console.log(`visual asset none found count: ${visualNoneFound}`);
  console.log(`programming pending solution count: ${programmingPending}`);
  console.log(`pending visual asset collection count: ${visualPending}`);
  console.log("Problem details validation passed");
}

main().catch((error) => {
  console.error(`Problem details validation failed: ${error.message}`);
  process.exitCode = 1;
});
