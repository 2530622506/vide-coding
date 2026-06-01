import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const exportPath = "data/exports/classification-audit-export.json";
const rollbackPath = "data/exports/classification-rollback-manifest.json";
const snapshotPath = "data/exports/classification-source-snapshot.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function sha256File(path) {
  const content = await readFile(path);
  return createHash("sha256").update(content).digest("hex");
}

async function validateManifest(manifest) {
  assert(Array.isArray(manifest) && manifest.length >= 6, "source manifest must include source files");
  for (const entry of manifest) {
    assert(entry.path && entry.sha256, `${entry.role}: path and sha256 required`);
    const actual = await sha256File(entry.path);
    assert(actual === entry.sha256, `${entry.path}: sha256 mismatch`);
  }
}

async function main() {
  const [auditExport, rollback] = await Promise.all([
    readJson(exportPath),
    readJson(rollbackPath)
  ]);
  const snapshot = await readJson(snapshotPath);

  assert(auditExport.schema_version === 1, "audit export schema_version must be 1");
  assert(rollback.schema_version === 1, "rollback manifest schema_version must be 1");
  assert(snapshot.schema_version === 1, "source snapshot schema_version must be 1");
  await validateManifest(auditExport.source_manifest);
  await validateManifest(rollback.source_manifest);
  await validateManifest(snapshot.source_manifest);

  assert(auditExport.summary.canonical_problem_count === auditExport.canonical_problems.length, "canonical problem count mismatch");
  assert(auditExport.summary.tag_count === auditExport.tags.length, "tag count mismatch");
  assert(auditExport.summary.source_mapping_count === auditExport.source_mappings.length, "source mapping count mismatch");
  assert(auditExport.summary.review_workqueue_count === auditExport.review_workqueue.items.length, "review workqueue count mismatch");
  assert(auditExport.canonical_problems.length >= 400, "expected official and supplemental C++ problems");
  assert(auditExport.tags.every((tag) => tag.canonical_problem_id && tag.kind && tag.value && tag.review_status), "all tags need identity and review status");
  assert(auditExport.tags.every((tag) => tag.evidence !== undefined), "all tags need evidence field");
  assert(auditExport.source_mappings.every((mapping) => mapping.canonical_problem_id), "source mappings need canonical_problem_id");
  assert(Array.isArray(auditExport.review_event_history.decisions), "review decisions must be array");
  assert(rollback.export_file === exportPath, "rollback export_file mismatch");
  assert(rollback.source_snapshot_file === snapshotPath, "rollback source_snapshot_file mismatch");
  assert(Array.isArray(rollback.rollback_steps) && rollback.rollback_steps.length >= 4, "rollback steps required");
  assert(Array.isArray(snapshot.files) && snapshot.files.length === rollback.source_manifest.length, "source snapshot files mismatch");
  for (const file of snapshot.files) {
    assert(typeof file.content === "string" && file.content.length > 0, `${file.path}: snapshot content required`);
    const actual = createHash("sha256").update(file.content).digest("hex");
    assert(actual === file.sha256, `${file.path}: snapshot content sha256 mismatch`);
  }

  console.log(`audit export canonical problems: ${auditExport.summary.canonical_problem_count}`);
  console.log(`audit export tags: ${auditExport.summary.tag_count}`);
  console.log(`audit export source mappings: ${auditExport.summary.source_mapping_count}`);
  console.log(`audit export review workqueue items: ${auditExport.summary.review_workqueue_count}`);
  console.log("Audit export validation passed");
}

main().catch((error) => {
  console.error(`Audit export validation failed: ${error.message}`);
  process.exitCode = 1;
});
