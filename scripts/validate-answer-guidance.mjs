import { readFile } from "node:fs/promises";

const guidancePath = "data/classification/problem-answer-guidance.json";
const modelPath = "data/classification/conflict-confidence-model.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const guidance = await readJson(guidancePath);
  const model = await readJson(modelPath);
  const modelIds = new Set(model.records.map((record) => record.canonical_problem_id));

  assert(guidance.schema_version === 1, "answer guidance schema_version must be 1");
  assert(guidance.policy?.chinese_comment_required === true, "Chinese comments must be required");
  assert(guidance.policy?.no_unverified_answer_as_confirmed === true, "unverified answers must not be confirmed");
  assert(Array.isArray(guidance.records), "records must be array");
  assert(guidance.records.length === model.records.length, "guidance record count must match conflict model");

  let confirmed = 0;
  let referenceLink = 0;
  let needsReview = 0;
  let aiSampleVerified = 0;
  let level5Count = 0;
  let level5Confirmed = 0;

  for (const record of guidance.records) {
    assert(modelIds.has(record.canonical_problem_id), `${record.canonical_problem_id}: unknown model record`);
    assert(record.reference_answer && typeof record.reference_answer === "object", `${record.canonical_problem_id}: reference_answer required`);
    assert(["confirmed", "reference_link", "needs_review"].includes(record.reference_answer.status), `${record.canonical_problem_id}: invalid answer status`);
    assert(record.understanding_example?.language === "zh-CN", `${record.canonical_problem_id}: Chinese understanding example required`);
    assert(typeof record.understanding_example.summary === "string" && record.understanding_example.summary.length > 0, `${record.canonical_problem_id}: understanding summary required`);
    assert(Array.isArray(record.understanding_example.steps) && record.understanding_example.steps.length >= 3, `${record.canonical_problem_id}: understanding steps required`);
    assert(Array.isArray(record.understanding_example.chinese_comments) && record.understanding_example.chinese_comments.length >= 2, `${record.canonical_problem_id}: Chinese comments required`);
    assert(Array.isArray(record.review_notes) && record.review_notes.length > 0, `${record.canonical_problem_id}: review notes required`);

    if (record.reference_answer.status === "confirmed") {
      confirmed += 1;
      assert(/[A-D]/.test(record.reference_answer.answer), `${record.canonical_problem_id}: confirmed choice answer must be A-D`);
      assert(record.reference_answer.source === "official_pdf_answer_table", `${record.canonical_problem_id}: confirmed answer must come from official answer table`);
    } else if (record.reference_answer.status === "reference_link") {
      referenceLink += 1;
      assert(record.question_type === "programming", `${record.canonical_problem_id}: reference_link answer should be programming only`);
    } else {
      needsReview += 1;
      if (record.reference_answer.source === "ai_generated_sample_verified") {
        aiSampleVerified += 1;
        assert(record.question_type === "programming", `${record.canonical_problem_id}: AI sample-verified answer should be programming only`);
        assert(/AI|生成|复核/.test(record.reference_answer.answer || record.reference_answer.evidence || ""), `${record.canonical_problem_id}: AI answer notice required`);
      }
    }

    if (record.level === 5) {
      level5Count += 1;
      if (record.reference_answer.status === "confirmed") {
        level5Confirmed += 1;
      }
    }
  }

  assert(level5Count === 27, `expected 27 C++ level 5 answer records, got ${level5Count}`);
  assert(confirmed === 120, `expected 120 confirmed selection answers, got ${confirmed}`);
  assert(referenceLink === 0, `expected 0 programming reference-link answers after AI enrichment, got ${referenceLink}`);
  assert(needsReview === 96, `expected 96 needs-review answers after AI enrichment, got ${needsReview}`);
  assert(aiSampleVerified === 16, `expected 16 AI sample-verified programming answers, got ${aiSampleVerified}`);
  assert(level5Confirmed === 15, `expected 15 level 5 confirmed selection answers, got ${level5Confirmed}`);
  assert(guidance.summary.record_count === guidance.records.length, "summary record count mismatch");
  assert(guidance.summary.confirmed_answer_count === confirmed, "summary confirmed count mismatch");
  assert(guidance.summary.reference_link_answer_count === referenceLink, "summary reference link count mismatch");
  assert(guidance.summary.needs_review_answer_count === needsReview, "summary needs review count mismatch");
  assert(guidance.summary.ai_sample_verified_programming_answer_count === aiSampleVerified, "summary AI sample-verified count mismatch");

  console.log(`answer guidance record count: ${guidance.records.length}`);
  console.log(`confirmed answer count: ${confirmed}`);
  console.log(`reference-link answer count: ${referenceLink}`);
  console.log(`needs-review answer count: ${needsReview}`);
  console.log(`AI sample-verified programming answer count: ${aiSampleVerified}`);
  console.log(`C++ level 5 confirmed answer count: ${level5Confirmed}`);
  console.log("Answer guidance validation passed");
}

main().catch((error) => {
  console.error(`Answer guidance validation failed: ${error.message}`);
  process.exitCode = 1;
});
