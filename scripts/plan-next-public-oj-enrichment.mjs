import { mkdir, readFile, writeFile } from "node:fs/promises";

const supplementalPath = "data/classification/supplemental-cxx-problems.json";
const outputPath = "data/enrichment/next-public-oj-targets.json";

const defaultOptions = {
  limit: Number(process.env.NEXT_OJ_BATCH_SIZE || 30),
  levels: [],
  output: outputPath
};

function parseArgs(argv) {
  const options = { ...defaultOptions };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--limit") {
      options.limit = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--levels") {
      options.levels = String(argv[index + 1] || "")
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value));
      index += 1;
    } else if (arg === "--output") {
      options.output = argv[index + 1];
      index += 1;
    }
  }
  return options;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function firstSourceUrl(sourceVersions, canonicalProblemId) {
  const source = sourceVersions.find((item) => item.canonical_problem_id === canonicalProblemId && (item.source_url || item.url));
  return source?.source_url || source?.url || null;
}

function firstOjId(sourceVersions, canonicalProblemId) {
  const source = sourceVersions.find((item) => item.canonical_problem_id === canonicalProblemId && item.oj_id);
  return source?.oj_id || null;
}

function summarize(records, detailById) {
  const byLevel = new Map();
  for (const record of records) {
    if (!byLevel.has(record.level)) {
      byLevel.set(record.level, {
        level: record.level,
        total: 0,
        source_extracted: 0,
        pending: 0
      });
    }
    const bucket = byLevel.get(record.level);
    const detail = detailById.get(record.canonical_problem_id);
    bucket.total += 1;
    if (detail?.statement?.status === "source_extracted") {
      bucket.source_extracted += 1;
    } else {
      bucket.pending += 1;
    }
  }
  return [...byLevel.values()].sort((a, b) => a.level - b.level);
}

function priority(record) {
  const levelPriority = new Map([
    [4, 1],
    [5, 2],
    [6, 3],
    [7, 4],
    [8, 5]
  ]);
  return levelPriority.get(record.level) || 99;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error("--limit 必须是正整数");
  }

  const supplemental = await readJson(supplementalPath);
  const detailById = new Map(supplemental.problem_details.map((detail) => [detail.canonical_problem_id, detail]));
  const sourceVersions = supplemental.source_versions || [];
  const levelFilter = new Set(options.levels);
  const pending = supplemental.records
    .filter((record) => levelFilter.size === 0 || levelFilter.has(record.level))
    .filter((record) => detailById.get(record.canonical_problem_id)?.statement?.status !== "source_extracted")
    .map((record) => ({
      canonical_problem_id: record.canonical_problem_id,
      title: record.title,
      level: record.level,
      language: record.language,
      question_type: record.question_type,
      question_number: record.question_number,
      source_url: firstSourceUrl(sourceVersions, record.canonical_problem_id),
      oj_id: firstOjId(sourceVersions, record.canonical_problem_id),
      current_statement_status: detailById.get(record.canonical_problem_id)?.statement?.status || "missing_detail",
      current_sample_status: detailById.get(record.canonical_problem_id)?.sample_cases?.status || "missing_detail",
      current_solution_status: detailById.get(record.canonical_problem_id)?.programming_solution?.status || "missing_detail",
      recommended_next_action: "先用低频公开 OJ 抽取题面、样例和图片；样例完整后再生成带中文注释的 C++ 参考解并执行样例验证。"
    }))
    .filter((record) => record.source_url)
    .sort((a, b) => priority(a) - priority(b) || a.level - b.level || a.canonical_problem_id.localeCompare(b.canonical_problem_id));

  const payload = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/plan-next-public-oj-enrichment.mjs",
    source_dataset: supplementalPath,
    policy: {
      language_scope: "C++ only",
      access_mode: "public_no_login_low_frequency",
      trust_boundary: "第三方 OJ 只能作为练习入口和辅助证据，不能覆盖官方等级与知识点范围。",
      ai_fallback: "公开来源缺少答案、图片或讲解时才允许 AI 生成，必须标注 needs_review 和需甄别。"
    },
    summary: {
      total_supplemental_records: supplemental.records.length,
      by_level: summarize(supplemental.records, detailById),
      pending_with_public_source_url: pending.length,
      selected_batch_size: Math.min(options.limit, pending.length)
    },
    selected_targets: pending.slice(0, options.limit),
    remaining_targets: pending.slice(options.limit)
  };

  await mkdir(options.output.split("/").slice(0, -1).join("/"), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`planned next public OJ targets: ${payload.selected_targets.length}/${pending.length}`);
  console.log(`wrote ${options.output}`);
}

main().catch((error) => {
  console.error(`Next public OJ enrichment planning failed: ${error.message}`);
  process.exitCode = 1;
});
