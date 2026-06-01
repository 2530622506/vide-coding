import { readFile } from "node:fs/promises";

const baseUrl = process.env.CATALOG_API_URL || "http://localhost:3001/api";
const expectedSource = process.env.CATALOG_EXPECT_SOURCE || "";
const officialDetailsPath = "data/classification/problem-details.json";
const supplementalPath = "data/classification/supplemental-cxx-problems.json";
const reviewQueuePath = "data/classification/review-queue.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert(response.ok, `${path}: expected 2xx, got ${response.status}`);
  return response.json();
}

async function main() {
  const [officialDetails, supplemental, reviewQueue] = await Promise.all([
    readFile(officialDetailsPath, "utf8").then(JSON.parse),
    readFile(supplementalPath, "utf8").then(JSON.parse),
    readFile(reviewQueuePath, "utf8").then(JSON.parse)
  ]);
  const expectedLevel5Count = officialDetails.records.filter((record) => record.level === 5).length
    + supplemental.records.filter((record) => record.level === 5).length;
  const expectedReviewItems = reviewQueue.items.length;
  const [levels, level2, level5, review] = await Promise.all([
    getJson("/catalog/levels"),
    getJson("/catalog/levels/2"),
    getJson("/catalog/levels/5"),
    getJson("/catalog/review-queue/summary")
  ]);

  assert(Array.isArray(levels.levels), "levels must be array");
  assert(levels.levels.length >= 8, "expected at least 8 levels");
  assert(level5.level === 5, "level 5 catalog expected");
  assert(level5.summary.problem_count >= expectedLevel5Count, `expected at least ${expectedLevel5Count} level 5 problems, got ${level5.summary.problem_count}`);
  assert(Array.isArray(level5.domains) && level5.domains.length >= 6, "expected level 5 domain catalog");
  const firstProblem = level5.domains.flatMap((domain) => domain.problem_types.flatMap((type) => type.problems))[0];
  assert(firstProblem?.answer_guidance?.understanding_example?.language === "zh-CN", "problem summaries must include Chinese answer guidance");
  assert(Array.isArray(firstProblem.answer_guidance.understanding_example.chinese_comments), "Chinese comments are required");
  assert(firstProblem.detail_completeness, "problem summaries must expose detail completeness");
  assert(Array.isArray(firstProblem.visual_asset_thumbnails), "problem summaries must expose visual asset thumbnails array");

  const level2Problems = level2.domains.flatMap((domain) => domain.problem_types.flatMap((type) => type.problems));
  const imageProblem = level2Problems.find((problem) => problem.id === "supplemental:luogu:b3994" || problem.title.includes("周长与面积"));
  assert(imageProblem?.visual_asset_thumbnails?.length > 0, "middle problem list summaries must include thumbnails for problems with images");
  assert(imageProblem.visual_asset_thumbnails[0].asset_url, "visual asset thumbnail must include image URL");

  const problemDetail = await getJson(`/catalog/problems/${encodeURIComponent(firstProblem.id)}`);
  assert(problemDetail.detail?.statement?.stem, "problem detail must include statement stem");
  assert(Array.isArray(problemDetail.detail?.visual_assets?.assets), "problem detail must include visual assets collection");
  assert(problemDetail.detail?.choice_options?.status, "problem detail must include choice option status");
  assert(review.summary.total_count === expectedReviewItems, `expected ${expectedReviewItems} review items, got ${review.summary.total_count}`);

  if (expectedSource) {
    assert(levels.data_source === expectedSource, `levels data_source expected ${expectedSource}, got ${levels.data_source}`);
    assert(level5.data_source === expectedSource, `level5 data_source expected ${expectedSource}, got ${level5.data_source}`);
    assert(review.data_source === expectedSource, `review data_source expected ${expectedSource}, got ${review.data_source}`);
  }

  console.log(`catalog api data source: ${level5.data_source}`);
  console.log(`catalog api level count: ${levels.levels.length}`);
  console.log(`catalog api C++ level 5 problem count: ${level5.summary.problem_count} (seed baseline ${expectedLevel5Count})`);
  console.log(`catalog api first problem detail: ${problemDetail.detail.statement.status}/${problemDetail.detail.choice_options.status}`);
  console.log(`catalog api review queue count: ${review.summary.total_count}`);
  console.log("Catalog API validation passed");
}

main().catch((error) => {
  console.error(`Catalog API validation failed: ${error.message}`);
  process.exitCode = 1;
});
