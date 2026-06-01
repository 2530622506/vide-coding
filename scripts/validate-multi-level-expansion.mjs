import { readFile } from "node:fs/promises";
import { CatalogService } from "../dist/api/catalog.service.js";

const modelPath = "data/classification/conflict-confidence-model.json";
const supplementalPath = "data/classification/supplemental-cxx-problems.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function tagsOf(record) {
  return [
    ...record.resolved_algorithm_domains,
    ...record.resolved_problem_type_tags,
    ...record.resolved_knowledge_point_tags
  ];
}

function isDpTag(tag) {
  return /dynamic_programming|dp|动态规划/i.test(`${tag.value} ${tag.label}`);
}

async function main() {
  const [model, supplemental] = await Promise.all([
    readJson(modelPath),
    readJson(supplementalPath)
  ]);
  const records = [...model.records, ...supplemental.records];
  const expectedLevels = [1, 2, 3, 4, 5, 6, 7, 8];
  const byLevel = new Map();
  for (const record of records) {
    byLevel.set(record.level, (byLevel.get(record.level) || 0) + 1);
    assert(record.canonical_problem_id && record.language === "C++", `${record.canonical_problem_id}: C++ canonical id required`);
    assert(Number.isInteger(record.level) && record.level >= 1 && record.level <= 8, `${record.canonical_problem_id}: level 1-8 required`);
    assert(Array.isArray(record.resolved_algorithm_domains), `${record.canonical_problem_id}: domains array required`);
    assert(Array.isArray(record.resolved_problem_type_tags), `${record.canonical_problem_id}: problem types array required`);
    assert(Array.isArray(record.resolved_knowledge_point_tags), `${record.canonical_problem_id}: knowledge points array required`);
  }
  for (const level of expectedLevels) {
    assert((byLevel.get(level) || 0) > 0, `level ${level}: records required`);
  }

  const level5DpTags = records
    .filter((record) => record.level === 5)
    .flatMap(tagsOf)
    .filter(isDpTag);
  assert(level5DpTags.length === 0, "level 5 must not expose DP tags as exact/core taxonomy");

  const level67DpTags = records
    .filter((record) => record.level === 6 || record.level === 7)
    .flatMap(tagsOf)
    .filter(isDpTag);
  assert(level67DpTags.length > 0, "level 6/7 should support DP taxonomy");
  assert(level67DpTags.every((tag) => tag.syllabus_fit !== "out_of_level"), "level 6/7 DP tags must not be marked out_of_level");

  const service = new CatalogService();
  const levels = await service.getLevels();
  assert(levels.levels.length >= 8, "catalog service should expose levels 1-8");
  for (const level of expectedLevels) {
    const catalog = await service.getLevelCatalog(level);
    assert(catalog?.level === level, `catalog level ${level} required`);
    assert(catalog.domains.length > 0, `catalog level ${level}: domains required`);
  }

  console.log(`multi-level total records: ${records.length}`);
  console.log(`multi-level counts: ${JSON.stringify(Object.fromEntries([...byLevel.entries()].sort((a, b) => a[0] - b[0])))}`);
  console.log(`level 5 DP tag count: ${level5DpTags.length}`);
  console.log(`level 6/7 DP tag count: ${level67DpTags.length}`);
  console.log("Multi-level expansion validation passed");
}

main().catch((error) => {
  console.error(`Multi-level expansion validation failed: ${error.message}`);
  process.exitCode = 1;
});
