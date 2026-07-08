import { readFile } from "node:fs/promises";

const builtPath = "data/classification/wanjuanwang-gesp-cpp-problems.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const built = await readJson(builtPath);

  assert(built.schema_version === 1, "schema_version must be 1");
  assert(Array.isArray(built.records), "records must be an array");
  assert(Array.isArray(built.answer_guidance), "answer_guidance must be an array");
  assert(Array.isArray(built.problem_details), "problem_details must be an array");
  assert(Array.isArray(built.source_versions), "source_versions must be an array");

  assert(built.records.length === built.answer_guidance.length, "record/guidance count mismatch");
  assert(built.records.length === built.problem_details.length, "record/detail count mismatch");
  assert(built.records.length === built.source_versions.length, "record/source count mismatch");

  const seenIds = new Set();
  let selectionCount = 0;
  let judgmentCount = 0;
  let programmingCount = 0;

  for (const record of built.records) {
    assert(typeof record.canonical_problem_id === "string" && record.canonical_problem_id.length > 0, "canonical_problem_id is required");
    assert(!seenIds.has(record.canonical_problem_id), `duplicate canonical_problem_id ${record.canonical_problem_id}`);
    seenIds.add(record.canonical_problem_id);
    assert(record.language === "C++", `${record.canonical_problem_id}: language must be C++`);
    assert(record.effective_review_status === "needs_review", `${record.canonical_problem_id}: WanJuanWang source must remain needs_review`);
    assert(record.source_signals?.wanjuanwang_public_source === true, `${record.canonical_problem_id}: missing wanjuanwang_public_source signal`);

    if (record.question_type === "selection") {
      selectionCount += 1;
    } else if (record.question_type === "judgment") {
      judgmentCount += 1;
    } else if (record.question_type === "programming") {
      programmingCount += 1;
    } else {
      throw new Error(`${record.canonical_problem_id}: unsupported question_type ${record.question_type}`);
    }
  }

  assert(selectionCount > 0, "expected selection records");
  assert(judgmentCount > 0, "expected judgment records");
  assert(programmingCount > 0, "expected programming records");

  console.log(`wanjuanwang catalog validated records: ${built.records.length}`);
  console.log(`wanjuanwang catalog validated selection: ${selectionCount}`);
  console.log(`wanjuanwang catalog validated judgment: ${judgmentCount}`);
  console.log(`wanjuanwang catalog validated programming: ${programmingCount}`);
  console.log("WanJuanWang GESP C++ catalog validation passed");
}

main().catch((error) => {
  console.error(`WanJuanWang GESP C++ catalog validation failed: ${error.message}`);
  process.exitCode = 1;
});
