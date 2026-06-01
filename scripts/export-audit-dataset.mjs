import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const outputPath = "data/exports/classification-audit-export.json";
const rollbackPath = "data/exports/classification-rollback-manifest.json";
const snapshotPath = "data/exports/classification-source-snapshot.json";

const sourceFiles = {
  conflictConfidence: "data/classification/conflict-confidence-model.json",
  canonicalAlignment: "data/canonical-problems/canonical-problem-alignment.json",
  reviewWorkqueue: "data/classification/review-workqueue-plan.json",
  problemDetails: "data/classification/problem-details.json",
  answerGuidance: "data/classification/problem-answer-guidance.json",
  supplemental: "data/classification/supplemental-cxx-problems.json"
};

async function readText(path) {
  return readFile(path, "utf8");
}

async function readJson(path) {
  return JSON.parse(await readText(path));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function fileManifest() {
  const entries = [];
  for (const [role, path] of Object.entries(sourceFiles)) {
    const content = await readText(path);
    entries.push({
      role,
      path,
      sha256: sha256(content),
      bytes: Buffer.byteLength(content)
    });
  }
  return entries;
}

async function fileSnapshots() {
  const entries = [];
  for (const [role, path] of Object.entries(sourceFiles)) {
    const content = await readText(path);
    entries.push({
      role,
      path,
      sha256: sha256(content),
      bytes: Buffer.byteLength(content),
      content
    });
  }
  return entries;
}

function compactTag(tag) {
  return {
    kind: tag.kind,
    value: tag.value,
    label: tag.label,
    source: tag.source || null,
    evidence: tag.evidence || null,
    confidence: tag.confidence ?? null,
    raw_confidence: tag.raw_confidence ?? null,
    final_confidence: tag.final_confidence ?? null,
    syllabus_fit: tag.syllabus_fit || null,
    review_status: tag.review_status || tag.effective_review_status || null,
    effective_review_status: tag.effective_review_status || null,
    confidence_breakdown: tag.confidence_breakdown || [],
    conflict_reasons: tag.conflict_reasons || [],
    review_reason: tag.review_reason || []
  };
}

function compactRecord(record, sourceVersions, detail, guidance) {
  const tags = [
    ...record.resolved_algorithm_domains,
    ...record.resolved_problem_type_tags,
    ...record.resolved_knowledge_point_tags
  ].map(compactTag);

  return {
    canonical_problem_id: record.canonical_problem_id,
    official_problem_id: record.official_problem_id,
    session: record.session,
    language: record.language,
    level: record.level,
    question_type: record.question_type,
    question_number: record.question_number,
    title: record.title,
    effective_review_status: record.effective_review_status,
    review_queue_refs: record.review_queue_refs || [],
    source_conflict_refs: record.source_conflict_refs || [],
    review_decisions: record.review_decisions || [],
    tags,
    source_versions: sourceVersions || [],
    detail_completeness: detail?.completeness || null,
    answer_status: guidance?.reference_answer?.status || null,
    answer_review_status: guidance?.reference_answer?.review_status || null
  };
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = String(keyFn(item));
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

async function main() {
  const [
    manifest,
    model,
    canonical,
    reviewWorkqueue,
    problemDetails,
    answerGuidance,
    supplemental
  ] = await Promise.all([
    fileManifest(),
    readJson(sourceFiles.conflictConfidence),
    readJson(sourceFiles.canonicalAlignment),
    readJson(sourceFiles.reviewWorkqueue),
    readJson(sourceFiles.problemDetails),
    readJson(sourceFiles.answerGuidance),
    readJson(sourceFiles.supplemental)
  ]);

  const sourceVersionsByProblem = new Map();
  for (const problem of canonical.canonical_problems) {
    sourceVersionsByProblem.set(problem.id, problem.source_versions || []);
  }
  for (const source of supplemental.source_versions) {
    if (!sourceVersionsByProblem.has(source.canonical_problem_id)) {
      sourceVersionsByProblem.set(source.canonical_problem_id, []);
    }
    sourceVersionsByProblem.get(source.canonical_problem_id).push(source);
  }

  const detailByProblem = new Map([
    ...problemDetails.records.map((record) => [record.canonical_problem_id, record]),
    ...supplemental.problem_details.map((record) => [record.canonical_problem_id, record])
  ]);
  const guidanceByProblem = new Map([
    ...answerGuidance.records.map((record) => [record.canonical_problem_id, record]),
    ...supplemental.answer_guidance.map((record) => [record.canonical_problem_id, record])
  ]);
  const records = [...model.records, ...supplemental.records];
  const canonicalProblems = records.map((record) => compactRecord(
    record,
    sourceVersionsByProblem.get(record.canonical_problem_id),
    detailByProblem.get(record.canonical_problem_id),
    guidanceByProblem.get(record.canonical_problem_id)
  ));
  const tags = canonicalProblems.flatMap((problem) => problem.tags.map((tag) => ({
    canonical_problem_id: problem.canonical_problem_id,
    ...tag
  })));
  const sourceMappings = canonicalProblems.flatMap((problem) => problem.source_versions.map((source) => ({
    canonical_problem_id: problem.canonical_problem_id,
    source_kind: source.source_kind || null,
    source_id: source.source_id || null,
    source_url: source.source_url || source.url || null,
    review_status: source.review_status || null,
    source
  })));
  const reviewDecisions = canonicalProblems.flatMap((problem) => problem.review_decisions.map((decision) => ({
    canonical_problem_id: problem.canonical_problem_id,
    ...decision
  })));

  const generatedAt = new Date().toISOString();
  const auditExport = {
    schema_version: 1,
    generated_at: generatedAt,
    generator: "scripts/export-audit-dataset.mjs",
    source_manifest: manifest,
    summary: {
      canonical_problem_count: canonicalProblems.length,
      tag_count: tags.length,
      source_mapping_count: sourceMappings.length,
      review_workqueue_count: reviewWorkqueue.items.length,
      review_decision_count: reviewDecisions.length,
      by_level: countBy(canonicalProblems, (problem) => problem.level),
      by_review_status: countBy(canonicalProblems, (problem) => problem.effective_review_status),
      tag_by_review_status: countBy(tags, (tag) => tag.review_status || "unknown")
    },
    review_event_history: {
      source: "classification_records.review_decisions plus MySQL review_events when exported from database",
      note: "This file is generated from JSON artifacts; live MySQL review_events should be exported before production backup when available.",
      decisions: reviewDecisions
    },
    review_workqueue: {
      summary: reviewWorkqueue.summary,
      next_batch: reviewWorkqueue.next_batch || [],
      items: reviewWorkqueue.items
    },
    canonical_problems: canonicalProblems,
    tags,
    source_mappings: sourceMappings
  };
  const rollbackManifest = {
    schema_version: 1,
    generated_at: generatedAt,
    generator: "scripts/export-audit-dataset.mjs",
    rollback_scope: "JSON source artifacts used to generate the audit export",
    source_manifest: manifest,
    source_snapshot_file: snapshotPath,
    rollback_steps: [
      "Stop API and background ingestion jobs before rollback.",
      "Run npm run restore:audit -- --dry-run to verify the source snapshot.",
      "Run npm run restore:audit -- --apply only when intentionally restoring the listed source artifacts.",
      "Run npm run db:seed if MySQL is used.",
      "Run npm run validate:audit-export and npm run validate:review-workqueue.",
      "Run npm run build:api and npm run build:web before reopening the catalog UI."
    ],
    export_file: outputPath
  };
  const sourceSnapshot = {
    schema_version: 1,
    generated_at: generatedAt,
    generator: "scripts/export-audit-dataset.mjs",
    source_manifest: manifest,
    files: await fileSnapshots()
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(auditExport, null, 2)}\n`);
  await writeFile(rollbackPath, `${JSON.stringify(rollbackManifest, null, 2)}\n`);
  await writeFile(snapshotPath, `${JSON.stringify(sourceSnapshot, null, 2)}\n`);

  console.log(`audit export canonical problems: ${auditExport.summary.canonical_problem_count}`);
  console.log(`audit export tags: ${auditExport.summary.tag_count}`);
  console.log(`audit export source mappings: ${auditExport.summary.source_mapping_count}`);
  console.log(`audit export review workqueue items: ${auditExport.summary.review_workqueue_count}`);
  console.log(`wrote ${outputPath}`);
  console.log(`wrote ${rollbackPath}`);
  console.log(`wrote ${snapshotPath}`);
}

main().catch((error) => {
  console.error(`Audit export failed: ${error.message}`);
  process.exitCode = 1;
});
