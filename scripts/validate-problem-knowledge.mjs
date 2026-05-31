import { readFile } from "node:fs/promises";

const extractionPath = "data/classification/problem-type-knowledge.json";
const taxonomyPath = "data/classification/cxx-level5-taxonomy-table.json";
const levelDomainPath = "data/classification/level-domain-classification.json";

const requiredProblemTypes = new Set([
  "binary_answer_check",
  "prime_factorization",
  "gcd_lcm_transform",
  "linked_list_operation_simulation",
  "sort_key_greedy",
  "complexity_judgment"
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertTag(tag, context) {
  assert(typeof tag.kind === "string" && tag.kind.length > 0, `${context}: kind required`);
  assert(typeof tag.value === "string" && tag.value.length > 0, `${context}: value required`);
  assert(typeof tag.label === "string" && tag.label.length > 0, `${context}: label required`);
  assert(typeof tag.source === "string" && tag.source.length > 0, `${context}: source required`);
  assert(tag.evidence && typeof tag.evidence === "object", `${context}: evidence required`);
  assert(typeof tag.evidence.source === "string" && tag.evidence.source.length > 0, `${context}: evidence.source required`);
  assert(typeof tag.evidence.source_id === "string" && tag.evidence.source_id.length > 0, `${context}: evidence.source_id required`);
  assert(typeof tag.evidence.source_url === "string" && tag.evidence.source_url.startsWith("http"), `${context}: evidence.source_url must be http`);
  assert(typeof tag.evidence.evidence === "string" && tag.evidence.evidence.length > 0, `${context}: evidence.evidence required`);
  assert(typeof tag.confidence === "number" && tag.confidence >= 0 && tag.confidence <= 1, `${context}: confidence must be 0..1`);
  assert(typeof tag.syllabus_fit === "string" && tag.syllabus_fit.length > 0, `${context}: syllabus_fit required`);
  assert(typeof tag.review_status === "string" && tag.review_status.length > 0, `${context}: review_status required`);
}

async function main() {
  const extraction = await readJson(extractionPath);
  const taxonomy = await readJson(taxonomyPath);
  const levelDomain = await readJson(levelDomainPath);
  const levelDomainIds = new Set(levelDomain.records.map((record) => record.canonical_problem_id));

  assert(extraction.schema_version === 1, "problem knowledge schema_version must be 1");
  assert(taxonomy.schema_version === 1, "level 5 taxonomy schema_version must be 1");
  assert(extraction.extraction_policy?.tags_are_candidates === true, "tags must be candidate-level output");
  assert(extraction.extraction_policy?.no_full_statement_storage === true, "extraction must not store full statements");
  assert(Array.isArray(extraction.problem_type_seed), "problem_type_seed must be array");
  assert(Array.isArray(extraction.knowledge_seed), "knowledge_seed must be array");
  assert(Array.isArray(extraction.records), "records must be array");
  assert(extraction.records.length === levelDomain.records.length, "extraction record count must match level/domain records");

  const seedIds = new Set(extraction.problem_type_seed.map((seed) => seed.id));
  for (const required of requiredProblemTypes) {
    assert(seedIds.has(required), `missing required problem type seed ${required}`);
  }

  let level5Count = 0;
  let level5WithProblemType = 0;
  let level5WithKnowledge = 0;
  let problemTypeTagCount = 0;
  let knowledgePointTagCount = 0;
  let confirmedTagCount = 0;

  for (const record of extraction.records) {
    assert(levelDomainIds.has(record.canonical_problem_id), `${record.canonical_problem_id}: unknown canonical_problem_id`);
    assert(record.language === "C++", `${record.canonical_problem_id}: record must be C++`);
    assert(Array.isArray(record.algorithm_domains), `${record.canonical_problem_id}: algorithm_domains must be array`);
    assert(Array.isArray(record.problem_type_tags), `${record.canonical_problem_id}: problem_type_tags must be array`);
    assert(Array.isArray(record.knowledge_point_tags), `${record.canonical_problem_id}: knowledge_point_tags must be array`);
    assert(record.extraction_sources && typeof record.extraction_sources === "object", `${record.canonical_problem_id}: extraction_sources required`);

    for (const tag of record.problem_type_tags) {
      assertTag(tag, `${record.canonical_problem_id}:problem_type:${tag.value}`);
      assert(tag.kind === "problem_type", `${record.canonical_problem_id}: problem type kind mismatch`);
      problemTypeTagCount += 1;
      if (tag.review_status === "confirmed") {
        confirmedTagCount += 1;
      }
    }
    for (const tag of record.knowledge_point_tags) {
      assertTag(tag, `${record.canonical_problem_id}:knowledge_point:${tag.value}`);
      assert(tag.kind === "knowledge_point", `${record.canonical_problem_id}: knowledge point kind mismatch`);
      knowledgePointTagCount += 1;
      if (tag.review_status === "confirmed") {
        confirmedTagCount += 1;
      }
    }

    if (record.level === 5) {
      level5Count += 1;
      if (record.problem_type_tags.length > 0) {
        level5WithProblemType += 1;
      }
      if (record.knowledge_point_tags.length > 0) {
        level5WithKnowledge += 1;
      }
      assert(!record.problem_type_tags.some((tag) => /dynamic|dp|动态规划/i.test(`${tag.value} ${tag.label}`) && tag.syllabus_fit === "exact"), `${record.canonical_problem_id}: DP must not be exact level-5 problem type`);
      assert(!record.knowledge_point_tags.some((tag) => /dynamic|dp|动态规划/i.test(`${tag.value} ${tag.label}`) && tag.syllabus_fit === "exact"), `${record.canonical_problem_id}: DP must not be exact level-5 knowledge point`);
    }
  }

  assert(level5Count === 27, `expected 27 C++ level 5 records, got ${level5Count}`);
  assert(level5WithProblemType >= 20, `expected at least 20 level 5 records with problem type tags, got ${level5WithProblemType}`);
  assert(level5WithKnowledge >= 20, `expected at least 20 level 5 records with knowledge point tags, got ${level5WithKnowledge}`);
  assert(problemTypeTagCount >= 30, `expected at least 30 problem type tags, got ${problemTypeTagCount}`);
  assert(knowledgePointTagCount >= 35, `expected at least 35 knowledge point tags, got ${knowledgePointTagCount}`);
  assert(extraction.summary.record_count === extraction.records.length, "summary record count mismatch");
  assert(extraction.summary.cxx_level5_with_problem_type_count === level5WithProblemType, "summary level5 problem type count mismatch");
  assert(extraction.summary.cxx_level5_with_knowledge_count === level5WithKnowledge, "summary level5 knowledge count mismatch");
  assert(extraction.summary.problem_type_tag_count === problemTypeTagCount, "summary problem type tag count mismatch");
  assert(extraction.summary.knowledge_point_tag_count === knowledgePointTagCount, "summary knowledge point tag count mismatch");
  assert(extraction.summary.coverage_by_domain && typeof extraction.summary.coverage_by_domain === "object", "coverage_by_domain required");
  assert(Object.keys(extraction.summary.coverage_by_domain).length >= 6, "expected knowledge coverage across at least 6 domains");

  assert(Array.isArray(taxonomy.domains), "taxonomy domains must be array");
  assert(taxonomy.summary.domain_count === taxonomy.domains.length, "taxonomy domain count mismatch");
  assert(taxonomy.summary.problem_count === 27, "taxonomy must cover 27 C++ level 5 problems");
  assert(taxonomy.summary.typed_problem_count === level5WithProblemType, "taxonomy typed problem count mismatch");
  assert(taxonomy.summary.knowledge_covered_problem_count === level5WithKnowledge, "taxonomy knowledge covered count mismatch");
  assert(taxonomy.domains.some((domain) => domain.domain_id === "linked_list"), "taxonomy must include linked_list domain");
  assert(taxonomy.domains.some((domain) => domain.domain_id === "number_theory"), "taxonomy must include number_theory domain");
  assert(taxonomy.domains.some((domain) => domain.domain_id === "binary_search"), "taxonomy must include binary_search domain");

  console.log(`problem knowledge record count: ${extraction.records.length}`);
  console.log(`C++ level 5 with problem types: ${level5WithProblemType}`);
  console.log(`C++ level 5 with knowledge points: ${level5WithKnowledge}`);
  console.log(`problem type tag count: ${problemTypeTagCount}`);
  console.log(`knowledge point tag count: ${knowledgePointTagCount}`);
  console.log(`confirmed tag count: ${confirmedTagCount}`);
  console.log(`level 5 taxonomy domain count: ${taxonomy.summary.domain_count}`);
  console.log("Problem type and knowledge extraction validation passed");
}

main().catch((error) => {
  console.error(`Problem type and knowledge extraction validation failed: ${error.message}`);
  process.exitCode = 1;
});
