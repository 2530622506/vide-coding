import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const officialProblemsPath = "data/problem-ingestion/official-pdf-problems.json";
const ojCandidatesPath = "data/oj-ingestion/mirror-problem-candidates.json";
const outputDir = "data/canonical-problems";
const outputPath = `${outputDir}/canonical-problem-alignment.json`;
const level5TablePath = `${outputDir}/cxx-level5-canonical-table.json`;
const generator = "scripts/align-canonical-problems.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function languageSlug(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9+]+/gi, "-");
}

function normalizeProblemTitle(value) {
  return normalizeWhitespace(value)
    .replace(/^#?[A-Z]*\d+\s*[:：.]?\s*/i, "")
    .replace(/^\d+[:：.]\s*/, "")
    .replace(/\[[^\]]*GESP[^\]]*\]/gi, "")
    .replace(/GESP\s*\d{6}/gi, "")
    .replace(/[一二三四五六七八]级/g, "")
    .replace(/[1-8]级/g, "")
    .replace(/题目详情\s*-\s*/g, "")
    .replace(/\s*-\s*(洛谷|Hydro).*$/i, "")
    .replace(/^[:：.\-\s]+/, "")
    .trim()
    .toLowerCase();
}

function canonicalProblemId(problem) {
  return [
    "canonical",
    problem.session || "unknown-session",
    languageSlug(problem.language),
    problem.level ? `level-${problem.level}` : "unknown-level",
    problem.question_type,
    String(problem.question_number).padStart(2, "0")
  ].join(":");
}

function flattenOfficialProblems(officialInput) {
  const problems = [];
  for (const document of officialInput.documents || []) {
    for (const problem of document.problems || []) {
      problems.push({
        ...problem,
        canonical_problem_id: canonicalProblemId(problem),
        normalized_title: normalizeProblemTitle(problem.title)
      });
    }
  }
  return problems.sort((a, b) => {
    return (a.session || "").localeCompare(b.session || "")
      || (a.language || "").localeCompare(b.language || "")
      || (a.level || 0) - (b.level || 0)
      || a.question_type.localeCompare(b.question_type)
      || (a.question_number || 0) - (b.question_number || 0);
  });
}

function officialSourceVersion(problem) {
  return {
    id: `source-version:${problem.canonical_problem_id}:official`,
    role: "canonical_statement",
    source_kind: "official_pdf",
    source_id: problem.source_id,
    source_url: problem.source_pdf_url,
    trust_level: "canonical",
    source_document_sha256: problem.source_document_sha256,
    page_start: problem.page_start,
    evidence_snippet: problem.evidence_snippet,
    parser_version: problem.parser_version,
    extraction_confidence: problem.extraction_confidence,
    review_status: problem.review_status
  };
}

function secondarySourceVersion(problem, entry, role, matchBasis, confidence) {
  return {
    id: `source-version:${problem.canonical_problem_id}:${entry.id}`,
    role,
    source_kind: "secondary_entry",
    source_entry_id: entry.id,
    source_id: entry.source_id,
    source_name: entry.source_name,
    source_url: entry.source_url,
    url: entry.url,
    title: entry.title,
    oj_system: entry.oj_system,
    oj_id: entry.oj_id,
    source_type: entry.source_type,
    trust_level: entry.trust_level,
    reference_kind: entry.reference_kind || null,
    repository_path: entry.repository_path || null,
    github_sha: entry.github_sha || null,
    file_size: entry.file_size || null,
    match_basis: matchBasis,
    match_features: {
      title_similarity: 1,
      session_matches: entry.session_hint === problem.session,
      level_matches: entry.level_hint === problem.level,
      oj_id_available: Boolean(entry.oj_id),
      statement_hash_available: false
    },
    confidence,
    review_status: confidence >= 0.9 ? "auto_aligned" : "needs_review"
  };
}

function problemSourceRole(entry) {
  if (entry.oj_system === "github") {
    return "document_reference";
  }
  return "practice_link";
}

