import { readFile } from "node:fs/promises";

const parsedProblemsPath = "data/problem-ingestion/official-pdf-problems.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const parsed = await readJson(parsedProblemsPath);

  assert(parsed.schema_version === 1, "parsed PDF schema_version must be 1");
  assert(parsed.storage_policy?.includes("short evidence snippets"), "parsed PDF output must declare snippet-only storage policy");
  assert(parsed.extractor?.name === "macos-pdfkit-swift", "parsed PDF output must record extractor name");
  assert(Array.isArray(parsed.documents), "parsed PDF output must include documents array");
  assert(Array.isArray(parsed.failures), "parsed PDF output must include failures array");
  assert(parsed.summary.pdf_considered_count >= 1, "expected at least one considered PDF");
  assert(parsed.summary.pdf_extracted_count >= 1, "expected at least one extracted PDF");
  assert(parsed.summary.problem_count >= 1, "expected at least one parsed problem");
  assert(parsed.summary.cxx_level5_problem_count >= 1, "expected at least one C++ level 5 parsed problem");
  assert(parsed.selection?.language === "C++", "default official PDF parser output must target C++");

  const ids = new Set();
  let selectionCount = 0;
  let judgmentCount = 0;
  let programmingCount = 0;

  for (const document of parsed.documents) {
    assert(typeof document.source_pdf_url === "string" && document.source_pdf_url.startsWith("https://gesp.ccf.org.cn/"), `${document.source_pdf_url}: invalid source_pdf_url`);
    assert(document.inferred_language === "C++", `${document.source_pdf_url}: default parsed document must be C++`);
    assert(typeof document.source_document_sha256 === "string" && /^[a-f0-9]{64}$/.test(document.source_document_sha256), `${document.source_pdf_url}: invalid source_document_sha256`);
    assert(Number.isInteger(document.page_count) && document.page_count > 0, `${document.source_pdf_url}: invalid page_count`);
    assert(typeof document.text_sha256 === "string" && /^[a-f0-9]{64}$/.test(document.text_sha256), `${document.source_pdf_url}: invalid text_sha256`);
    assert(typeof document.evidence_snippet === "string" && document.evidence_snippet.length <= 240, `${document.source_pdf_url}: evidence_snippet too long`);
    assert(Array.isArray(document.problems), `${document.source_pdf_url}: missing problems`);

    for (const problem of document.problems) {
      assert(!ids.has(problem.id), `${problem.id}: duplicate problem id`);
      ids.add(problem.id);
      assert(problem.source_pdf_url === document.source_pdf_url, `${problem.id}: source_pdf_url mismatch`);
      assert(problem.source_document_sha256 === document.source_document_sha256, `${problem.id}: source hash mismatch`);
      assert(["selection", "judgment", "programming"].includes(problem.question_type), `${problem.id}: invalid question_type`);
      assert(Number.isInteger(problem.question_number) && problem.question_number > 0, `${problem.id}: invalid question_number`);
      assert(Number.isInteger(problem.page_start) && problem.page_start > 0, `${problem.id}: invalid page_start`);
      assert(typeof problem.evidence_snippet === "string" && problem.evidence_snippet.length <= 180, `${problem.id}: evidence_snippet too long`);
      assert(problem.parser_version === parsed.parser_version, `${problem.id}: parser_version mismatch`);
      assert(problem.review_status === "needs_review", `${problem.id}: review_status must be needs_review`);

      if (problem.question_type === "selection") {
        selectionCount += 1;
      } else if (problem.question_type === "judgment") {
        judgmentCount += 1;
      } else if (problem.question_type === "programming") {
        programmingCount += 1;
      }
    }
  }

  assert(selectionCount >= 1, "expected selection questions");
  assert(judgmentCount >= 1, "expected judgment questions");
  assert(programmingCount >= 1, "expected programming questions");

  console.log(`parsed PDF document count: ${parsed.documents.length}`);
  console.log(`parsed PDF problem count: ${parsed.summary.problem_count}`);
  console.log(`parsed PDF C++ level 5 problem count: ${parsed.summary.cxx_level5_problem_count}`);
  console.log(`parsed PDF selection count: ${selectionCount}`);
  console.log(`parsed PDF judgment count: ${judgmentCount}`);
  console.log(`parsed PDF programming count: ${programmingCount}`);
  console.log("Official PDF parser validation passed");
}

main().catch((error) => {
  console.error(`Official PDF parser validation failed: ${error.message}`);
  process.exitCode = 1;
});
