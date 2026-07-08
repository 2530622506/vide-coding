const baseUrl = process.env.CATALOG_API_URL || "";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function validateViaHttp() {
  const levelResponse = await fetch(`${baseUrl}/catalog/levels/7?question_type=selection`);
  assert(levelResponse.ok, `catalog level 7 selection expected 2xx, got ${levelResponse.status}`);
  const level7 = await levelResponse.json();
  assert(level7.level === 7, "expected level 7 catalog");
  assert(level7.question_type === "selection", "expected server-side question_type filter to be echoed");
  assert(level7.summary.problem_count >= 15, `expected at least 15 level 7 selection questions, got ${level7.summary.problem_count}`);
  const targetProblemId = "wanjuanwang:2025-06:cxx:level-7:programming:01:jjspdzdsru0fy11r9w6m";
  const problemResponse = await fetch(`${baseUrl}/catalog/problems/${encodeURIComponent(targetProblemId)}`);
  assert(problemResponse.ok, `catalog problem expected 2xx, got ${problemResponse.status}`);
  const problem = await problemResponse.json();
  assert(problem.question_type === "programming", "expected programming problem detail");
  assert(Array.isArray(problem.source_versions) && problem.source_versions.length >= 1, "expected source_versions");
  console.log(`wanjuanwang integration http level7 selection count: ${level7.summary.problem_count}`);
  console.log(`wanjuanwang integration http problem detail sources: ${problem.source_versions.length}`);
}

async function validateViaService() {
  const mod = await import("../dist/api/catalog.service.js");
  const service = new mod.CatalogService();
  const level7 = await service.getLevelCatalog(7, "selection");
  const level1Programming = await service.getLevelCatalog(1, "programming");
  const dutyProblem = await service.getProblem("wanjuanwang:2025-06:cxx:level-1:programming:02:qkris3b9wz9dnky8x5o9");

  assert(level7?.summary?.problem_count >= 15, `expected at least 15 level 7 selection questions, got ${level7?.summary?.problem_count}`);
  assert(level7?.question_type === "selection", "expected level7 selection filter");
  assert(level1Programming?.domains?.some((domain) => domain.domain_id === "number_theory"), "expected level 1 programming catalog to include number_theory domain");
  assert(dutyProblem?.resolved_algorithm_domains?.some((tag) => tag.value === "number_theory"), "expected 值日 to map to number_theory");
  assert(dutyProblem?.detail?.statement?.status === "source_extracted", "expected source-extracted detail statement");

  console.log(`wanjuanwang integration service level7 selection count: ${level7.summary.problem_count}`);
  console.log(`wanjuanwang integration service level1 programming domains: ${level1Programming.domains.map((domain) => domain.domain_id).join(",")}`);
  console.log("WanJuanWang GESP C++ integration validation passed");
}

async function main() {
  if (baseUrl) {
    await validateViaHttp();
    console.log("WanJuanWang GESP C++ integration validation passed");
    return;
  }
  await validateViaService();
}

main().catch((error) => {
  console.error(`WanJuanWang GESP C++ integration validation failed: ${error.message}`);
  process.exitCode = 1;
});
