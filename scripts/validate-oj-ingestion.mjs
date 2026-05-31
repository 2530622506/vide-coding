import { readFile } from "node:fs/promises";

const ingestionPath = "data/oj-ingestion/mirror-problem-candidates.json";
const secondarySourcesPath = "data/source-registry/sources.secondary.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const ingestion = await readJson(ingestionPath);
  const registry = await readJson(secondarySourcesPath);
  const sourceIds = new Set(registry.sources.map((source) => source.id));

  assert(ingestion.schema_version === 1, "OJ ingestion schema_version must be 1");
  assert(ingestion.storage_policy?.includes("metadata and short evidence snippets"), "OJ ingestion must declare metadata/snippet-only storage policy");
  assert(Array.isArray(ingestion.documents), "OJ ingestion documents must be an array");
  assert(Array.isArray(ingestion.entries), "OJ ingestion entries must be an array");
  assert(Array.isArray(ingestion.duplicate_candidates), "OJ ingestion duplicate_candidates must be an array");
  assert(ingestion.documents.length >= 8, `expected at least 8 source documents, got ${ingestion.documents.length}`);
  assert(ingestion.entries.length >= 50, `expected at least 50 mirror/practice entries, got ${ingestion.entries.length}`);
  assert(ingestion.duplicate_candidates.length >= 1, "expected duplicate candidates for alignment");

  const entryIds = new Set();
  let canonicalCount = 0;
  let luoguEntryCount = 0;
  let zqicebergEntryCount = 0;
  let mirrorEntryCount = 0;
  let githubReferenceEntryCount = 0;
  let officialMatchDuplicateCount = 0;

  for (const document of ingestion.documents) {
    assert(sourceIds.has(document.source_id), `${document.source_id}: unknown document source_id`);
    assert(typeof document.url === "string" && document.url.startsWith("http"), `${document.source_id}: invalid document url`);
    assert(typeof document.sha256 === "string" && /^[a-f0-9]{64}$/.test(document.sha256), `${document.url}: invalid sha256`);
    assert(Number.isInteger(document.byte_length) && document.byte_length > 0, `${document.url}: invalid byte_length`);
    assert(document.trust_level !== "canonical", `${document.url}: secondary document must not be canonical`);
  }

  for (const entry of ingestion.entries) {
    assert(typeof entry.id === "string" && entry.id.length > 0, "entry.id must be non-empty");
    assert(!entryIds.has(entry.id), `${entry.id}: duplicate entry id`);
    entryIds.add(entry.id);
    assert(sourceIds.has(entry.source_id), `${entry.id}: unknown source_id`);
    assert(typeof entry.source_url === "string" && entry.source_url.startsWith("http"), `${entry.id}: invalid source_url`);
    assert(typeof entry.url === "string" && entry.url.startsWith("http"), `${entry.id}: invalid url`);
    assert(typeof entry.title === "string" && entry.title.length > 0, `${entry.id}: title must be non-empty`);
    assert(typeof entry.oj_system === "string" && entry.oj_system.length > 0, `${entry.id}: oj_system must be non-empty`);
    assert(typeof entry.oj_id === "string" && entry.oj_id.length > 0, `${entry.id}: oj_id must be non-empty`);
    assert(typeof entry.source_type === "string" && entry.source_type.length > 0, `${entry.id}: source_type must be non-empty`);
    assert(typeof entry.trust_level === "string" && entry.trust_level.length > 0, `${entry.id}: trust_level must be non-empty`);
    assert(entry.trust_level !== "canonical", `${entry.id}: secondary entry must not be canonical`);
    assert(typeof entry.evidence_snippet === "string" && entry.evidence_snippet.length <= 220, `${entry.id}: evidence_snippet too long`);
    assert(entry.review_status === "needs_alignment", `${entry.id}: review_status must be needs_alignment`);

    if (entry.trust_level === "canonical") {
      canonicalCount += 1;
    }
    if (entry.oj_system === "luogu") {
      luoguEntryCount += 1;
    }
    if (entry.source_id === "zqiceberg-gesp-level5") {
      zqicebergEntryCount += 1;
    }
    if (entry.source_type === "oj_mirror" && entry.trust_level === "mirror") {
      mirrorEntryCount += 1;
    }
    if (entry.source_id === "github-jonaslgtm-gesp-exam-questions") {
      githubReferenceEntryCount += 1;
      assert(entry.oj_system === "github", `${entry.id}: GitHub reference must use oj_system github`);
      assert(entry.language_hint?.includes("C++"), `${entry.id}: GitHub reference must be scoped to C++`);
      assert(!/\/(?:Python|Scratch|图形化)\//.test(entry.repository_path || ""), `${entry.id}: GitHub reference must not include non-C++ paths`);
      assert(["past_exam_pdf", "sample_pdf", "solution_pdf"].includes(entry.reference_kind), `${entry.id}: invalid GitHub reference_kind`);
    }
  }

  for (const duplicate of ingestion.duplicate_candidates) {
    assert(Array.isArray(duplicate.candidate_entry_ids) && duplicate.candidate_entry_ids.length >= 1, `${duplicate.title}: duplicate must include candidate entries`);
    assert(duplicate.review_status === "needs_review", `${duplicate.title}: duplicate review_status must be needs_review`);
    if (Array.isArray(duplicate.official_problem_ids) && duplicate.official_problem_ids.length > 0) {
      officialMatchDuplicateCount += 1;
    }
  }

  assert(canonicalCount === 0, "secondary OJ ingestion must not emit canonical entries");
  assert(luoguEntryCount >= 50, `expected at least 50 Luogu entries, got ${luoguEntryCount}`);
  assert(zqicebergEntryCount >= 1, "expected zqiceberg level-5 entries");
  assert(mirrorEntryCount >= 1, "expected selected OJ mirror entries");
  assert(githubReferenceEntryCount >= 8, `expected GitHub C++ reference entries, got ${githubReferenceEntryCount}`);
  assert(officialMatchDuplicateCount >= 1, "expected at least one duplicate candidate matching official programming problems");
  assert(ingestion.summary.entry_count === ingestion.entries.length, "summary.entry_count mismatch");
  assert(ingestion.summary.duplicate_candidate_count === ingestion.duplicate_candidates.length, "summary.duplicate_candidate_count mismatch");

  console.log(`OJ source document count: ${ingestion.documents.length}`);
  console.log(`OJ mirror/practice entry count: ${ingestion.entries.length}`);
  console.log(`OJ Luogu entry count: ${luoguEntryCount}`);
  console.log(`OJ zqiceberg entry count: ${zqicebergEntryCount}`);
  console.log(`OJ selected mirror entry count: ${mirrorEntryCount}`);
  console.log(`OJ GitHub C++ reference entry count: ${githubReferenceEntryCount}`);
  console.log(`OJ duplicate candidate count: ${ingestion.duplicate_candidates.length}`);
  console.log("OJ mirror ingestion validation passed");
}

main().catch((error) => {
  console.error(`OJ mirror ingestion validation failed: ${error.message}`);
  process.exitCode = 1;
});
