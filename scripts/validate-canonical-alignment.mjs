import { readFile } from "node:fs/promises";

const alignmentPath = "data/canonical-problems/canonical-problem-alignment.json";
const level5TablePath = "data/canonical-problems/cxx-level5-canonical-table.json";
const officialProblemsPath = "data/problem-ingestion/official-pdf-problems.json";
const ojCandidatesPath = "data/oj-ingestion/mirror-problem-candidates.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function flattenOfficialProblems(officialInput) {
  return (officialInput.documents || []).flatMap((document) => document.problems || []).filter((problem) => problem.language === "C++");
}

async function main() {
  const alignment = await readJson(alignmentPath);
  const level5Table = await readJson(level5TablePath);
  const officialInput = await readJson(officialProblemsPath);
  const ojInput = await readJson(ojCandidatesPath);
  const officialProblems = flattenOfficialProblems(officialInput);
  const officialIds = new Set(officialProblems.map((problem) => problem.id));
  const secondaryEntryIds = new Set((ojInput.entries || []).map((entry) => entry.id));

  assert(alignment.schema_version === 1, "canonical alignment schema_version must be 1");
  assert(level5Table.schema_version === 1, "level 5 table schema_version must be 1");
  assert(alignment.storage_policy?.includes("no full statements"), "alignment must declare no-full-text storage policy");
  assert(alignment.trust_policy?.includes("official GESP sources define canonical problems"), "alignment must declare official trust policy");
  assert(Array.isArray(alignment.canonical_problems), "canonical_problems must be an array");
  assert(alignment.canonical_problems.length === officialProblems.length, `canonical count must equal official C++ problem count ${officialProblems.length}`);

  const canonicalIds = new Set();
  let cxxLevel5Count = 0;
  let officialSourceVersionCount = 0;
  let secondarySourceVersionCount = 0;
  let autoAlignedProblemCount = 0;
  let level5ProgrammingWithPracticeLinkCount = 0;

  for (const problem of alignment.canonical_problems) {
    assert(typeof problem.id === "string" && problem.id.startsWith("canonical:"), `${problem.id}: invalid canonical id`);
    assert(!canonicalIds.has(problem.id), `${problem.id}: duplicate canonical id`);
    canonicalIds.add(problem.id);
    assert(officialIds.has(problem.official_problem_id), `${problem.id}: unknown official_problem_id`);
    assert(problem.language === "C++", `${problem.id}: canonical problem must be C++`);
    assert(Array.isArray(problem.source_versions) && problem.source_versions.length >= 1, `${problem.id}: source_versions must not be empty`);

    const officialSources = problem.source_versions.filter((source) => source.source_kind === "official_pdf");
    assert(officialSources.length === 1, `${problem.id}: must have exactly one official source version`);
    assert(officialSources[0].role === "canonical_statement", `${problem.id}: official source must be canonical_statement`);
    assert(officialSources[0].trust_level === "canonical", `${problem.id}: official source must be canonical`);

    for (const source of problem.source_versions) {
      assert(typeof source.id === "string" && source.id.length > 0, `${problem.id}: source version id required`);
      assert(typeof source.trust_level === "string" && source.trust_level.length > 0, `${source.id}: trust_level required`);
      if (source.source_kind === "secondary_entry") {
        secondarySourceVersionCount += 1;
        assert(source.trust_level !== "canonical", `${source.id}: secondary source must not be canonical`);
        assert(secondaryEntryIds.has(source.source_entry_id), `${source.id}: unknown secondary source_entry_id`);
        assert(typeof source.url === "string" && source.url.startsWith("http"), `${source.id}: secondary url must be http`);
        assert(source.match_features?.statement_hash_available === false, `${source.id}: statement hash should be explicitly unavailable`);
        if (source.review_status === "auto_aligned") {
          assert(source.match_features.session_matches === true, `${source.id}: auto aligned source must match session`);
          assert(source.match_features.level_matches === true, `${source.id}: auto aligned source must match level`);
          assert(source.confidence >= 0.9, `${source.id}: auto aligned confidence too low`);
        }
      } else {
        officialSourceVersionCount += 1;
      }
    }

    if (problem.alignment_status === "auto_aligned") {
      autoAlignedProblemCount += 1;
      assert(problem.source_versions.some((source) => source.source_kind === "secondary_entry"), `${problem.id}: auto aligned problem must have secondary source`);
    }

    if (problem.level === 5) {
      cxxLevel5Count += 1;
      if (problem.question_type === "programming" && problem.source_versions.some((source) => source.role === "practice_link")) {
        level5ProgrammingWithPracticeLinkCount += 1;
      }
    }
  }

  assert(cxxLevel5Count === 27, `expected 27 C++ level 5 canonical problems, got ${cxxLevel5Count}`);
  assert(officialSourceVersionCount === officialProblems.length, "official source version count mismatch");
  assert(secondarySourceVersionCount >= 16, `expected at least 16 secondary source versions, got ${secondarySourceVersionCount}`);
  assert(autoAlignedProblemCount >= 16, `expected at least 16 auto-aligned programming problems, got ${autoAlignedProblemCount}`);
  assert(level5ProgrammingWithPracticeLinkCount === 2, `expected 2 C++ level 5 programming rows with practice links, got ${level5ProgrammingWithPracticeLinkCount}`);
  assert(alignment.summary.canonical_problem_count === alignment.canonical_problems.length, "summary canonical count mismatch");
  assert(alignment.summary.secondary_source_version_count === secondarySourceVersionCount, "summary secondary source version count mismatch");
  assert(alignment.summary.conflict_candidate_count === alignment.review_queue.conflict_candidates.length, "summary conflict count mismatch");
  assert(alignment.summary.duplicate_candidate_count === alignment.review_queue.duplicate_candidates.length, "summary duplicate count mismatch");
  assert(alignment.review_queue.duplicate_candidates.length >= 1, "duplicate candidates must be reviewable");
  assert(alignment.review_queue.conflict_candidates.length >= 1, "conflict candidates must be reviewable");

  assert(Array.isArray(level5Table.rows), "level 5 table rows must be an array");
  assert(level5Table.rows.length === 27, `expected 27 level 5 table rows, got ${level5Table.rows.length}`);
  assert(level5Table.summary.row_count === level5Table.rows.length, "level 5 table summary row count mismatch");
  assert(level5Table.summary.programming_row_count === 2, "level 5 table must include 2 programming rows");
  assert(level5Table.summary.programming_with_practice_link_count === 2, "level 5 programming rows must have practice links");

  for (const row of level5Table.rows) {
    assert(canonicalIds.has(row.canonical_problem_id), `${row.canonical_problem_id}: table row references unknown canonical problem`);
    assert(row.language === "C++", `${row.canonical_problem_id}: level table row must be C++`);
    assert(row.level === 5, `${row.canonical_problem_id}: level table row must be level 5`);
    assert(typeof row.official_pdf_url === "string" && row.official_pdf_url.startsWith("http"), `${row.canonical_problem_id}: official_pdf_url required`);
    assert(Array.isArray(row.practice_links), `${row.canonical_problem_id}: practice_links must be an array`);
  }

  console.log(`canonical problem count: ${alignment.canonical_problems.length}`);
  console.log(`official source version count: ${officialSourceVersionCount}`);
  console.log(`secondary source version count: ${secondarySourceVersionCount}`);
  console.log(`auto-aligned problem count: ${autoAlignedProblemCount}`);
  console.log(`C++ level 5 canonical count: ${cxxLevel5Count}`);
  console.log(`C++ level 5 table rows: ${level5Table.rows.length}`);
  console.log(`duplicate candidate count: ${alignment.review_queue.duplicate_candidates.length}`);
  console.log(`conflict candidate count: ${alignment.review_queue.conflict_candidates.length}`);
  console.log("Canonical problem alignment validation passed");
}

main().catch((error) => {
  console.error(`Canonical problem alignment validation failed: ${error.message}`);
  process.exitCode = 1;
});
