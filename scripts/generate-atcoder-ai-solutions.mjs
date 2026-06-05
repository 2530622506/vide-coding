import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DATA_PATH = "data/atcoder/luogu-atcoder-problem-bank.json";
const PROVIDER = process.env.ATCODER_AI_PROVIDER || "openai";
const API_KEY = process.env.ATCODER_AI_API_KEY || process.env.OPENAI_API_KEY || "";
const BASE_URL = (process.env.ATCODER_AI_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const ANTHROPIC_KEY = process.env.ATCODER_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_AUTH_TOKEN = process.env.ATCODER_ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN || "";
const ANTHROPIC_BASE_URL = (process.env.ATCODER_ANTHROPIC_BASE_URL || process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const ANTHROPIC_AUTH_HEADER = process.env.ATCODER_ANTHROPIC_AUTH_HEADER || (ANTHROPIC_KEY ? "x-api-key" : "authorization");
const MODEL = process.env.ATCODER_AI_MODEL || process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || "gpt-4.1-mini";
const LIMIT = Number(process.env.ATCODER_AI_SOLUTION_LIMIT || 1);
const CONCURRENCY = Math.max(1, Number(process.env.ATCODER_AI_CONCURRENCY || 1));
const MAX_TOKENS = Number(process.env.ATCODER_AI_MAX_TOKENS || 4096);
const REQUIRE_SAMPLES = process.env.ATCODER_AI_REQUIRE_SAMPLES === "1";
const CONTINUE_ON_ERROR = process.env.ATCODER_AI_CONTINUE_ON_ERROR === "1";
const RETRIES = Number(process.env.ATCODER_AI_RETRIES || 1);
const SKIP_FAILED = process.env.ATCODER_AI_SKIP_FAILED === "1";
const EXCLUDE_IDS = new Set((process.env.ATCODER_AI_EXCLUDE_IDS || "").split(",").map((item) => item.trim()).filter(Boolean));
const REQUEST_TIMEOUT_MS = Number(process.env.ATCODER_AI_REQUEST_TIMEOUT_MS || 90000);

function normalizeOutput(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function statementText(problem) {
  return problem.statement.sections
    .map((section) => `## ${section.title}\n${section.markdown}`)
    .join("\n\n");
}

function buildPrompt(problem) {
  const samples = problem.statement.samples
    .map((sample, index) => `样例 ${index + 1}\n输入:\n${sample.input}\n输出:\n${sample.output}`)
    .join("\n\n");
  return `你是严谨的算法竞赛 C++17 题解生成器。请根据题面生成一份 C++17 参考解。

要求：
- 只输出 JSON，不要 Markdown。
- JSON 字段必须是 algorithm、complexity、code。
- code 必须是完整 C++17 程序，包含必要头文件和 main。
- 不要使用 bits/stdc++.h，必须显式 include 标准库头文件。
- 代码里保留少量中文注释解释关键步骤。
- 不要使用非标准库或交互式代码。

题号：${problem.pid}
标题：${problem.title}
算法标签：${problem.algorithm_domains.map((item) => item.label).join(" / ")}

题面：
${statementText(problem)}

样例：
${samples || "当前采集结果中没有公开样例。请仍然根据题面生成完整 C++17 程序，并保证代码可以编译。"}`;
}

async function requestSolution(problem) {
  if (PROVIDER === "anthropic") {
    return requestAnthropicSolution(problem);
  }
  if (PROVIDER === "claude_cli") {
    return requestClaudeCliSolution(problem);
  }
  return requestOpenAiSolution(problem);
}

function parseSolutionJson(problem, content) {
  const text = String(content || "").trim();
  const candidates = extractJsonCandidates(text);
  for (const candidate of candidates) {
    try {
      const solution = JSON.parse(candidate);
      if (solution.algorithm && solution.complexity && solution.code) {
        return solution;
      }
    } catch {
      // Try the next balanced JSON-looking candidate.
    }
  }
  throw new Error(`${problem.id}: AI response did not contain valid solution JSON`);
}

function extractJsonCandidates(text) {
  const candidates = [];
  if (text.startsWith("{") && text.endsWith("}")) {
    candidates.push(text);
  }
  const fenceMatches = text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g);
  for (const match of fenceMatches) {
    const fenced = match[1].trim();
    if (fenced.startsWith("{") && fenced.endsWith("}")) {
      candidates.push(fenced);
    }
  }

  for (let start = 0; start < text.length; ++start) {
    if (text[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let index = start; index < text.length; ++index) {
      const char = text[index];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      if (depth === 0) {
        candidates.push(text.slice(start, index + 1));
        break;
      }
    }
  }
  return [...new Set(candidates)];
}

function sanitizeCppCode(code) {
  return String(code || "").replace(
    /^\s*#\s*include\s*<bits\/stdc\+\+\.h>\s*$/gm,
    [
      "#include <algorithm>",
      "#include <array>",
      "#include <cmath>",
      "#include <deque>",
      "#include <iomanip>",
      "#include <iostream>",
      "#include <limits>",
      "#include <map>",
      "#include <numeric>",
      "#include <queue>",
      "#include <set>",
      "#include <stack>",
      "#include <string>",
      "#include <tuple>",
      "#include <unordered_map>",
      "#include <unordered_set>",
      "#include <utility>",
      "#include <vector>"
    ].join("\n")
  );
}

async function requestOpenAiSolution(problem) {
  assert(API_KEY, "ATCODER_AI_API_KEY or OPENAI_API_KEY is required");
  const response = await fetchWithTimeout(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You generate sample-verifiable C++17 competitive-programming reference solutions as strict JSON."
        },
        {
          role: "user",
          content: buildPrompt(problem)
        }
      ]
    })
  });
  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status} ${await response.text()}`);
  }
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content || "";
  return parseSolutionJson(problem, content);
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function anthropicMessagesUrl() {
  if (ANTHROPIC_BASE_URL.endsWith("/v1/messages")) return ANTHROPIC_BASE_URL;
  if (ANTHROPIC_BASE_URL.endsWith("/v1")) return `${ANTHROPIC_BASE_URL}/messages`;
  return `${ANTHROPIC_BASE_URL}/v1/messages`;
}

async function requestAnthropicSolution(problem) {
  const token = ANTHROPIC_KEY || ANTHROPIC_AUTH_TOKEN;
  assert(token, "ATCODER_ANTHROPIC_API_KEY, ANTHROPIC_API_KEY, ATCODER_ANTHROPIC_AUTH_TOKEN, or ANTHROPIC_AUTH_TOKEN is required");
  const headers = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01"
  };
  if (ANTHROPIC_AUTH_HEADER === "x-api-key" || ANTHROPIC_AUTH_HEADER === "both") {
    headers["x-api-key"] = token;
  }
  if (ANTHROPIC_AUTH_HEADER === "authorization" || ANTHROPIC_AUTH_HEADER === "both") {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetchWithTimeout(anthropicMessagesUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
      system: "You generate sample-verifiable C++17 competitive-programming reference solutions as strict JSON.",
      messages: [
        {
          role: "user",
          content: buildPrompt(problem)
        }
      ]
    })
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Anthropic request failed: ${response.status} ${raw}`);
  }
  const payload = JSON.parse(raw);
  const content = payload.content
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n") || "";
  return parseSolutionJson(problem, content);
}

