import { access, readFile } from "node:fs/promises";

const assetsPath = "data/problem-ingestion/official-pdf-visual-assets.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const data = await readJson(assetsPath);
  assert(data.schema_version === 1, "visual asset schema_version must be 1");
  assert(data.summary.document_count === 8, `expected 8 official C++ PDFs, got ${data.summary.document_count}`);
  assert(data.summary.failure_count === 0, `expected 0 visual asset extraction failures, got ${data.summary.failure_count}`);
  assert(data.summary.asset_count > 0, "expected at least one official PDF visual asset");
  assert(data.summary.problem_with_assets_count > 0, "expected at least one problem with visual assets");

  const assets = data.documents.flatMap((document) => document.assets);
  assert(assets.length === data.summary.asset_count, "summary asset count mismatch");
  for (const asset of assets) {
    assert(asset.official_problem_id, "official_problem_id required");
    assert(asset.asset_url?.startsWith("/gesp-assets/official-pdf/"), `${asset.id}: public asset URL required`);
    assert(asset.local_path?.startsWith("apps/web/public/gesp-assets/official-pdf/"), `${asset.id}: local asset path required`);
    assert(asset.sha256 && asset.sha256.length === 64, `${asset.id}: sha256 required`);
    assert(asset.review_status === "needs_review", `${asset.id}: review_status must be needs_review`);
    assert(asset.source_status === "source_extracted", `${asset.id}: source_status must be source_extracted`);
    await access(asset.local_path);
  }

  console.log(`official PDF visual asset count: ${assets.length}`);
  console.log(`problem with visual assets count: ${data.summary.problem_with_assets_count}`);
  console.log("Official PDF visual assets validation passed");
}

main().catch((error) => {
  console.error(`Official PDF visual assets validation failed: ${error.message}`);
  process.exitCode = 1;
});
