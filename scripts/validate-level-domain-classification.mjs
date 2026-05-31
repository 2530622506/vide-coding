import { readFile } from "node:fs/promises";

const classificationPath = "data/classification/level-domain-classification.json";
const level5TablePath = "data/classification/cxx-level5-domain-table.json";
const canonicalAlignmentPath = "data/canonical-problems/canonical-problem-alignment.json";

const requiredSeedDomains = new Set([
  "number_theory",
  "binary_search",
  "linked_list",
  "greedy",
  "recursion",
  "divide_conquer",
  "high_precision",
  "complexity",
  "sort_simulation"
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertTagShape(tag, context) {
  assert(typeof tag.kind === "string" && tag.kind.length > 0, `${context}: tag.kind required`);
  assert(tag.value !== undefined && tag.value !== null, `${context}: tag.value required`);
  assert(typeof tag.label === "string" && tag.label.length > 0, `${context}: tag.label required`);
  assert(typeof tag.source === "string" && tag.source.length > 0, `${context}: tag.source required`);
  assert(tag.evidence && typeof tag.evidence === "object", `${context}: evidence required`);
  assert(typeof tag.evidence.source === "string" && tag.evidence.source.length > 0, `${context}: evidence.source required`);
  assert(typeof tag.evidence.evidence === "string" && tag.evidence.evidence.length > 0, `${context}: evidence.evidence required`);
  assert(typeof tag.confidence === "number" && tag.confidence >= 0 && tag.confidence <= 1, `${context}: confidence must be 0..1`);
  assert(typeof tag.syllabus_fit === "string" && tag.syllabus_fit.length > 0, `${context}: syllabus_fit required`);
  assert(typeof tag.review_status === "string" && tag.review_status.length > 0, `${context}: review_status required`);
}

async function main() {
  const classification = await readJson(classificationPath);
  const level5Table = await readJson(level5TablePath);
  const canonical = await readJson(canonicalAlignmentPath);
  const canonicalIds = new Set(canonical.canonical_problems.map((problem) => problem.id));

  assert(classification.schema_version === 1, "classification schema_version must be 1");
  assert(level5Table.schema_version === 1, "level 5 domain table schema_version must be 1");
  assert(Array.isArray(classification.domain_seed), "domain_seed must be an array");
  assert(Array.isArray(classification.records), "records must be an array");
  assert(classification.records.length === canonical.canonical_problems.length, "classification count must match canonical problem count");

  const seedIds = new Set(classification.domain_seed.map((seed) => seed.id));
  for (const domainId of requiredSeedDomains) {
    assert(seedIds.has(domainId), `domain seed missing ${domainId}`);
  }

  let cxxLevel5Count = 0;
  let cxxLevel5WithLevelLabelCount = 0;
  let cxxLevel5WithDomainLabelCount = 0;
  let programmingCount = 0;
  let programmingWithDomainCount = 0;
  let outOfLevelSignalCount = 0;
  let level5DpCoreDomainCount = 0;

  for (const record of classification.records) {
    assert(canonicalIds.has(record.canonical_problem_id), `${record.canonical_problem_id}: unknown canonical problem`);
    assert(record.language === "C++", `${record.canonical_problem_id}: classification must be C++`);
    assert(record.labels && typeof record.labels === "object", `${record.canonical_problem_id}: labels required`);
    assert(Array.isArray(record.labels.level), `${record.canonical_problem_id}: level labels must be array`);
    assert(record.labels.level.length >= 1, `${record.canonical_problem_id}: level label required`);
    assert(Array.isArray(record.labels.algorithm_domain), `${record.canonical_problem_id}: algorithm_domain labels must be array`);
    assert(Array.isArray(record.out_of_level_signals), `${record.canonical_problem_id}: out_of_level_signals must be array`);

    for (const tag of record.labels.level) {
      assertTagShape(tag, `${record.canonical_problem_id}:level`);
      assert(tag.source === "official_pdf", `${record.canonical_problem_id}: level must come from official_pdf`);
      assert(tag.syllabus_fit === "exact", `${record.canonical_problem_id}: level syllabus_fit must be exact`);
      assert(tag.confidence === 1, `${record.canonical_problem_id}: level confidence must be 1`);
    }
    for (const tag of record.labels.algorithm_domain) {
      assertTagShape(tag, `${record.canonical_problem_id}:domain:${tag.value}`);
      assert(seedIds.has(tag.value), `${record.canonical_problem_id}: unknown domain ${tag.value}`);
      if (record.level === 5 && tag.value === "dynamic_programming" && tag.syllabus_fit === "exact") {
        level5DpCoreDomainCount += 1;
      }
    }

    outOfLevelSignalCount += record.out_of_level_signals.length;

    if (record.question_type === "programming") {
      programmingCount += 1;
      if (record.labels.algorithm_domain.length > 0) {
        programmingWithDomainCount += 1;
      }
    }

    if (record.level === 5) {
      cxxLevel5Count += 1;
      if (record.labels.level.length > 0) {
        cxxLevel5WithLevelLabelCount += 1;
      }
      if (record.labels.algorithm_domain.length > 0) {
        cxxLevel5WithDomainLabelCount += 1;
      }
    }
  }

  assert(cxxLevel5Count === 27, `expected 27 C++ level 5 records, got ${cxxLevel5Count}`);
  assert(cxxLevel5WithLevelLabelCount === 27, `expected all C++ level 5 records to have level label, got ${cxxLevel5WithLevelLabelCount}`);
  assert(cxxLevel5WithDomainLabelCount >= 22, `expected at least 22 C++ level 5 records with domain label, got ${cxxLevel5WithDomainLabelCount}`);
  assert(programmingWithDomainCount >= 12, `expected most programming problems with domain labels, got ${programmingWithDomainCount}/${programmingCount}`);
  assert(level5DpCoreDomainCount === 0, "DP must not be exact/core level-5 domain");
  assert(classification.summary.classified_problem_count === classification.records.length, "summary classified count mismatch");
  assert(classification.summary.cxx_level5_with_level_label_count === cxxLevel5WithLevelLabelCount, "summary level label count mismatch");
  assert(classification.summary.programming_with_domain_label_count === programmingWithDomainCount, "summary programming domain count mismatch");
  assert(classification.summary.out_of_level_signal_count === outOfLevelSignalCount, "summary out-of-level count mismatch");

  assert(Array.isArray(level5Table.rows), "level 5 domain table rows must be array");
  assert(level5Table.rows.length === 27, `expected 27 level 5 table rows, got ${level5Table.rows.length}`);
  assert(level5Table.summary.row_count === level5Table.rows.length, "level 5 table row count mismatch");
  assert(level5Table.summary.rows_with_domain_count === cxxLevel5WithDomainLabelCount, "level 5 table rows_with_domain_count mismatch");

  console.log(`classified problem count: ${classification.records.length}`);
  console.log(`C++ level 5 with level labels: ${cxxLevel5WithLevelLabelCount}`);
  console.log(`C++ level 5 with domain labels: ${cxxLevel5WithDomainLabelCount}`);
  console.log(`programming with domain labels: ${programmingWithDomainCount}/${programmingCount}`);
  console.log(`level 5 DP exact-domain count: ${level5DpCoreDomainCount}`);
  console.log(`out-of-level signal count: ${outOfLevelSignalCount}`);
  console.log("Level/domain classification validation passed");
}

main().catch((error) => {
  console.error(`Level/domain classification validation failed: ${error.message}`);
  process.exitCode = 1;
});
