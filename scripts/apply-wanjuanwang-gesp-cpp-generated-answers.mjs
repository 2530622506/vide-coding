import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { mysqlConfig } from "./mysql-config.mjs";

const generatedAnswersPath = "data/classification/wanjuanwang-gesp-cpp-generated-answers.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const generated = await readJson(generatedAnswersPath);
  const connection = await mysql.createConnection({
    ...mysqlConfig(),
    multipleStatements: false
  });

  try {
    await connection.beginTransaction();

    for (const record of generated.records) {
      const [rows] = await connection.query(
        "SELECT guidance_json FROM problem_answer_guidance WHERE canonical_problem_id = ? FOR UPDATE",
        [record.canonical_problem_id]
      );
      const current = rows[0]?.guidance_json;
      if (!current) {
        continue;
      }
      const guidance = typeof current === "string" ? JSON.parse(current) : current;
      guidance.content_origin = "ai_generated_learning_aid";
      guidance.ai_generation_notice = "本地编译/执行生成的候选答案，仅作学习参考，仍需人工复核，不能视为官方答案。";
      guidance.reference_answer.status = "needs_review";
      guidance.reference_answer.answer = record.generated_answer;
      guidance.reference_answer.source = "generated_local_cpp";
      guidance.reference_answer.evidence = record.explanation;
      guidance.reference_answer.confidence = record.generation_method === "local_cpp_execution" ? 0.92 : 0.7;
      guidance.reference_answer.review_status = "needs_review";
      guidance.review_notes = [
        "万卷网为第三方公开题源，默认 needs_review。",
        "答案由本地编译/执行候选生成，默认 needs_review。"
      ];

      await connection.execute(
        `UPDATE problem_answer_guidance
         SET answer_status = ?, answer_text = ?, answer_source = ?, confidence = ?, guidance_json = CAST(? AS JSON)
         WHERE canonical_problem_id = ?`,
        [
          guidance.reference_answer.status,
          guidance.reference_answer.answer,
          guidance.reference_answer.source,
          guidance.reference_answer.confidence,
          JSON.stringify(guidance),
          record.canonical_problem_id
        ]
      );
    }

    await connection.commit();
    console.log(`applied wanjuanwang generated answers: ${generated.records.length}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`Apply WanJuanWang generated answers failed: ${error.message}`);
  process.exitCode = 1;
});
