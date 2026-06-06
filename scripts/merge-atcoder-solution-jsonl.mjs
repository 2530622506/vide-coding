import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = "data/atcoder/luogu-atcoder-problem-bank.json";
const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error("Usage: node scripts/merge-atcoder-solution-jsonl.mjs <solutions.jsonl>");
}

function parseJsonl(text) {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const item = JSON.parse(line);
      for (const key of ["id", "algorithm", "complexity", "code"]) {
        if (!String(item[key] || "").trim()) {
          throw new Error(`${inputPath}:${index + 1} missing ${key}`);
        }
      }
      return item;
    });
}

function applySolution(problem, solution) {
  const generatedAt = new Date().toISOString();
  return {
    ...problem,
    programming_solution: {
      status: "needs_review",
      language: "C++17",
      code: solution.code,
      content_origin: "ai_generated_unverified_reference",
      ai_generation_notice: "当前答案是 AI 生成，仅供参考。该 C++17 参考解由 AI 根据公开题面生成；按用户要求跳过编译和样例验证，正式提交前请人工复核或通过 OJ 评测确认。",
      reference_answer: "AI 生成 C++17 参考解已直接合并；按用户要求跳过编译和样例验证，仍需人工或 OJ 复核。",
      algorithm: solution.algorithm,
      complexity: solution.complexity,
      verification: {
        status: "not_verified_by_request",
        verifier: "scripts/merge-atcoder-solution-jsonl.mjs",
        checked_at: generatedAt,
        sample_count: problem.statement?.samples?.length || 0,
        sample_passed: null,
        compile_passed: null
      },
      notes: [
        "AI 生成参考解，不能标记为官方题解。",
        "按用户要求直接合并，未进行本地编译或样例验证。",
        "正式使用前建议继续用洛谷或 AtCoder 评测。"
      ]
    },
    answer_guidance: {
      ...problem.answer_guidance,
      status: "reference_link",
      answer: "当前答案是 AI 生成，仅供参考。AI 生成 C++17 参考解已直接合并；按用户要求跳过编译和样例验证，仍需人工或 OJ 复核。",
      source: "luogu_problem_page",
      source_url: problem.source_url,
      solution_outline: solution.algorithm,
      review_note: "AI 生成代码不是官方答案；按用户要求未进行编译或样例验证。"
    }
  };
}

function refreshSummary(catalog) {
  catalog.generated_at = new Date().toISOString();
  catalog.summary.ai_sample_verified_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.verification?.status === "sample_passed").length;
  catalog.summary.ai_compile_verified_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.verification?.status === "compiled_no_samples").length;
  catalog.summary.ai_not_verified_by_request_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.verification?.status === "not_verified_by_request").length;
  catalog.summary.ai_unverified_reference_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.content_origin === "ai_generated_unverified_reference").length;
  catalog.summary.subagent_ai_reference_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.content_origin === "subagent_ai_generated_reference").length;
  catalog.summary.pending_ai_generation_count = catalog.problems.filter((problem) => !String(problem.programming_solution?.code || "").trim()).length;
}

const catalog = JSON.parse(await readFile(DATA_PATH, "utf8"));
const solutions = parseJsonl(await readFile(inputPath, "utf8"));
const byId = new Map(catalog.problems.map((problem) => [problem.id, problem]));
let merged = 0;

for (const solution of solutions) {
  const problem = byId.get(solution.id);
  if (!problem) {
    throw new Error(`${solution.id}: problem not found`);
  }
  if (String(problem.programming_solution?.code || "").trim()) {
    continue;
  }
  byId.set(solution.id, applySolution(problem, solution));
  merged += 1;
}

catalog.problems = catalog.problems.map((problem) => byId.get(problem.id) || problem);
refreshSummary(catalog);
await writeFile(DATA_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`merged ${merged}/${solutions.length} solutions from ${inputPath}`);
