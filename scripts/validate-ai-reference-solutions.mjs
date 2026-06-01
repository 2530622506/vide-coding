import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const supplementalPath = "data/classification/supplemental-cxx-problems.json";
const minimumAiSolutionCount = 170;

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

function isPermutation(values, n) {
  if (values.length !== n) return false;
  const seen = new Set(values);
  if (seen.size !== n) return false;
  for (let value = 1; value <= n; value += 1) {
    if (!seen.has(value)) return false;
  }
  return true;
}

function checkGongFactorySample(input, actualOutput) {
  const inputTokens = normalizeOutput(input).split(/\s+/);
  const outputTokens = normalizeOutput(actualOutput).split(/\s+/);
  let inputIndex = 0;
  let outputIndex = 0;
  const caseCount = Number(inputTokens[inputIndex++]);
  for (let caseIndex = 0; caseIndex < caseCount; caseIndex += 1) {
    const n = Number(inputTokens[inputIndex++]);
    const machines = Array.from({ length: n }, () => Number(inputTokens[inputIndex++]));
    const orders = Array.from({ length: n }, () => Number(inputTokens[inputIndex++]));
    const possible = machines.reduce((sum, value) => sum + value, 0) >= orders.reduce((sum, value) => sum + value, 0);
    const decision = outputTokens[outputIndex++];
    if (!possible) {
      if (decision !== "No") return false;
      continue;
    }
    if (decision !== "Yes") return false;
    const machineIds = outputTokens.slice(outputIndex, outputIndex + n).map(Number);
    outputIndex += n;
    const orderIds = outputTokens.slice(outputIndex, outputIndex + n).map(Number);
    outputIndex += n;
    if (!isPermutation(machineIds, n) || !isPermutation(orderIds, n)) return false;
    let stock = 0;
    for (let day = 0; day < n; day += 1) {
      stock += machines[machineIds[day] - 1];
      stock -= orders[orderIds[day] - 1];
      if (stock < 0) return false;
    }
  }
  return outputIndex === outputTokens.length;
}

function samplePassed(detail, sample, actual) {
  const normalizedActual = normalizeOutput(actual);
  if (detail.canonical_problem_id === "supplemental:luogu:b3999") {
    return checkGongFactorySample(sample.input, normalizedActual);
  }
  return normalizedActual === normalizeOutput(sample.output);
}

async function verifyCode(detail, tempRoot) {
  const sourcePath = join(tempRoot, `${detail.canonical_problem_id.replace(/[^a-z0-9]+/gi, "_")}.cpp`);
  const binaryPath = join(tempRoot, `${detail.canonical_problem_id.replace(/[^a-z0-9]+/gi, "_")}.out`);
  await writeFile(sourcePath, detail.programming_solution.code);
  await execFileAsync("g++", ["-std=c++17", "-O2", sourcePath, "-o", binaryPath], { maxBuffer: 4 * 1024 * 1024 });

  for (const [index, sample] of detail.sample_cases.cases.entries()) {
    const stdout = await runBinary(binaryPath, `${sample.input}\n`);
    assert(samplePassed(detail, sample, stdout), `${detail.canonical_problem_id}: sample ${index + 1} output did not satisfy checker, got ${JSON.stringify(normalizeOutput(stdout))}`);
  }
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

async function main() {
  const data = await readJson(supplementalPath);
  const details = data.problem_details.filter((detail) => detail.programming_solution.verification?.status === "sample_passed");
  assert(details.length >= minimumAiSolutionCount, `expected at least ${minimumAiSolutionCount} sample-verified AI reference solutions, got ${details.length}`);
  assert(data.summary.ai_sample_verified_solution_count === details.length, "summary AI solution count mismatch");

  for (const detail of details) {
    assert(detail.programming_solution.content_origin === "ai_generated_sample_verified", `${detail.canonical_problem_id}: AI solution origin required`);
    assert(/AI|生成|复核/.test(detail.programming_solution.ai_generation_notice || ""), `${detail.canonical_problem_id}: AI solution notice required`);
    assert(/[\u4e00-\u9fa5]/.test(detail.programming_solution.code), `${detail.canonical_problem_id}: C++ code must contain Chinese comments`);
    assert(detail.programming_solution.status === "needs_review", `${detail.canonical_problem_id}: AI solution must remain needs_review`);
    assert(detail.completeness.needs_programming_solution === false, `${detail.canonical_problem_id}: solution should no longer be missing`);
    assert(detail.completeness.needs_solution_review === true, `${detail.canonical_problem_id}: solution review flag required`);
  }

  const tempRoot = await mkdtemp(join(tmpdir(), "gesp-ai-solution-validate-"));
  try {
    for (const detail of details) {
      await verifyCode(detail, tempRoot);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  console.log(`AI sample verified solution count: ${details.length}`);
  console.log("AI reference solution validation passed");
}

main().catch((error) => {
  console.error(`AI reference solution validation failed: ${error.message}`);
  process.exitCode = 1;
});
