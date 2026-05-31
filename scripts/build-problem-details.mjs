import { mkdir, readFile, writeFile } from "node:fs/promises";

const modelPath = "data/classification/conflict-confidence-model.json";
const officialPdfProblemsPath = "data/problem-ingestion/official-pdf-problems.json";
const answerGuidancePath = "data/classification/problem-answer-guidance.json";
const canonicalPath = "data/canonical-problems/canonical-problem-alignment.json";
const outputDir = "data/classification";
const outputPath = `${outputDir}/problem-details.json`;

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function officialProblemLookup(officialPdfProblems) {
  const byId = new Map();
  for (const document of officialPdfProblems.documents) {
    for (const problem of document.problems) {
      byId.set(problem.id, {
        ...problem,
        document: {
          source_pdf_url: document.source_pdf_url,
          source_document_sha256: document.source_document_sha256,
          page_count: document.page_count
        }
      });
    }
  }
  return byId;
}

function sourceLinks(canonicalProblem) {
  return (canonicalProblem?.source_versions || []).map((source) => ({
    role: source.role || null,
    source_kind: source.source_kind || null,
    title: source.title || null,
    url: source.source_url || source.url || null,
    trust_level: source.trust_level || null,
    reference_kind: source.reference_kind || null
  }));
}

function statementBlock(record, officialProblem) {
  return {
    status: officialProblem?.evidence_snippet ? "partial" : "pending_collection",
    stem: record.title,
    evidence_snippet: officialProblem?.evidence_snippet || null,
    source_url: officialProblem?.source_pdf_url || null,
    source_page: officialProblem?.page_start || null,
    storage_policy: "short_excerpt_only",
    notes: [
      "当前只保存题干标题和短证据片段，完整题面需要后续在确认来源授权后采集。",
      "题目详情页先使用该结构承载题干、选项、图片和参考解，后续爬虫可增量补齐。"
    ]
  };
}

function choiceOptions(record) {
  if (record.question_type === "judgment") {
    return {
      status: "standard_binary",
      options: [
        { key: "T", text: "正确", source_status: "inferred_from_question_type" },
        { key: "F", text: "错误", source_status: "inferred_from_question_type" }
      ],
      notes: ["判断题使用标准正确/错误选项；官方答案仍需从答案表或人工复核确认。"]
    };
  }

  if (record.question_type === "selection") {
    if (record.official_choice_options?.options?.length > 0) {
      return {
        status: record.official_choice_options.status,
        options: record.official_choice_options.options,
        extraction_method: record.official_choice_options.extraction_method || "official_pdf_text",
        notes: record.official_choice_options.notes || ["选择题选项从官方 PDF 文本层抽取，仍需人工复核。"]
      };
    }

    return {
      status: "pending_collection",
      options: [],
      notes: ["现有 PDF metadata 未保存完整选项文本，后续需要从官方 PDF/OJ 题面抽取 A/B/C/D 选项后入库。"]
    };
  }

  return {
    status: "not_applicable",
    options: [],
    notes: ["编程题没有选择项。"]
  };
}

function visualAssets(record, officialProblem) {
  return {
    status: "pending_collection",
    assets: [],
    expected_asset_kinds: ["figure", "table_image", "formula_image"],
    source_hint: {
      source_url: officialProblem?.source_pdf_url || null,
      source_page: officialProblem?.page_start || null
    },
    notes: [
      "当前未抽取 PDF 内图片；后续采集器需要把题目相关图片存为资产文件，并在数据库记录 asset_url、source_url、page、hash 和 alt_text。",
      record.question_type === "programming"
        ? "编程题若包含示意图、输入输出表格截图或坐标图，也应挂在这里展示。"
        : "选择题/判断题若题干依赖图片，详情页会在该区域展示。"
    ]
  };
}

function programmingSolution(record, guidance) {
  if (record.question_type !== "programming") {
    return {
      status: "not_applicable",
      language: "C++",
      code: null,
      notes: ["非编程题不需要 C++ 参考程序。"]
    };
  }

  return {
    status: guidance?.reference_answer?.status || "needs_review",
    language: "C++",
    code: null,
    reference_answer: guidance?.reference_answer?.answer || null,
    notes: [
      "当前不臆造完整 C++ 代码答案；已有 OJ/官方参考入口会先展示为参考链接。",
      "后续采集到官方解析或人工复核后的 C++ 参考解后，再写入 code 字段，并要求中文注释。"
    ]
  };
}

