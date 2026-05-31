import { readFile } from "node:fs/promises";

const officialSourcesPath = "data/source-registry/sources.official.json";
const indexPath = "data/official-ingestion/official-source-index.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const officialSources = await readJson(officialSourcesPath);
  const index = await readJson(indexPath);
  const sourceIds = new Set(officialSources.sources.map((source) => source.id));

  assert(index.schema_version === 1, "official ingestion schema_version must be 1");
  assert(index.storage_policy?.includes("metadata-only"), "official ingestion must declare metadata-only storage policy");
  assert(Array.isArray(index.documents), "official ingestion documents must be an array");
  assert(Array.isArray(index.true_question_sessions), "official ingestion must include true_question_sessions");
  assert(Array.isArray(index.sample_attachments), "official ingestion must include sample_attachments");
  assert(index.documents.length >= officialSources.sources.length, "official ingestion must include at least one document per official source");

  let htmlCount = 0;
  let pdfCount = 0;
  let trueQuestionLikeCount = 0;
  let sampleLikeCount = 0;
  const seen = new Set();

  for (const document of index.documents) {
    assert(sourceIds.has(document.source_id), `${document.url}: unknown source_id ${document.source_id}`);
    assert(typeof document.url === "string" && document.url.startsWith("https://gesp.ccf.org.cn/"), `${document.url}: must be official GESP URL`);
    assert(!seen.has(document.url), `${document.url}: duplicate document URL`);
    seen.add(document.url);
    assert(typeof document.sha256 === "string" && /^[a-f0-9]{64}$/.test(document.sha256), `${document.url}: invalid sha256`);
    assert(Number.isInteger(document.byte_length) && document.byte_length > 0, `${document.url}: invalid byte_length`);
    assert(document.content_kind === "html" || document.content_kind === "pdf" || document.content_kind === "other", `${document.url}: invalid content_kind`);
    assert(Object.hasOwn(document, "published_at"), `${document.url}: missing published_at`);
    assert(Object.hasOwn(document, "session"), `${document.url}: missing session`);

    if (document.content_kind === "html") {
      htmlCount += 1;
      assert(Array.isArray(document.discovered_links), `${document.url}: html document must include discovered_links`);
    }
    if (document.content_kind === "pdf") {
      pdfCount += 1;
    }
    if (document.url.includes("/1010/")) {
      trueQuestionLikeCount += 1;
    }
    if (document.source_id === "official-gesp-sample-questions") {
      sampleLikeCount += 1;
    }
  }

  assert(htmlCount >= 3, `expected at least 3 HTML documents, got ${htmlCount}`);
  assert(pdfCount >= 1, `expected at least 1 PDF document, got ${pdfCount}`);
  assert(trueQuestionLikeCount >= 1, "expected at least one true-question/sample page document");
  assert(sampleLikeCount >= 1, "expected sample-question source to be represented");
  assert(index.true_question_sessions.length >= 8, `expected at least 8 true-question sessions, got ${index.true_question_sessions.length}`);
  assert(index.sample_attachments.length >= 8, `expected at least 8 sample attachments, got ${index.sample_attachments.length}`);
  assert(index.true_question_sessions.some((session) => session.pdf_count > 0), "expected at least one true-question session with linked PDFs");
  assert(index.summary.document_count === index.documents.length, "summary.document_count mismatch");
  assert(index.summary.html_count === htmlCount, "summary.html_count mismatch");
  assert(index.summary.pdf_count === pdfCount, "summary.pdf_count mismatch");
  assert(index.summary.true_question_session_count === index.true_question_sessions.length, "summary.true_question_session_count mismatch");
  assert(index.summary.sample_attachment_count === index.sample_attachments.length, "summary.sample_attachment_count mismatch");

  console.log(`official ingestion document count: ${index.documents.length}`);
  console.log(`official ingestion html count: ${htmlCount}`);
  console.log(`official ingestion pdf count: ${pdfCount}`);
  console.log(`official ingestion true-question session count: ${index.true_question_sessions.length}`);
  console.log(`official ingestion sample attachment count: ${index.sample_attachments.length}`);
  console.log("Official source ingestion validation passed");
}

main().catch((error) => {
  console.error(`Official source ingestion validation failed: ${error.message}`);
  process.exitCode = 1;
});