async function requestClaudeCliSolution(problem) {
  const args = [
    "-p",
    "--output-format",
    "json",
    "--tools",
    "",
    "--no-session-persistence",
    "--model",
    MODEL
  ];
  const raw = await runCommandWithInput("claude", args, buildPrompt(problem), 120000);
  const payload = JSON.parse(raw);
  const content = payload.result || payload.response || payload.content || raw;
  return parseSolutionJson(problem, content);
}

function runCommandWithInput(command, args, input, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command}: timeout`));
    }, timeoutMs);

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
        resolve(stdout.trim());
      } else {
        reject(new Error(`${command}: exited ${code}; ${stderr}`));
      }
    });
    child.stdin.end(input);
  });
}

async function compileAndRun(problem, code, tempRoot) {
  const sourcePath = join(tempRoot, `${problem.id.replace(/[^a-z0-9]+/gi, "_")}.cpp`);
  const binaryPath = join(tempRoot, `${problem.id.replace(/[^a-z0-9]+/gi, "_")}.out`);
  await writeFile(sourcePath, code, "utf8");
  await execFileAsync("g++", ["-std=c++17", "-O2", sourcePath, "-o", binaryPath], {
    maxBuffer: 4 * 1024 * 1024
  });

  const sampleResults = [];
  for (const [index, sample] of problem.statement.samples.entries()) {
    const actual = normalizeOutput(await runBinary(binaryPath, `${sample.input}\n`));
    const expected = normalizeOutput(sample.output);
    sampleResults.push({
      index: index + 1,
      expected,
      actual,
      passed: outputPasses(expected, actual)
    });
  }
  const failed = sampleResults.filter((result) => !result.passed);
  if (failed.length) {
    throw new Error(`${problem.id}: sample verification failed ${JSON.stringify(failed)}`);
  }
  return sampleResults;
}

function outputPasses(expected, actual) {
  if (expected === actual) return true;
  const expectedTokens = expected.split(/\s+/).filter(Boolean);
  const actualTokens = actual.split(/\s+/).filter(Boolean);
  if (expectedTokens.length !== actualTokens.length || expectedTokens.length === 0) return false;
  return expectedTokens.every((token, index) => numericTokenPasses(token, actualTokens[index]));
}

function numericTokenPasses(expected, actual) {
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(expected)) return false;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(actual)) return false;
  const expectedNumber = Number(expected);
  const actualNumber = Number(actual);
  if (!Number.isFinite(expectedNumber) || !Number.isFinite(actualNumber)) return false;
  const tolerance = 1e-6 * Math.max(1, Math.abs(expectedNumber));
  return Math.abs(expectedNumber - actualNumber) <= tolerance;
}

async function generateVerifiedSolution(problem, tempRoot) {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; ++attempt) {
    try {
      const solution = await requestSolution(problem);
      solution.code = sanitizeCppCode(solution.code);
      const sampleResults = await compileAndRun(problem, solution.code, tempRoot);
      return { solution, sampleResults };
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) {
        console.error(`${problem.id}: attempt ${attempt + 1} failed: ${error.message}`);
      }
    }
  }
  throw lastError;
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

function applySolution(problem, solution, sampleResults) {
  const hasSamples = sampleResults.length > 0;
  return {
    ...problem,
    programming_solution: {
      status: "needs_review",
      language: "C++17",
      code: solution.code,
      content_origin: hasSamples ? "ai_generated_sample_verified" : "ai_generated_compile_verified",
      ai_generation_notice: hasSamples
        ? "当前答案是 AI 生成，仅供参考。该 C++17 参考解由 AI 根据公开题面生成，并已通过当前题面样例；仍需人工复核或 OJ 评测确认。"
        : "当前答案是 AI 生成，仅供参考。该 C++17 参考解由 AI 根据公开题面生成，当前采集结果中没有公开样例，仅完成编译校验；仍需人工复核或 OJ 评测确认。",
      reference_answer: hasSamples
        ? "AI 生成 C++17 参考解已通过公开样例，仍需复核。"
        : "AI 生成 C++17 参考解已通过编译校验；当前无公开样例可验证输出。",
      algorithm: solution.algorithm,
      complexity: solution.complexity,
      verification: {
        status: hasSamples ? "sample_passed" : "compiled_no_samples",
        verifier: "scripts/generate-atcoder-ai-solutions.mjs",
        verified_at: new Date().toISOString(),
        sample_count: sampleResults.length,
        sample_results: sampleResults
      },
      notes: [
        "AI 生成参考解，不能标记为官方题解。",
        hasSamples ? "代码已通过当前采集样例。" : "当前采集结果中没有公开样例，代码仅完成编译校验。",
        "正式使用前建议继续用洛谷或 AtCoder 评测。"
      ]
    },
    answer_guidance: {
      ...problem.answer_guidance,
      status: "reference_link",
      answer: hasSamples
        ? "当前答案是 AI 生成，仅供参考。AI 生成 C++17 参考解已通过公开样例，仍需人工或 OJ 复核。"
        : "当前答案是 AI 生成，仅供参考。AI 生成 C++17 参考解已通过编译校验；当前无公开样例可验证输出。",
      source: "luogu_problem_page",
      source_url: problem.source_url,
      solution_outline: solution.algorithm,
      review_note: hasSamples
        ? "AI 生成代码不是官方答案；已通过当前样例，但仍需复核边界条件。"
        : "AI 生成代码不是官方答案；当前无公开样例，仅完成编译校验。"
    }
  };
}

function replaceProblem(catalog, replacement) {
  catalog.problems = catalog.problems.map((problem) => problem.id === replacement.id ? replacement : problem);
  refreshSummary(catalog);
}

function applyFailure(problem, failure) {
  return {
    ...problem,
    programming_solution: {
      ...problem.programming_solution,
      generation_error: failure
    }
  };
}

function refreshSummary(catalog) {
  catalog.generated_at = new Date().toISOString();
  catalog.summary.ai_sample_verified_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.verification?.status === "sample_passed").length;
  catalog.summary.ai_compile_verified_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.verification?.status === "compiled_no_samples").length;
  catalog.summary.pending_ai_generation_count = catalog.problems.filter((problem) => !String(problem.programming_solution?.code || "").trim()).length;
}

async function writeCatalog(catalog) {
  await writeFile(DATA_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

async function main() {
  const catalog = JSON.parse(await readFile(DATA_PATH, "utf8"));
  const candidates = catalog.problems.filter((problem) => {
    return !String(problem.programming_solution?.code || "").trim()
      && !EXCLUDE_IDS.has(problem.id)
      && problem.statement?.status === "source_extracted"
      && problem.statement?.sections?.length > 0
      && (!SKIP_FAILED || !problem.programming_solution?.generation_error)
      && (!REQUIRE_SAMPLES || problem.statement.samples.length > 0);
  }).sort((a, b) => b.statement.samples.length - a.statement.samples.length)
    .slice(0, Math.max(0, LIMIT));
  assert(candidates.length > 0, "No AtCoder problems without C++ code are eligible for AI solution generation");

  const tempRoot = await mkdtemp(join(tmpdir(), "atcoder-ai-solutions-"));
  let solvedCount = 0;
  let failedCount = 0;
  let cursor = 0;
  let writeQueue = Promise.resolve();

  function nextCandidate() {
    const problem = candidates[cursor];
    cursor += 1;
    return problem;
  }

  async function persistReplacement(replacement) {
    writeQueue = writeQueue.then(async () => {
      replaceProblem(catalog, replacement);
      await writeCatalog(catalog);
    });
    return writeQueue;
  }

  async function worker() {
    while (true) {
      const problem = nextCandidate();
      if (!problem) return;
      try {
        const { solution, sampleResults } = await generateVerifiedSolution(problem, tempRoot);
        await persistReplacement(applySolution(problem, solution, sampleResults));
        solvedCount += 1;
        console.log(`generated and verified ${problem.id}`);
      } catch (error) {
        const failure = {
          message: error.message,
          failed_at: new Date().toISOString(),
          provider: PROVIDER,
          verifier: "scripts/generate-atcoder-ai-solutions.mjs"
        };
        await persistReplacement(applyFailure(problem, failure));
        failedCount += 1;
        console.error(`${problem.id}: ${error.message}`);
        if (!CONTINUE_ON_ERROR) {
          throw error;
        }
      }
    }
  }

  try {
    console.log(`AI solution generation concurrency: ${Math.min(CONCURRENCY, candidates.length)}`);
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, () => worker()));
    await writeQueue;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  refreshSummary(catalog);
  await writeCatalog(catalog);
  console.log(`AI solutions generated: ${solvedCount}`);
  if (failedCount) {
    console.log(`AI solutions failed: ${failedCount}`);
  }
  console.log(`wrote ${DATA_PATH}`);
}

main().catch((error) => {
  console.error(`AtCoder AI solution generation failed: ${error.message}`);
  process.exitCode = 1;
});
