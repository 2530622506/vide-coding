import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const builtPath = "data/classification/wanjuanwang-gesp-cpp-problems.json";
const outputPath = "data/exports/wanjuanwang-gesp-cpp-rollback-manifest.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const built = await readJson(builtPath);
  const generatedAt = new Date().toISOString();
  const rollback = {
    schema_version: 1,
    generated_at: generatedAt,
    generator: "scripts/export-wanjuanwang-gesp-cpp-rollback.mjs",
    source_file: builtPath,
    summary: {
      canonical_problem_count: built.records.length,
      source_version_count: built.source_versions.length
    },
    canonical_problem_ids: built.records.map((record) => record.canonical_problem_id),
    rollback_steps: [
      "Delete source_versions rows where source_kind = 'wanjuanwang_exam' and canonical_problem_id is in canonical_problem_ids.",
      "Delete problem_answer_guidance rows whose canonical_problem_id is in canonical_problem_ids if they were created only for WanJuanWang ingestion.",
      "Delete problem_details rows whose canonical_problem_id is in canonical_problem_ids if they were created only for WanJuanWang ingestion.",
      "Delete classification_records rows whose canonical_problem_id is in canonical_problem_ids if they were created only for WanJuanWang ingestion."
    ]
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(rollback, null, 2)}\n`);
  console.log(`wanjuanwang rollback manifest records: ${rollback.summary.canonical_problem_count}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`WanJuanWang rollback export failed: ${error.message}`);
  process.exitCode = 1;
});
