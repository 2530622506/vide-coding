import { readFile } from "node:fs/promises";

const artifactPath = "data/wanjuanwang-ingestion/wanjuanwang-gesp-cpp-exams.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const artifact = await readJson(artifactPath);

  assert(artifact.schema_version === 1, "schema_version must be 1");
  assert(artifact.generator === "scripts/ingest-wanjuanwang-gesp-cpp.mjs", "generator mismatch");
  assert(artifact.storage_policy?.answer_policy?.includes("no login-protected answers"), "answer policy must forbid login-protected scraping");
  assert(Array.isArray(artifact.pages), "pages must be an array");
  assert(
    Array.isArray(artifact.discovery?.discovered_level_urls) || Array.isArray(artifact.discovery?.discovered_exam_urls),
    "discovery must include discovered exam URLs"
  );
  assert(typeof artifact.summary?.page_count === "number", "summary.page_count must be numeric");

  let questionCount = 0;
  let selectionCount = 0;
  let judgmentCount = 0;
  let programmingCount = 0;
  const seenQuestions = new Set();

  for (const page of artifact.pages) {
    assert(page.language === "C++", `${page.source_url}: language must be C++`);
    assert(Number.isInteger(page.level) && page.level >= 1 && page.level <= 8, `${page.source_url}: invalid level`);
    assert(Array.isArray(page.questions), `${page.source_url}: questions must be an array`);

    for (const question of page.questions) {
      questionCount += 1;
      assert(typeof question.id === "string" && question.id.startsWith("wanjuanwang:"), `${page.source_url}: invalid question id`);
      assert(!seenQuestions.has(question.id), `${page.source_url}: duplicate question id ${question.id}`);
      seenQuestions.add(question.id);
      assert(question.language === "C++", `${question.id}: language must be C++`);
      assert(question.level === page.level, `${question.id}: question level must equal page level`);
      assert(question.session === page.session, `${question.id}: question session must equal page session`);
      assert(Number.isInteger(question.question_number) && question.question_number >= 1, `${question.id}: invalid question number`);
      assert(typeof question.source?.source_id === "string" && question.source.source_id.length > 0, `${question.id}: missing source.source_id`);
      assert(typeof question.source?.content_hash === "string" && question.source.content_hash.length === 64, `${question.id}: invalid content hash`);
      assert(Array.isArray(question.blocks) && question.blocks.length > 0, `${question.id}: blocks must be non-empty`);
      assert(typeof question.stem_html === "string" && question.stem_html.length > 0, `${question.id}: stem_html must be non-empty`);

      if (question.question_type === "selection") {
        selectionCount += 1;
        assert(Array.isArray(question.choice_options) && question.choice_options.length >= 2, `${question.id}: selection must have parsed options`);
      } else if (question.question_type === "judgment") {
        judgmentCount += 1;
        assert(Array.isArray(question.choice_options) && question.choice_options.length === 2, `${question.id}: judgment must normalize to 2 options`);
      } else if (question.question_type === "programming") {
        programmingCount += 1;
        assert(Array.isArray(question.programming_sections) && question.programming_sections.length > 0, `${question.id}: programming must have sections`);
        assert(Array.isArray(question.sample_cases), `${question.id}: programming sample_cases must be an array`);
      } else {
        throw new Error(`${question.id}: unsupported question_type ${question.question_type}`);
      }
    }
  }

  assert(artifact.summary.question_count === questionCount, "summary.question_count mismatch");
  assert(artifact.summary.question_type_counts.selection === selectionCount, "summary selection count mismatch");
  assert(artifact.summary.question_type_counts.judgment === judgmentCount, "summary judgment count mismatch");
  assert(artifact.summary.question_type_counts.programming === programmingCount, "summary programming count mismatch");
  assert(selectionCount > 0, "expected at least one selection question");
  assert(judgmentCount > 0, "expected at least one judgment question");
  assert(programmingCount > 0, "expected at least one programming question");

  console.log(`wanjuanwang validated pages: ${artifact.summary.page_count}`);
  console.log(`wanjuanwang validated questions: ${questionCount}`);
  console.log(`wanjuanwang validated selection: ${selectionCount}`);
  console.log(`wanjuanwang validated judgment: ${judgmentCount}`);
  console.log(`wanjuanwang validated programming: ${programmingCount}`);
  console.log("WanJuanWang GESP C++ validation passed");
}

main().catch((error) => {
  console.error(`WanJuanWang GESP C++ validation failed: ${error.message}`);
  process.exitCode = 1;
});
