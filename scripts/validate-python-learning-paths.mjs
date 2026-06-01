import { readFile } from "node:fs/promises";

const path = "data/learning/python-learning-paths.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const data = JSON.parse(await readFile(path, "utf8"));
  assert(data.schema_version === 1, "schema_version must be 1");
  assert(data.policy.python_sources_are_metadata_only === true, "Python official sources must be metadata-only");
  assert(data.policy.python_pdf_candidates_are_metadata_only === true, "Python PDF candidates must be metadata-only");
  assert(data.policy.cxx_records_remain_separate === true, "C++ and Python entries must remain separate");
  assert(data.summary.python_official_source_count >= 3, "expected Python-capable official sources");
  assert(data.summary.python_official_document_count >= 1, "expected at least one Python official document/index hit");
  assert(data.summary.python_official_pdf_candidate_count >= 1, "expected Python official PDF candidates");
  assert(data.summary.shared_concept_count > 100, "expected cross-language shared concepts");
  assert(data.summary.learning_path_count > 0, "learning paths required");
  assert(data.python_official_sources.every((source) => source.trust_level === "canonical"), "Python official sources must be canonical");
  assert(data.python_official_documents.every((document) => document.storage_policy === "metadata_only"), "Python documents must be metadata-only");
  assert(data.python_official_pdf_candidates.every((document) => document.storage_policy === "metadata_only"), "Python PDF candidates must be metadata-only");
  assert(data.python_official_pdf_candidates.every((document) => document.url.endsWith(".pdf")), "Python PDF candidates must be PDFs");
  assert(data.python_official_pdf_candidates.every((document) => document.parse_command === "npm run parse:official-pdfs:python"), "Python PDF candidates need a separate parse command");
  assert(data.shared_concepts.every((concept) => Array.isArray(concept.cxx_levels) && concept.cxx_levels.length > 0), "shared concepts need C++ levels");
  assert(data.shared_concepts.every((concept) => concept.python_status === "comparable_concept"), "shared concepts must be comparable");
  assert(data.learning_paths.every((pathItem) => pathItem.review_status === "needs_review"), "learning paths must need review");
  assert(data.learning_paths.every((pathItem) => pathItem.weak_problem_refs.length > 0), "learning paths need weak problem refs");
  assert(data.learning_paths.every((pathItem) => pathItem.prerequisites.length > 0), "learning paths need prerequisites");
  console.log(`python official sources: ${data.summary.python_official_source_count}`);
  console.log(`python official documents: ${data.summary.python_official_document_count}`);
  console.log(`python official PDF candidates: ${data.summary.python_official_pdf_candidate_count}`);
  console.log(`shared concepts: ${data.summary.shared_concept_count}`);
  console.log(`learning paths: ${data.summary.learning_path_count}`);
  console.log("Python learning paths validation passed");
}

main().catch((error) => {
  console.error(`Python learning paths validation failed: ${error.message}`);
  process.exitCode = 1;
});
