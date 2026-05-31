import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const detailsPath = "data/classification/problem-details.json";
const guidancePath = "data/classification/problem-answer-guidance.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeOutput(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function runBinary(binaryPath, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, [], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${binaryPath}: timeout`));
    }, 5000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${binaryPath}: exited ${code}; ${stderr}`));
      }
    });
    child.stdin.end(input);
  });
}

async function verifyCode(detail, tempRoot) {
  const sourcePath = join(tempRoot, `${detail.canonical_problem_id.replace(/[^a-z0-9]+/gi, "_")}.cpp`);
  const binaryPath = join(tempRoot, `${detail.canonical_problem_id.replace(/[^a-z0-9]+/gi, "_")}.out`);
  await writeFile(sourcePath, detail.programming_solution.code);
  await execFileAsync("g++", ["-std=c++17", "-O2", sourcePath, "-o", binaryPath], { maxBuffer: 4 * 1024 * 1024 });

  for (const [index, sample] of detail.sample_cases.cases.entries()) {
    const stdout = await runBinary(binaryPath, `${sample.input}\n`);
    const actual = normalizeOutput(stdout);
    const expected = normalizeOutput(sample.output);
    assert(actual === expected, `${detail.canonical_problem_id}: sample ${index + 1} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function main() {
  const [details, guidance] = await Promise.all([
    readJson(detailsPath),
    readJson(guidancePath)
  ]);
  const guidanceById = new Map(guidance.records.map((record) => [record.canonical_problem_id, record]));
  const aiDetails = details.records.filter((detail) => detail.question_type === "programming" && detail.programming_solution.content_origin === "ai_generated_sample_verified");

  assert(aiDetails.length === 16, `expected 16 official AI sample-verified C++ solutions, got ${aiDetails.length}`);
  assert(details.summary.official_programming_ai_sample_verified_solution_count === aiDetails.length, "summary official AI solution count mismatch");
  assert(details.summary.programming_pending_solution_count === 0, "official programming solutions should no longer be pending");

  for (const detail of aiDetails) {
    assert(detail.programming_solution.status === "needs_review", `${detail.canonical_problem_id}: AI solution must remain needs_review`);
    assert(/AI|生成|甄别|复核/.test(detail.programming_solution.ai_generation_notice || ""), `${detail.canonical_problem_id}: visible AI notice required`);
    assert(/[\u4e00-\u9fa5]/.test(detail.programming_solution.code || ""), `${detail.canonical_problem_id}: C++ code must contain Chinese comments`);
    assert(detail.programming_solution.verification?.status === "sample_passed", `${detail.canonical_problem_id}: sample verification required`);
    assert(detail.completeness.needs_programming_solution === false, `${detail.canonical_problem_id}: solution should no longer be missing`);
    assert(detail.completeness.needs_solution_review === true, `${detail.canonical_problem_id}: solution review flag required`);

    const guidanceRecord = guidanceById.get(detail.canonical_problem_id);
    assert(guidanceRecord, `${detail.canonical_problem_id}: guidance record required`);
    assert(guidanceRecord.reference_answer.status === "needs_review", `${detail.canonical_problem_id}: guidance answer should need review`);
    assert(guidanceRecord.reference_answer.source === "ai_generated_sample_verified", `${detail.canonical_problem_id}: guidance AI source required`);
    assert(guidanceRecord.understanding_example?.language === "zh-CN", `${detail.canonical_problem_id}: Chinese understanding required`);
  }

  const tempRoot = await mkdtemp(join(tmpdir(), "gesp-official-ai-solution-validate-"));
  try {
    for (const detail of aiDetails) {
      await verifyCode(detail, tempRoot);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  console.log(`official AI sample verified solution count: ${aiDetails.length}`);
  console.log("Official AI reference solution validation passed");
}

main().catch((error) => {
  console.error(`Official AI reference solution validation failed: ${error.message}`);
  process.exitCode = 1;
});
