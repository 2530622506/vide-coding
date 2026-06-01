import { readFile, writeFile } from "node:fs/promises";

const supplementalPath = "data/classification/supplemental-cxx-problems.json";
const enrichmentPath = "data/enrichment/public-oj-problem-details.json";

function parseArgs(argv) {
  const options = {
    level: null,
    ids: new Set()
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--level") {
      options.level = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--ids") {
      for (const id of String(argv[index + 1] || "").split(",")) {
        if (id.trim()) {
          options.ids.add(id.trim());
        }
      }
      index += 1;
    }
  }
  return options;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function summarize(data) {
  const byLevel = {};
  const bySource = {};
  for (const record of data.records) {
    byLevel[record.level] = (byLevel[record.level] || 0) + 1;
  }
  for (const source of data.source_versions) {
    bySource[source.source_id] = (bySource[source.source_id] || 0) + 1;
  }
  return {
    supplemental_record_count: data.records.length,
    by_level: byLevel,
    by_source: bySource,
    ai_generated_learning_aid_count: data.answer_guidance.filter((item) => item.content_origin === "ai_generated_learning_aid").length,
    pending_visual_asset_count: data.problem_details.filter((item) => item.completeness.needs_visual_asset_collection).length,
    pending_programming_solution_count: data.problem_details.filter((item) => item.completeness.needs_programming_solution).length,
    ai_sample_verified_solution_count: data.problem_details.filter((item) => item.programming_solution.verification?.status === "sample_passed").length,
    source_extracted_statement_count: data.problem_details.filter((item) => item.statement.status === "source_extracted").length,
    source_extracted_sample_count: data.problem_details.filter((item) => item.sample_cases.status === "source_extracted").length,
    source_extracted_visual_asset_count: data.problem_details.filter((item) => item.visual_assets.status === "source_extracted").length,
    visual_asset_none_found_count: data.problem_details.filter((item) => item.visual_assets.status === "none_found").length,
    visual_asset_total_count: data.problem_details.reduce((sum, item) => sum + item.visual_assets.assets.length, 0)
  };
}

function mergeDetail(detail, enrichment) {
  const hasVisualAssets = enrichment.visual_assets.assets.length > 0;
  const hasProgrammingSolution = Boolean(detail.programming_solution?.code);
  return {
    ...detail,
    content_origin: "public_oj_statement_extracted_with_ai_generated_learning_aid",
    statement: {
      ...detail.statement,
      ...enrichment.statement,
      stem: enrichment.statement.title || detail.statement.stem,
      evidence_snippet: detail.statement.evidence_snippet,
      extracted_at: enrichment.fetched_at,
      notes: enrichment.statement.notes
    },
    visual_assets: {
      ...detail.visual_assets,
      ...enrichment.visual_assets,
      notes: enrichment.visual_assets.notes
    },
    sample_cases: {
      ...detail.sample_cases,
      ...enrichment.sample_cases,
      notes: enrichment.sample_cases.notes
    },
    source_enrichment: {
      status: enrichment.fetch_status,
      extraction_method: enrichment.extraction_method,
      source_url: enrichment.source_url,
      fetched_at: enrichment.fetched_at,
      source_terms_status: enrichment.source_terms_status,
      review_status: enrichment.review_status
    },
    completeness: {
      ...detail.completeness,
      has_statement_stem: true,
      has_visual_assets: hasVisualAssets,
      needs_visual_asset_collection: enrichment.visual_assets.status === "pending_collection",
      needs_source_enrichment: false,
      needs_programming_solution: !hasProgrammingSolution,
      needs_solution_review: hasProgrammingSolution ? true : detail.completeness.needs_solution_review
    }
  };
}

function updateGuidance(guidance, enrichment) {
  const notes = new Set(guidance.review_notes || []);
  notes.add("已从公开 OJ 页面抽取题面和样例，来源条款与分类仍需人工复核。");
  if (enrichment.visual_assets.status === "none_found") {
    notes.add("公开 OJ 题面未发现图片；若后续需要示意图，必须标注 AI 生成并要求甄别。");
  }
  const example = guidance.understanding_example;
  return {
    ...guidance,
    understanding_example: {
      ...example,
      example_hint: enrichment.sample_cases.cases.length > 0
        ? "详情页已展示公开题面抽取的样例，可用样例先做手算校验。"
        : example.example_hint
    },
    review_notes: [...notes]
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [supplemental, enrichment] = await Promise.all([
    readJson(supplementalPath),
    readJson(enrichmentPath)
  ]);
  const enrichmentById = new Map(enrichment.records
    .filter((record) => record.fetch_status === "source_extracted")
    .filter((record) => options.level === null || record.level === options.level)
    .filter((record) => options.ids.size === 0 || options.ids.has(record.canonical_problem_id))
    .map((record) => [record.canonical_problem_id, record]));
  let appliedCount = 0;

  supplemental.problem_details = supplemental.problem_details.map((detail) => {
    const matched = enrichmentById.get(detail.canonical_problem_id);
    if (!matched) {
      return detail;
    }
    appliedCount += 1;
    return mergeDetail(detail, matched);
  });

  supplemental.answer_guidance = supplemental.answer_guidance.map((guidance) => {
    const matched = enrichmentById.get(guidance.canonical_problem_id);
    return matched ? updateGuidance(guidance, matched) : guidance;
  });

  supplemental.generated_at = new Date().toISOString();
  supplemental.enrichment = {
    public_oj_problem_details: {
      source_file: enrichmentPath,
      applied_at: supplemental.generated_at,
      applied_count: appliedCount,
      source_terms_status: "needs_review",
      crawl_policy: enrichment.crawl_policy
    }
  };
  supplemental.summary = summarize(supplemental);

  await writeFile(supplementalPath, `${JSON.stringify(supplemental, null, 2)}\n`);

  console.log(`applied public OJ enrichment count: ${appliedCount}`);
  console.log(`source extracted statements: ${supplemental.summary.source_extracted_statement_count}`);
  console.log(`source extracted samples: ${supplemental.summary.source_extracted_sample_count}`);
  console.log(`visual asset total count: ${supplemental.summary.visual_asset_total_count}`);
  console.log(`wrote ${supplementalPath}`);
}

main().catch((error) => {
  console.error(`Apply public OJ enrichment failed: ${error.message}`);
  process.exitCode = 1;
});
