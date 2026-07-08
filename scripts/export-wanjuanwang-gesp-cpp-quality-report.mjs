import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const ingestionPath = "data/wanjuanwang-ingestion/wanjuanwang-gesp-cpp-exams.json";
const catalogPath = "data/classification/wanjuanwang-gesp-cpp-problems.json";
const outputPath = "data/exports/wanjuanwang-gesp-cpp-quality-report.json";
const sourceGapEvidenceById = new Map([
  [
    "wanjuanwang:2023-03:cxx:level-1:programming:01:bqqig3f2zgd8ja6rtt5n",
    {
      detail_url: "https://www.wanjuanwang.com/tiku/bqqig3f2zgd8ja6rtt5n.html",
      screenshot_path: "data/exports/wanjuanwang-source-screenshots/wanjuanwang-2023-03-level1-programming-truncated-source.png",
      note: "万卷网公开详情页本身截断，页面只显示到“输入一行，包含一个整数”。"
    }
  ]
]);
const expectedQuestionShape = {
  total: 27,
  selection: 15,
  judgment: 10,
  programming: 2
};

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const [ingestion, catalog] = await Promise.all([
    readJson(ingestionPath),
    readJson(catalogPath)
  ]);

  const recordsById = new Map(catalog.records.map((record) => [record.canonical_problem_id, record]));
  const details = catalog.problem_details;
  const issues = [];
  const counts = {
    total_pages: ingestion.summary.page_count,
    total_questions: ingestion.summary.question_count,
    selection_questions: ingestion.summary.question_type_counts.selection,
    judgment_questions: ingestion.summary.question_type_counts.judgment,
    programming_questions: ingestion.summary.question_type_counts.programming,
    catalog_records: catalog.records.length,
    catalog_problem_details: catalog.problem_details.length,
    catalog_answer_guidance: catalog.answer_guidance.length,
    catalog_source_versions: catalog.source_versions.length,
    page_shape_issue_count: 0,
    missing_catalog_record_count: 0,
    missing_stem_count: 0,
    empty_renderable_statement_count: 0,
    selection_missing_options_count: 0,
    selection_incomplete_options_count: 0,
    selection_empty_option_count: 0,
    selection_bad_key_count: 0,
    judgment_bad_option_count: 0,
    judgment_empty_option_count: 0,
    programming_missing_samples_count: 0,
    programming_missing_sections_count: 0,
    programming_empty_section_count: 0,
    image_option_count: 0,
    markdown_image_statement_count: 0
  };

  for (const page of ingestion.pages) {
    const pageCounts = countPageQuestions(page);
    if (
      pageCounts.total !== expectedQuestionShape.total
      || pageCounts.selection !== expectedQuestionShape.selection
      || pageCounts.judgment !== expectedQuestionShape.judgment
      || pageCounts.programming !== expectedQuestionShape.programming
    ) {
      counts.page_shape_issue_count += 1;
      pushIssue(issues, {
        kind: "page_shape_mismatch",
        id: page.source_url,
        source_url: page.source_url,
        summary: `${page.session} ${page.level} 级题量结构异常：${JSON.stringify(pageCounts)}`
      });
    }

    for (const question of page.questions) {
      if (!recordsById.has(question.id)) {
        counts.missing_catalog_record_count += 1;
        pushIssue(issues, {
          kind: "missing_catalog_record",
          id: question.id,
          source_url: question.source?.source_url,
          summary: "抓取题目没有进入 catalog。"
        });
      }
    }
  }

  for (const detail of details) {
    const record = recordsById.get(detail.canonical_problem_id);
    const questionType = record?.question_type || detail.question_type;
    const sourceUrl = detail.statement?.source_url || detail.source_links?.[0]?.source_url;

    if (!detail.completeness.has_statement_stem) {
      counts.missing_stem_count += 1;
      pushIssue(issues, {
        kind: "missing_stem",
        id: detail.canonical_problem_id,
        source_url: sourceUrl,
        summary: "题干 stem 为空。"
      });
    }
    if (!hasRenderableStatement(detail)) {
      counts.empty_renderable_statement_count += 1;
      pushIssue(issues, {
        kind: "empty_renderable_statement",
        id: detail.canonical_problem_id,
        source_url: sourceUrl,
        summary: "题面 sections 没有可渲染内容。"
      });
    }

    if (hasMarkdownImage(detail)) {
      counts.markdown_image_statement_count += 1;
    }

    if (questionType === "selection") {
      const optionIssues = validateChoiceOptions(detail, 4);
      if (detail.choice_options.options.length === 0) {
        counts.selection_missing_options_count += 1;
      }
      if (detail.choice_options.options.length < 2) {
        counts.selection_incomplete_options_count += 1;
      }
      counts.selection_empty_option_count += optionIssues.emptyOptionCount;
      counts.selection_bad_key_count += optionIssues.badKeyCount;
      counts.image_option_count += optionIssues.imageOptionCount;
      for (const issue of optionIssues.issues) {
        pushIssue(issues, {
          ...issue,
          id: detail.canonical_problem_id,
          source_url: sourceUrl
        });
      }
    }

    if (questionType === "judgment") {
      const optionIssues = validateChoiceOptions(detail, 2);
      if (detail.choice_options.options.length !== 2) {
        counts.judgment_bad_option_count += 1;
      }
      counts.judgment_empty_option_count += optionIssues.emptyOptionCount;
      for (const issue of optionIssues.issues) {
        pushIssue(issues, {
          ...issue,
          id: detail.canonical_problem_id,
          source_url: sourceUrl
        });
      }
    }

    if (questionType === "programming") {
      if (detail.sample_cases.cases.length === 0) {
        counts.programming_missing_samples_count += 1;
      pushIssue(issues, withEvidence({
        kind: "programming_missing_samples",
        id: detail.canonical_problem_id,
        source_url: sourceUrl,
        summary: "编程题缺少样例输入输出。"
      }));
      }
      if (!detail.statement.sections || detail.statement.sections.length === 0) {
        counts.programming_missing_sections_count += 1;
        pushIssue(issues, {
          kind: "programming_missing_sections",
          id: detail.canonical_problem_id,
          source_url: sourceUrl,
          summary: "编程题缺少题面分段。"
        });
      }
      if ((detail.statement.sections || []).some((section) => !isRenderableText(section.markdown))) {
        counts.programming_empty_section_count += 1;
        pushIssue(issues, {
          kind: "programming_empty_section",
          id: detail.canonical_problem_id,
          source_url: sourceUrl,
          summary: "编程题存在空题面分段。"
        });
      }
    }
  }

  const failureCountKeys = [
    "page_shape_issue_count",
    "missing_catalog_record_count",
    "missing_stem_count",
    "empty_renderable_statement_count",
    "selection_missing_options_count",
    "selection_incomplete_options_count",
    "selection_empty_option_count",
    "selection_bad_key_count",
    "judgment_bad_option_count",
    "judgment_empty_option_count",
    "programming_missing_samples_count",
    "programming_missing_sections_count",
    "programming_empty_section_count"
  ];
  const completenessGate = failureCountKeys.every((key) => counts[key] === 0)
    && counts.catalog_records === counts.total_questions
    && counts.catalog_problem_details === counts.total_questions
    && counts.catalog_answer_guidance === counts.total_questions
    && counts.catalog_source_versions === counts.total_questions;

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/export-wanjuanwang-gesp-cpp-quality-report.mjs",
    inputs: {
      ingestion: ingestionPath,
      catalog: catalogPath
    },
    expected_question_shape: expectedQuestionShape,
    summary: counts,
    completeness_gate: completenessGate ? "pass" : "fail",
    issue_samples: issues.slice(0, 100)
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wanjuanwang quality total questions: ${counts.total_questions}`);
  console.log(`wanjuanwang quality completeness gate: ${output.completeness_gate}`);
  console.log(`wrote ${outputPath}`);
}

function countPageQuestions(page) {
  return page.questions.reduce((counts, question) => {
    counts.total += 1;
    counts[question.question_type] = (counts[question.question_type] || 0) + 1;
    return counts;
  }, {
    total: 0,
    selection: 0,
    judgment: 0,
    programming: 0
  });
}

function pushIssue(issues, issue) {
  if (issues.length >= 500) {
    return;
  }
  issues.push(issue);
}

function withEvidence(issue) {
  const evidence = sourceGapEvidenceById.get(issue.id);
  if (!evidence) {
    return issue;
  }
  return {
    ...issue,
    evidence
  };
}

function hasRenderableStatement(detail) {
  return (detail.statement.sections || []).some((section) => isRenderableText(section.markdown));
}

function hasMarkdownImage(detail) {
  return (detail.statement.sections || []).some((section) => /!\[[^\]]*]\(https?:\/\/[^)]+\)/i.test(section.markdown));
}

function validateChoiceOptions(detail, expectedCount) {
  const issues = [];
  const keys = new Set();
  let emptyOptionCount = 0;
  let badKeyCount = 0;
  let imageOptionCount = 0;

  if (detail.choice_options.options.length !== expectedCount) {
    issues.push({
      kind: "choice_option_count_mismatch",
      summary: `选项数量应为 ${expectedCount}，实际为 ${detail.choice_options.options.length}。`
    });
  }

  for (const option of detail.choice_options.options) {
    if (!/^[A-Z]$/.test(option.key || "") || keys.has(option.key)) {
      badKeyCount += 1;
      issues.push({
        kind: "choice_option_bad_key",
        summary: `选项 key 异常：${option.key || "(empty)"}。`
      });
    }
    keys.add(option.key);

    if (isLikelyImageUrl(option.text)) {
      imageOptionCount += 1;
    }
    if (!isRenderableText(option.text)) {
      emptyOptionCount += 1;
      issues.push({
        kind: "choice_option_empty",
        summary: `选项 ${option.key || "(unknown)"} 没有可渲染内容。`
      });
    }
  }

  return {
    issues,
    emptyOptionCount,
    badKeyCount,
    imageOptionCount
  };
}

function isRenderableText(value) {
  const text = String(value || "").trim();
  return text.length > 0
    || /!\[[^\]]*]\(https?:\/\/[^)]+\)/i.test(text)
    || isLikelyImageUrl(text);
}

function isLikelyImageUrl(value) {
  const text = String(value || "").trim();
  return /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|image)(?:\?.*)?$/i.test(text)
    || /^https?:\/\/image\.wanjuanwang\.com\/images\/.+/i.test(text);
}

main().catch((error) => {
  console.error(`WanJuanWang quality report export failed: ${error.message}`);
  process.exitCode = 1;
});
