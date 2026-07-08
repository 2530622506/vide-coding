import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const catalogPath = "data/classification/wanjuanwang-gesp-cpp-problems.json";
const outputPath = "data/exports/wanjuanwang-gesp-cpp-answer-coverage.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const catalog = await readJson(catalogPath);
  const detailById = new Map(catalog.problem_details.map((record) => [record.canonical_problem_id, record]));
  const guidanceById = new Map(catalog.answer_guidance.map((record) => [record.canonical_problem_id, record]));

  const byType = {
    selection: 0,
    judgment: 0,
    programming: 0
  };
  const coveredByType = {
    selection: 0,
    judgment: 0,
    programming: 0
  };

  for (const record of catalog.records) {
    byType[record.question_type] = (byType[record.question_type] || 0) + 1;
    const guidance = guidanceById.get(record.canonical_problem_id);
    const detail = detailById.get(record.canonical_problem_id);
    const hasGeneratedChoiceOrJudgmentAnswer = record.question_type !== "programming"
      && guidance?.reference_answer?.source === "generated_local_cpp"
      && typeof guidance?.reference_answer?.answer === "string"
      && guidance.reference_answer.answer.trim().length > 0;
    const hasProgrammingSolution = record.question_type === "programming"
      && typeof detail?.programming_solution?.code === "string"
      && detail.programming_solution.code.trim().length > 0;

    if (hasGeneratedChoiceOrJudgmentAnswer || hasProgrammingSolution) {
      coveredByType[record.question_type] = (coveredByType[record.question_type] || 0) + 1;
    }
  }

  const coveredCount = Object.values(coveredByType).reduce((sum, value) => sum + value, 0);

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/export-wanjuanwang-gesp-cpp-answer-coverage.mjs",
    inputs: {
      catalog: catalogPath
    },
    summary: {
      total_questions: catalog.records.length,
      generated_answer_count: coveredCount,
      generated_answer_rate: Number((coveredCount / catalog.records.length).toFixed(4)),
      by_question_type: {
        selection: {
          total: byType.selection,
          generated: coveredByType.selection,
          rate: Number((coveredByType.selection / Math.max(1, byType.selection)).toFixed(4))
        },
        judgment: {
          total: byType.judgment,
          generated: coveredByType.judgment,
          rate: Number((coveredByType.judgment / Math.max(1, byType.judgment)).toFixed(4))
        },
        programming: {
          total: byType.programming,
          generated: coveredByType.programming,
          rate: Number((coveredByType.programming / Math.max(1, byType.programming)).toFixed(4))
        }
      }
    }
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wanjuanwang answer coverage generated: ${output.summary.generated_answer_count}`);
  console.log(`wanjuanwang answer coverage rate: ${output.summary.generated_answer_rate}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`WanJuanWang answer coverage export failed: ${error.message}`);
  process.exitCode = 1;
});