function buildOfficialIndexes(problems) {
  const programmingByTitle = new Map();
  const bySessionLevel = new Map();

  for (const problem of problems) {
    const sessionLevelKey = `${problem.session}|${problem.level}`;
    if (!bySessionLevel.has(sessionLevelKey)) {
      bySessionLevel.set(sessionLevelKey, []);
    }
    bySessionLevel.get(sessionLevelKey).push(problem);

    if (problem.question_type !== "programming" || !problem.normalized_title) {
      continue;
    }
    if (!programmingByTitle.has(problem.normalized_title)) {
      programmingByTitle.set(problem.normalized_title, []);
    }
    programmingByTitle.get(problem.normalized_title).push(problem);
  }

  return { programmingByTitle, bySessionLevel };
}

function alignSecondaryEntries({ officialProblems, secondaryEntries }) {
  const { programmingByTitle, bySessionLevel } = buildOfficialIndexes(officialProblems);
  const attachedByOfficialId = new Map();
  const usedEntryIds = new Set();
  const conflictCandidates = [];

  function attach(problem, sourceVersion) {
    if (!attachedByOfficialId.has(problem.canonical_problem_id)) {
      attachedByOfficialId.set(problem.canonical_problem_id, []);
    }
    attachedByOfficialId.get(problem.canonical_problem_id).push(sourceVersion);
    usedEntryIds.add(sourceVersion.source_entry_id);
  }

  for (const entry of secondaryEntries) {
    const normalizedEntryTitle = normalizeProblemTitle(entry.title);
    const sameTitleOfficial = programmingByTitle.get(normalizedEntryTitle) || [];

    if (sameTitleOfficial.length > 0) {
      const exactMatches = sameTitleOfficial.filter((problem) => entry.session_hint === problem.session && entry.level_hint === problem.level);
      if (exactMatches.length > 0) {
        for (const problem of exactMatches) {
          attach(problem, secondarySourceVersion(
            problem,
            entry,
            problemSourceRole(entry),
            "exact_title_session_level",
            entry.oj_system === "luogu" ? 0.94 : 0.9
          ));
        }
        continue;
      }

      const missingSessionOrLevel = !entry.session_hint || !entry.level_hint;
      if (missingSessionOrLevel) {
        for (const problem of sameTitleOfficial) {
          attach(problem, secondarySourceVersion(
            problem,
            entry,
            problemSourceRole(entry),
            "exact_title_missing_session_or_level",
            0.72
          ));
        }
        continue;
      }

      conflictCandidates.push({
        id: `conflict:${sha256(`${entry.id}:${normalizedEntryTitle}`).slice(0, 16)}`,
        normalized_title: normalizedEntryTitle,
        candidate_entry_id: entry.id,
        candidate_title: entry.title,
        candidate_session: entry.session_hint,
        candidate_level: entry.level_hint,
        candidate_url: entry.url,
        official_problem_ids: sameTitleOfficial.map((problem) => problem.id),
        official_sessions: [...new Set(sameTitleOfficial.map((problem) => problem.session))],
        official_levels: [...new Set(sameTitleOfficial.map((problem) => problem.level))],
        conflict_basis: "title_matches_but_session_or_level_differs",
        review_status: "needs_review"
      });
      continue;
    }

    if (entry.oj_system === "github" && entry.session_hint && entry.level_hint && ["past_exam_pdf", "solution_pdf", "sample_pdf"].includes(entry.reference_kind)) {
      const samePaperProblems = bySessionLevel.get(`${entry.session_hint}|${entry.level_hint}`) || [];
      for (const problem of samePaperProblems) {
        attach(problem, secondarySourceVersion(
          problem,
          entry,
          "document_reference",
          "same_session_level_document_reference",
          0.58
        ));
      }
    }
  }

  return { attachedByOfficialId, usedEntryIds, conflictCandidates };
}

