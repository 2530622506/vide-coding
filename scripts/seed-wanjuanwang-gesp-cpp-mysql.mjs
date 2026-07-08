import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { mysqlConfig } from "./mysql-config.mjs";

const inputPath = "data/classification/wanjuanwang-gesp-cpp-problems.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function json(value) {
  return JSON.stringify(value);
}

async function main() {
  const built = await readJson(inputPath);
  const guidanceById = new Map(built.answer_guidance.map((record) => [record.canonical_problem_id, record]));
  const detailById = new Map(built.problem_details.map((record) => [record.canonical_problem_id, record]));
  const sourceById = new Map();

  for (const source of built.source_versions) {
    if (!sourceById.has(source.canonical_problem_id)) {
      sourceById.set(source.canonical_problem_id, []);
    }
    sourceById.get(source.canonical_problem_id).push(source);
  }

  const connection = await mysql.createConnection({
    ...mysqlConfig(),
    multipleStatements: false
  });

  try {
    await connection.beginTransaction();

    for (const record of built.records) {
      const guidance = guidanceById.get(record.canonical_problem_id);
      const detail = detailById.get(record.canonical_problem_id);
      const sources = sourceById.get(record.canonical_problem_id) || [];

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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
        ON DUPLICATE KEY UPDATE
          official_problem_id = VALUES(official_problem_id),
          session_code = VALUES(session_code),
          language = VALUES(language),
          level_no = VALUES(level_no),
          question_type = VALUES(question_type),
          question_number = VALUES(question_number),
          title = VALUES(title),
          effective_review_status = VALUES(effective_review_status),
          record_json = VALUES(record_json)`,
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

      if (guidance) {
        await connection.execute(
          `INSERT INTO problem_answer_guidance (
            canonical_problem_id,
            answer_status,
            answer_text,
            answer_source,
            confidence,
            guidance_json
          ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))
          ON DUPLICATE KEY UPDATE
            answer_status = VALUES(answer_status),
            answer_text = VALUES(answer_text),
            answer_source = VALUES(answer_source),
            confidence = VALUES(confidence),
            guidance_json = VALUES(guidance_json)`,
          [
            record.canonical_problem_id,
            guidance.reference_answer.status,
            guidance.reference_answer.answer,
            guidance.reference_answer.source,
            guidance.reference_answer.confidence,
            json(guidance)
          ]
        );
      }

      if (detail) {
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
          ON DUPLICATE KEY UPDATE
            statement_status = VALUES(statement_status),
            option_status = VALUES(option_status),
            option_count = VALUES(option_count),
            visual_asset_status = VALUES(visual_asset_status),
            visual_asset_count = VALUES(visual_asset_count),
            programming_solution_status = VALUES(programming_solution_status),
            detail_json = VALUES(detail_json)`,
          [
            record.canonical_problem_id,
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

      await connection.execute(
        "DELETE FROM source_versions WHERE canonical_problem_id = ? AND source_kind = ?",
        [record.canonical_problem_id, "wanjuanwang_exam"]
      );

      for (const source of sources) {
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
            source.source_kind,
            source.source_id,
            source.source_url,
            json(source)
          ]
        );
      }
    }

    await connection.commit();

    console.log(`seeded wanjuanwang classification records: ${built.records.length}`);
    console.log(`seeded wanjuanwang answer guidance: ${built.answer_guidance.length}`);
    console.log(`seeded wanjuanwang problem details: ${built.problem_details.length}`);
    console.log(`seeded wanjuanwang source versions: ${built.source_versions.length}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`WanJuanWang GESP C++ MySQL seed failed: ${error.message}`);
  process.exitCode = 1;
});
