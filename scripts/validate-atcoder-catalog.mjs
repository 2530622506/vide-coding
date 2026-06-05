import { readFile } from "node:fs/promises";

const DATA_PATH = "data/atcoder/luogu-atcoder-problem-bank.json";
const ALLOWED_DIFFICULTIES = new Set([3, 4, 5]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const catalog = JSON.parse(await readFile(DATA_PATH, "utf8"));
  assert(Array.isArray(catalog.problems), "problems must be an array");
  assert(Array.isArray(catalog.domains), "domains must be an array");
  assert(catalog.problems.length > 0, "AtCoder catalog must contain problems");
  assert(catalog.summary.problem_count === catalog.problems.length, "summary.problem_count must match problems length");
  assert(catalog.source.crawl_delay_ms >= 400, "crawl_delay_ms should keep Luogu requests low frequency");

  const problemIds = new Set();
  for (const problem of catalog.problems) {
    assert(!problemIds.has(problem.id), `duplicate problem id: ${problem.id}`);
    problemIds.add(problem.id);
    assert(ALLOWED_DIFFICULTIES.has(problem.difficulty), `${problem.id}: unsupported difficulty ${problem.difficulty}`);
    assert(problem.source_url?.startsWith("https://www.luogu.com.cn/problem/"), `${problem.id}: source_url must be Luogu problem URL`);
    assert(typeof problem.title_zh === "string" && problem.title_zh.trim(), `${problem.id}: Chinese title required`);
    assert(/[\u4e00-\u9fff]/.test(problem.title_zh), `${problem.id}: Chinese title must include Chinese text`);
    assert(problem.algorithm_domains?.length > 0, `${problem.id}: algorithm_domains required`);
    assert(problem.knowledge_points?.length > 0, `${problem.id}: knowledge_points required`);
    assert(problem.answer_guidance?.status === "reference_link", `${problem.id}: answer guidance must be reference_link`);
    assert(problem.answer_guidance?.source_url === problem.source_url, `${problem.id}: answer source must match problem source`);
    assert(/AI 生成，仅供参考/.test(problem.answer_guidance?.answer || ""), `${problem.id}: AI-generated answer notice required`);
    assert(problem.statement && typeof problem.statement === "object", `${problem.id}: statement required`);
    assert(["source_extracted", "pending_collection"].includes(problem.statement.status), `${problem.id}: invalid statement status`);
    assert(Array.isArray(problem.statement.sections), `${problem.id}: statement sections must be an array`);
    assert(Array.isArray(problem.statement.samples), `${problem.id}: samples must be an array`);
    if (problem.statement.status === "source_extracted") {
      assert(problem.statement.sections.length > 0, `${problem.id}: extracted statement sections required`);
      assert(problem.statement.sections.every((section) => section.title && section.markdown), `${problem.id}: statement section title/markdown required`);
    }
    for (const sample of problem.statement.samples) {
      assert(typeof sample.input === "string", `${problem.id}: sample input must be string`);
      assert(typeof sample.output === "string", `${problem.id}: sample output must be string`);
    }
    assert(problem.visual_assets && typeof problem.visual_assets === "object", `${problem.id}: visual assets required`);
    assert(["source_extracted", "none_found", "pending_collection"].includes(problem.visual_assets.status), `${problem.id}: invalid visual assets status`);
    assert(Array.isArray(problem.visual_assets.assets), `${problem.id}: visual assets list required`);
    for (const asset of problem.visual_assets.assets) {
      assert(asset.source_url, `${problem.id}: visual asset source_url required`);
      assert(["downloaded", "download_failed"].includes(asset.status), `${problem.id}: invalid visual asset status`);
      if (asset.status === "downloaded") {
        assert(asset.local_path?.startsWith("data/atcoder/assets/"), `${problem.id}: downloaded asset local_path required`);
        assert(asset.asset_url?.startsWith("/api/atcoder-catalog/assets/"), `${problem.id}: downloaded asset API URL required`);
      }
    }
    assert(problem.programming_solution && typeof problem.programming_solution === "object", `${problem.id}: programming solution metadata required`);
    assert(["pending_ai_generation", "needs_review"].includes(problem.programming_solution.status), `${problem.id}: invalid programming solution status`);
    if (problem.programming_solution.code) {
      assert(
        ["ai_generated_sample_verified", "ai_generated_compile_verified", "local_ai_generated_reference"].includes(problem.programming_solution.content_origin),
        `${problem.id}: generated code must disclose AI origin`
      );
      assert(
        ["sample_passed", "compiled_no_samples"].includes(problem.programming_solution.verification?.status),
        `${problem.id}: generated code requires verification metadata`
      );
    } else {
      assert(
        ["pending_ai_generation", "local_ai_generated_reference"].includes(problem.programming_solution.content_origin),
        `${problem.id}: missing code must remain pending or local AI reference`
      );
      assert(/AI 生成，仅供参考/.test(problem.programming_solution.ai_generation_notice || ""), `${problem.id}: programming solution AI notice required`);
    }
  }

  for (const domain of catalog.domains) {
    assert(domain.problem_count > 0, `${domain.domain_id}: problem_count must be positive`);
    assert(Array.isArray(domain.problem_types) && domain.problem_types.length > 0, `${domain.domain_id}: problem_types required`);
    for (const type of domain.problem_types) {
      assert(type.problems.every((problemId) => problemIds.has(problemId)), `${type.problem_type_id}: unknown problem id`);
    }
  }

  console.log(`AtCoder catalog validation passed: ${catalog.problems.length} problems, ${catalog.domains.length} domains`);
}

main().catch((error) => {
  console.error(`AtCoder catalog validation failed: ${error.message}`);
  process.exitCode = 1;
});