function canonicalProblemFromOfficial(problem, attachedSourceVersions) {
  const secondarySourceVersions = attachedSourceVersions || [];
  const sourceVersions = [
    officialSourceVersion(problem),
    ...secondarySourceVersions.sort((a, b) => a.source_id.localeCompare(b.source_id) || a.oj_system.localeCompare(b.oj_system))
  ];
  const autoAligned = secondarySourceVersions.some((source) => source.review_status === "auto_aligned");

  return {
    id: problem.canonical_problem_id,
    official_problem_id: problem.id,
    session: problem.session,
    language: problem.language,
    level: problem.level,
    question_type: problem.question_type,
    question_number: problem.question_number,
    title: problem.title,
    normalized_title: problem.normalized_title,
    official_source_id: problem.source_id,
    official_source_pdf_url: problem.source_pdf_url,
    source_versions: sourceVersions,
    alignment_status: autoAligned ? "auto_aligned" : "official_only",
    alignment_confidence: autoAligned ? Math.max(...secondarySourceVersions.map((source) => source.confidence || 0)) : 1,
    review_status: autoAligned ? "auto_aligned" : problem.review_status
  };
}

function convertDuplicateCandidate(duplicate, entryById) {
  const entries = duplicate.candidate_entry_ids.map((id) => entryById.get(id)).filter(Boolean);
  return {
    id: `duplicate:${sha256(`${duplicate.normalized_title}:${duplicate.candidate_entry_ids.join(",")}`).slice(0, 16)}`,
    normalized_title: duplicate.normalized_title,
    title: duplicate.title,
    candidate_entry_ids: duplicate.candidate_entry_ids,
    candidate_count: duplicate.candidate_entry_ids.length,
    official_problem_ids: duplicate.official_problem_ids || [],
    source_systems: [...new Set(entries.map((entry) => entry.oj_system))],
    match_basis: duplicate.match_basis,
    confidence: duplicate.confidence,
    review_status: duplicate.review_status
  };
}

function buildLevel5Table(canonicalProblems) {
  const rows = canonicalProblems
    .filter((problem) => problem.language === "C++" && problem.level === 5)
    .sort((a, b) => {
      const typeOrder = { selection: 1, judgment: 2, programming: 3 };
      return (typeOrder[a.question_type] || 99) - (typeOrder[b.question_type] || 99)
        || (a.question_number || 0) - (b.question_number || 0);
    })
    .map((problem) => {
      const practiceLinks = problem.source_versions
        .filter((source) => source.role === "practice_link")
        .map((source) => ({
          source_id: source.source_id,
          oj_system: source.oj_system,
          oj_id: source.oj_id,
          url: source.url,
          confidence: source.confidence,
          review_status: source.review_status
        }));
      const documentReferences = problem.source_versions
        .filter((source) => source.role === "document_reference")
        .map((source) => ({
          source_id: source.source_id,
          reference_kind: source.reference_kind,
          url: source.url,
          confidence: source.confidence,
          review_status: source.review_status
        }));

      return {
        canonical_problem_id: problem.id,
        official_problem_id: problem.official_problem_id,
        session: problem.session,
        language: problem.language,
        level: problem.level,
        question_type: problem.question_type,
        question_number: problem.question_number,
        title: problem.title,
        official_pdf_url: problem.official_source_pdf_url,
        source_version_count: problem.source_versions.length,
        practice_links: practiceLinks,
        document_references: documentReferences,
        alignment_status: problem.alignment_status,
        review_status: problem.review_status
      };
    });

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator,
    source_alignment: outputPath,
    summary: {
      row_count: rows.length,
      programming_row_count: rows.filter((row) => row.question_type === "programming").length,
      programming_with_practice_link_count: rows.filter((row) => row.question_type === "programming" && row.practice_links.length > 0).length
    },
    rows
  };
}

function summarize(canonicalProblems, secondaryEntries, usedEntryIds, duplicateCandidates, conflictCandidates) {
  const byLevel = {};
  const byQuestionType = {};
  for (const problem of canonicalProblems) {
    byLevel[problem.level] = (byLevel[problem.level] || 0) + 1;
    byQuestionType[problem.question_type] = (byQuestionType[problem.question_type] || 0) + 1;
  }

  const secondarySourceVersionCount = canonicalProblems.reduce((sum, problem) => {
    return sum + problem.source_versions.filter((source) => source.source_kind === "secondary_entry").length;
  }, 0);

  return {
    canonical_problem_count: canonicalProblems.length,
    cxx_level5_canonical_count: canonicalProblems.filter((problem) => problem.language === "C++" && problem.level === 5).length,
    official_source_version_count: canonicalProblems.length,
    secondary_source_version_count: secondarySourceVersionCount,
    auto_aligned_problem_count: canonicalProblems.filter((problem) => problem.alignment_status === "auto_aligned").length,
    auto_aligned_secondary_entry_count: usedEntryIds.size,
    duplicate_candidate_count: duplicateCandidates.length,
    conflict_candidate_count: conflictCandidates.length,
    unmatched_secondary_count: secondaryEntries.length - usedEntryIds.size,
    by_level: byLevel,
    by_question_type: byQuestionType
  };
}

