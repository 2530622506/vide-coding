import { readFile } from "node:fs/promises";

const modelPath = "data/classification/conflict-confidence-model.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const model = JSON.parse(await readFile(modelPath, "utf8"));
  const officialProgramming = model.records.filter((record) => record.question_type === "programming" && /^canonical:2026-03:c\+\+/.test(record.canonical_problem_id));
  assert(officialProgramming.length === 16, `expected 16 official programming records, got ${officialProgramming.length}`);

  const byId = new Map(officialProgramming.map((record) => [record.canonical_problem_id, record]));
  for (const record of officialProgramming) {
    assert(record.classification_refinement?.source === "source_extracted_statement_ai_solution_review", `${record.canonical_problem_id}: refinement source required`);
    assert(record.effective_review_status === "needs_review", `${record.canonical_problem_id}: refined official programming record must remain needs_review`);
    const tags = [
      ...record.resolved_algorithm_domains,
      ...record.resolved_problem_type_tags,
      ...record.resolved_knowledge_point_tags
    ];
    assert(tags.length >= 4, `${record.canonical_problem_id}: refined tags required`);
    for (const tag of tags) {
      assert(tag.source === "source_extracted_statement_ai_solution_review", `${record.canonical_problem_id}: tag source required`);
      assert(tag.effective_review_status === "needs_review", `${record.canonical_problem_id}: tag must remain needs_review`);
      assert(tag.evidence?.ai_solution_verification === "sample_passed", `${record.canonical_problem_id}: sample-passed evidence required`);
    }
  }

  const level5FiniteDecimal = byId.get("canonical:2026-03:c++:level-5:programming:01");
  const level5FindNumber = byId.get("canonical:2026-03:c++:level-5:programming:02");
  const level6Choose = byId.get("canonical:2026-03:c++:level-6:programming:01");
  const level8Message = byId.get("canonical:2026-03:c++:level-8:programming:01");

  assert(level5FiniteDecimal.resolved_algorithm_domains.some((tag) => tag.value === "number_theory"), "finite decimal should be number theory");
  assert(level5FindNumber.resolved_algorithm_domains.some((tag) => tag.value === "binary_search"), "find number should include binary search");
  assert(level5FindNumber.resolved_knowledge_point_tags.some((tag) => tag.value === "binary_search_lookup"), "find number should include binary search lookup");
  assert(level6Choose.resolved_algorithm_domains.some((tag) => tag.value === "dynamic_programming"), "choose numbers should be dynamic programming");
  assert(level8Message.resolved_algorithm_domains.some((tag) => tag.value === "dynamic_programming"), "message lookup should include dynamic programming");

  const level5ExactDp = model.records
    .filter((record) => record.level === 5)
    .flatMap((record) => [
      ...record.resolved_algorithm_domains,
      ...record.resolved_problem_type_tags,
      ...record.resolved_knowledge_point_tags
    ])
    .filter((tag) => /dynamic|dp|动态规划/i.test(`${tag.value} ${tag.label}`) && tag.syllabus_fit === "exact");
  assert(level5ExactDp.length === 0, "level 5 exact DP tags must remain zero");

  console.log(`official programming refined record count: ${officialProgramming.length}`);
  console.log("Official programming classification refinement validation passed");
}

main().catch((error) => {
  console.error(`Official programming classification refinement validation failed: ${error.message}`);
  process.exitCode = 1;
});
