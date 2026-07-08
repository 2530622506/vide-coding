import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const ocrPath = "data/classification/wanjuanwang-gesp-cpp-image-option-ocr.json";
const outputPath = "data/exports/wanjuanwang-gesp-cpp-image-option-review.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const ocr = await readJson(ocrPath);
  const questions = ocr.records.map((record) => ({
    canonical_problem_id: record.canonical_problem_id,
    title: record.title,
    option_count: record.options.length,
    ocr_success_count: record.options.filter((option) => option.source === "ocr" && option.text).length,
    ocr_error_count: record.options.filter((option) => option.error).length,
    options: record.options
  }));

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/export-wanjuanwang-gesp-cpp-image-option-review.mjs",
    input: ocrPath,
    summary: {
      question_count: questions.length,
      question_with_errors_count: questions.filter((question) => question.ocr_error_count > 0).length,
      total_ocr_error_count: questions.reduce((sum, question) => sum + question.ocr_error_count, 0)
    },
    questions
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wanjuanwang image-option review questions: ${output.summary.question_count}`);
  console.log(`wanjuanwang image-option review errors: ${output.summary.total_ocr_error_count}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`WanJuanWang image-option review export failed: ${error.message}`);
  process.exitCode = 1;
});
