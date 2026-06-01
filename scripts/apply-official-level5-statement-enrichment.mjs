import { readFile, writeFile } from "node:fs/promises";

const detailsPath = "data/classification/problem-details.json";
const officialPdfProblemsPath = "data/problem-ingestion/official-pdf-problems.json";

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
          source_document_sha256: document.source_document_sha256
        }
      });
    }
  }
  return byId;
}

function statementSections(detail, officialProblem) {
  const stem = officialProblem.evidence_snippet || detail.title;
  return [
    {
      id: "stem",
      title: "题干",
      markdown: stem
    }
  ];
}

function enrichStatement(detail, officialProblem) {
  const enrichedAt = new Date().toISOString();
  return {
    ...detail,
    statement: {
      ...detail.statement,
      status: "source_extracted",
      title: detail.title,
      stem: detail.statement?.stem || detail.title,
      evidence_snippet: officialProblem.evidence_snippet || detail.statement?.evidence_snippet || null,
      source_url: officialProblem.source_pdf_url || officialProblem.document?.source_pdf_url || detail.statement?.source_url || null,
      source_page: officialProblem.page_start || detail.statement?.source_page || null,
      storage_policy: "source_extracted_official_pdf_excerpt",
      extraction_method: "official_pdf_problem_text_excerpt",
      source_terms_status: "needs_review",
      sections: statementSections(detail, officialProblem),
      extracted_at: enrichedAt,
      notes: [
        "题干从官方 GESP C++ 五级 PDF 文本层抽取，保留官方 PDF 来源页码。",
        "PDF 文本层可能丢失公式、代码缩进或图片细节；详情页同时展示已抽取图片资产，仍需人工复核。"
      ]
    },
    official_statement_enrichment: {
      status: "source_extracted",
      source: "official_pdf_text_excerpt",
      source_url: officialProblem.source_pdf_url || officialProblem.document?.source_pdf_url || null,
      source_page: officialProblem.page_start || null,
      source_document_sha256: officialProblem.source_document_sha256 || officialProblem.document?.source_document_sha256 || null,
      applied_at: enrichedAt,
      review_status: "needs_review"
    }
  };
}

function summarize(data) {
  const officialLevel5 = data.records.filter((record) => record.level === 5);
  const officialLevel5SourceExtracted = officialLevel5.filter((record) => record.statement?.status === "source_extracted");
  return {
    ...data.summary,
    official_level5_source_extracted_statement_count: officialLevel5SourceExtracted.length,
    official_level5_non_programming_source_extracted_statement_count: officialLevel5SourceExtracted
      .filter((record) => record.question_type !== "programming").length
  };
}

async function main() {
  const [details, officialPdfProblems] = await Promise.all([
    readJson(detailsPath),
    readJson(officialPdfProblemsPath)
  ]);
  const officialById = officialProblemLookup(officialPdfProblems);
  let applied = 0;

  details.records = details.records.map((detail) => {
    if (detail.level !== 5 || detail.question_type === "programming") {
      return detail;
    }
    const officialProblem = officialById.get(detail.official_problem_id);
    if (!officialProblem?.evidence_snippet) {
      return detail;
    }
    applied += 1;
    return enrichStatement(detail, officialProblem);
  });

  details.generated_at = new Date().toISOString();
  details.official_level5_statement_enrichment = {
    applied_at: details.generated_at,
    applied_count: applied,
    source: "official_pdf_text_excerpt",
    review_status: "needs_review",
    policy: "Official level-5 selection and judgment statements are source-extracted from public official PDFs but remain needs_review because PDF text may lose formulas, code formatting, or image context."
  };
  details.summary = summarize(details);

  await writeFile(detailsPath, `${JSON.stringify(details, null, 2)}\n`);

  console.log(`official level 5 statement enrichment applied: ${applied}`);
  console.log(`official level 5 source-extracted statements: ${details.summary.official_level5_source_extracted_statement_count}`);
  console.log(`wrote ${detailsPath}`);
}

main().catch((error) => {
  console.error(`Official level 5 statement enrichment failed: ${error.message}`);
  process.exitCode = 1;
});
