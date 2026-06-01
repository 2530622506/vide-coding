import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { mysqlConfig } from "./mysql-config.mjs";

const schemaPath = "infra/mysql/schema.sql";
const modelPath = "data/classification/conflict-confidence-model.json";
const reviewQueuePath = "data/classification/review-workqueue-plan.json";
const answerGuidancePath = "data/classification/problem-answer-guidance.json";
const problemDetailsPath = "data/classification/problem-details.json";
const supplementalPath = "data/classification/supplemental-cxx-problems.json";
const canonicalPath = "data/canonical-problems/canonical-problem-alignment.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function json(value) {
  return JSON.stringify(value);
}

async function applySchema(connection) {
  const schema = await readFile(schemaPath, "utf8");
  const statements = schema
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await connection.query(statement);
  }
}

async function main() {
  const [model, reviewQueue, answerGuidance, problemDetails, supplemental, canonical] = await Promise.all([
    readJson(modelPath),
    readJson(reviewQueuePath),
    readJson(answerGuidancePath),
    readJson(problemDetailsPath),
    readJson(supplementalPath),
    readJson(canonicalPath)
  ]);
  const allRecords = [...model.records, ...supplemental.records];
  const allGuidance = [...answerGuidance.records, ...supplemental.answer_guidance];
  const allDetails = [...problemDetails.records, ...supplemental.problem_details];
  const canonicalById = new Map(canonical.canonical_problems.map((problem) => [problem.id, problem]));
  const guidanceById = new Map(allGuidance.map((record) => [record.canonical_problem_id, record]));
  const detailsById = new Map(allDetails.map((record) => [record.canonical_problem_id, record]));
  const supplementalSourceVersionsById = new Map();
  for (const source of supplemental.source_versions) {
    if (!supplementalSourceVersionsById.has(source.canonical_problem_id)) {
      supplementalSourceVersionsById.set(source.canonical_problem_id, []);
    }
    supplementalSourceVersionsById.get(source.canonical_problem_id).push(source);
  }
  const connection = await mysql.createConnection({
    ...mysqlConfig(),
    multipleStatements: false
  });

  try {
    await applySchema(connection);
    await connection.beginTransaction();
    await connection.query("DELETE FROM source_versions");
    await connection.query("DELETE FROM problem_details");
    await connection.query("DELETE FROM problem_answer_guidance");
    await connection.query("DELETE FROM review_queue_items");
    await connection.query("DELETE FROM classification_records");
    await connection.query("DELETE FROM catalog_metadata");

    await connection.execute(
      "INSERT INTO catalog_metadata (meta_key, meta_value) VALUES (?, CAST(? AS JSON)), (?, CAST(? AS JSON)), (?, CAST(? AS JSON)), (?, CAST(? AS JSON))",
      [
        "conflict_confidence_generated_at",
        json({ generated_at: model.generated_at }),
        "conflict_confidence_summary",
        json(model.summary),
        "review_queue_summary",
        json(reviewQueue.summary),
        "supplemental_cxx_summary",
        json(supplemental.summary)
      ]
    );

    for (const record of allRecords) {
      await connection.execute(
        `INSERT INTO classification_records (
          canonical_problem_id,
          official_problem_id,
          session_code,
          language,
          level_no,
          question_type,
          question_number,
          title,
          effective_review_status,
          record_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
        [
          record.canonical_problem_id,
          record.official_problem_id,
          record.session,
          record.language,
          record.level,
          record.question_type,
          record.question_number,
          record.title,
          record.effective_review_status,
          json(record)
        ]
      );

      const canonicalProblem = canonicalById.get(record.canonical_problem_id);
      const sourceVersions = canonicalProblem?.source_versions || supplementalSourceVersionsById.get(record.canonical_problem_id) || [];
      for (const source of sourceVersions) {
        await connection.execute(
          `INSERT INTO source_versions (
            canonical_problem_id,
            source_kind,
            source_id,
            source_url,
            source_json
          ) VALUES (?, ?, ?, ?, CAST(? AS JSON))`,
          [
            record.canonical_problem_id,
            source.source_kind || null,
            source.source_id || null,
            source.source_url || null,
            json(source)
          ]
        );
      }
    }

    for (const guidance of guidanceById.values()) {
      await connection.execute(
        `INSERT INTO problem_answer_guidance (
          canonical_problem_id,
          answer_status,
          answer_text,
          answer_source,
          confidence,
          guidance_json
        ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))`,
        [
          guidance.canonical_problem_id,
          guidance.reference_answer.status,
          guidance.reference_answer.answer,
          guidance.reference_answer.source,
          guidance.reference_answer.confidence,
          json(guidance)
        ]
      );
    }

    for (const detail of detailsById.values()) {
      await connection.execute(
        `INSERT INTO problem_details (
          canonical_problem_id,
          statement_status,
          option_status,
          option_count,
          visual_asset_status,
          visual_asset_count,
          programming_solution_status,
          detail_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
        [
          detail.canonical_problem_id,
          detail.statement.status,
          detail.choice_options.status,
          detail.choice_options.options.length,
          detail.visual_assets.status,
          detail.visual_assets.assets.length,
          detail.programming_solution.status,
          json(detail)
        ]
      );
    }

    for (const item of reviewQueue.items) {
      await connection.execute(
        `INSERT INTO review_queue_items (
          id,
          item_type,
          priority,
          status,
          canonical_problem_id,
          title,
          reason,
          final_confidence,
          item_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
        [
          item.id,
          item.type,
          item.priority,
          item.status,
          item.canonical_problem_id || null,
          item.title,
          item.reason,
          item.final_confidence,
          json(item)
        ]
      );
    }

    await connection.commit();

    console.log(`seeded official classification records: ${model.records.length}`);
    console.log(`seeded supplemental classification records: ${supplemental.records.length}`);
    console.log(`seeded classification records: ${allRecords.length}`);
    console.log(`seeded answer guidance records: ${guidanceById.size}`);
    console.log(`seeded problem detail records: ${detailsById.size}`);
    console.log(`seeded review queue items: ${reviewQueue.items.length}`);
    console.log(`seeded source versions: ${canonical.canonical_problems.reduce((sum, problem) => sum + problem.source_versions.length, 0) + supplemental.source_versions.length}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`MySQL catalog seed failed: ${error.message}`);
  process.exitCode = 1;
});