function sampleCases(record) {
  return {
    status: record.question_type === "programming" ? "pending_collection" : "not_applicable",
    cases: [],
    notes: record.question_type === "programming"
      ? ["样例输入输出需要后续从官方 PDF 或 OJ 题面抽取后入库。"]
      : ["非编程题不需要样例输入输出。"]
  };
}

function completeness(record, guidance, detail) {
  const hasReferenceAnswer = Boolean(guidance?.reference_answer?.answer);
  return {
    has_statement_stem: Boolean(detail.statement.stem),
    has_choice_options: detail.choice_options.options.length > 0,
    has_visual_assets: detail.visual_assets.assets.length > 0,
    has_reference_answer: hasReferenceAnswer,
    needs_option_collection: record.question_type === "selection" && detail.choice_options.options.length === 0,
    needs_visual_asset_collection: detail.visual_assets.status === "pending_collection",
    needs_programming_solution: record.question_type === "programming" && !detail.programming_solution.code,
    needs_source_enrichment:
      (record.question_type === "selection" && detail.choice_options.options.length === 0) ||
      detail.visual_assets.status === "pending_collection" ||
      (record.question_type === "programming" && !detail.programming_solution.code)
  };
}

async function main() {
  const [model, officialPdfProblems, answerGuidance, canonical] = await Promise.all([
    readJson(modelPath),
    readJson(officialPdfProblemsPath),
    readJson(answerGuidancePath),
    readJson(canonicalPath)
  ]);

  const officialById = officialProblemLookup(officialPdfProblems);
  const guidanceById = new Map(answerGuidance.records.map((record) => [record.canonical_problem_id, record]));
  const canonicalById = new Map(canonical.canonical_problems.map((problem) => [problem.id, problem]));

  const records = model.records.map((record) => {
    const officialProblem = officialById.get(record.official_problem_id);
    const guidance = guidanceById.get(record.canonical_problem_id);
    const canonicalProblem = canonicalById.get(record.canonical_problem_id);
    const detail = {
      canonical_problem_id: record.canonical_problem_id,
      official_problem_id: record.official_problem_id,
      session: record.session,
      language: record.language,
      level: record.level,
      question_type: record.question_type,
      question_number: record.question_number,
      title: record.title,
      official_choice_options: officialProblem?.choice_options || null,
      statement: statementBlock(record, officialProblem),
      choice_options: choiceOptions({
        ...record,
        official_choice_options: officialProblem?.choice_options || null
      }),
      visual_assets: visualAssets(record, officialProblem),
      programming_solution: programmingSolution(record, guidance),
      sample_cases: sampleCases(record),
      source_links: sourceLinks(canonicalProblem),
      answer_guidance_status: guidance?.reference_answer?.status || "needs_review"
    };
    return {
      ...detail,
      completeness: completeness(record, guidance, detail)
    };
  });

  const summary = {
    record_count: records.length,
    selection_pending_option_count: records.filter((record) => record.question_type === "selection" && record.completeness.needs_option_collection).length,
    selection_source_extracted_option_count: records.filter((record) => record.question_type === "selection" && record.choice_options.status === "source_extracted").length,
    selection_needs_review_option_count: records.filter((record) => record.question_type === "selection" && record.choice_options.status === "needs_review").length,
    pending_visual_asset_collection_count: records.filter((record) => record.completeness.needs_visual_asset_collection).length,
    programming_pending_solution_count: records.filter((record) => record.question_type === "programming" && record.completeness.needs_programming_solution).length,
    judgment_standard_binary_option_count: records.filter((record) => record.question_type === "judgment" && record.choice_options.status === "standard_binary").length
  };

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/build-problem-details.mjs",
    inputs: {
      model: modelPath,
      official_pdf_problems: officialPdfProblemsPath,
      answer_guidance: answerGuidancePath,
      canonical_alignment: canonicalPath
    },
    storage_policy: {
      statement_text: "short_excerpt_only_until_source_terms_confirmed",
      visual_assets: "store asset metadata and local/remote URLs in MySQL; avoid raw BLOB storage by default",
      programming_solutions: "only store official, OJ-verified, or manually reviewed C++ code with Chinese comments"
    },
    summary,
    records
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`problem detail record count: ${summary.record_count}`);
  console.log(`selection pending option count: ${summary.selection_pending_option_count}`);
  console.log(`pending visual asset collection count: ${summary.pending_visual_asset_collection_count}`);
  console.log(`programming pending solution count: ${summary.programming_pending_solution_count}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`Problem detail build failed: ${error.message}`);
  process.exitCode = 1;
});