async function main() {
  const officialInput = await readJson(officialProblemsPath);
  const ojInput = await readJson(ojCandidatesPath);
  const officialProblems = flattenOfficialProblems(officialInput).filter((problem) => problem.language === "C++");
  const secondaryEntries = (ojInput.entries || []).filter((entry) => Array.isArray(entry.language_hint) && entry.language_hint.includes("C++"));
  const entryById = new Map(secondaryEntries.map((entry) => [entry.id, entry]));
  const { attachedByOfficialId, usedEntryIds, conflictCandidates } = alignSecondaryEntries({ officialProblems, secondaryEntries });
  const canonicalProblems = officialProblems.map((problem) => canonicalProblemFromOfficial(problem, attachedByOfficialId.get(problem.canonical_problem_id)));
  const duplicateCandidates = (ojInput.duplicate_candidates || []).map((duplicate) => convertDuplicateCandidate(duplicate, entryById));
  const unmatchedSecondaryCandidates = secondaryEntries
    .filter((entry) => !usedEntryIds.has(entry.id))
    .map((entry) => ({
      source_entry_id: entry.id,
      source_id: entry.source_id,
      title: entry.title,
      url: entry.url,
      oj_system: entry.oj_system,
      oj_id: entry.oj_id,
      session_hint: entry.session_hint,
      level_hint: entry.level_hint,
      reason: "no_exact_canonical_match"
    }));

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator,
    inputs: {
      official_problem_index: officialProblemsPath,
      secondary_candidate_index: ojCandidatesPath
    },
    storage_policy: "metadata and short evidence snippets only; no full statements, full HTML, or PDF bodies are stored",
    trust_policy: "official GESP sources define canonical problems; secondary sources remain practice, mirror, or auxiliary source versions",
    match_policy: {
      auto_align: "exact normalized title plus matching session and level",
      needs_review: "exact title with missing session or level, title conflicts across session or level, or duplicate candidates",
      statement_hash: "not available yet; retained as false in match_features until statement fingerprints exist"
    },
    summary: summarize(canonicalProblems, secondaryEntries, usedEntryIds, duplicateCandidates, conflictCandidates),
    canonical_problems: canonicalProblems,
    review_queue: {
      duplicate_candidates: duplicateCandidates,
      conflict_candidates: conflictCandidates.sort((a, b) => a.normalized_title.localeCompare(b.normalized_title)),
      unmatched_secondary_candidates: unmatchedSecondaryCandidates
    }
  };
  const level5Table = buildLevel5Table(canonicalProblems);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  await writeFile(level5TablePath, `${JSON.stringify(level5Table, null, 2)}\n`);

  console.log(`canonical problem count: ${output.summary.canonical_problem_count}`);
  console.log(`C++ level 5 canonical count: ${output.summary.cxx_level5_canonical_count}`);
  console.log(`auto-aligned problem count: ${output.summary.auto_aligned_problem_count}`);
  console.log(`secondary source version count: ${output.summary.secondary_source_version_count}`);
  console.log(`duplicate candidate count: ${output.summary.duplicate_candidate_count}`);
  console.log(`conflict candidate count: ${output.summary.conflict_candidate_count}`);
  console.log(`C++ level 5 table rows: ${level5Table.summary.row_count}`);
  console.log(`wrote ${outputPath}`);
  console.log(`wrote ${level5TablePath}`);
}

main().catch((error) => {
  console.error(`Canonical problem alignment failed: ${error.message}`);
  process.exitCode = 1;
});
