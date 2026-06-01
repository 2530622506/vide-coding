import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

const outputPath = "data/learning/python-learning-paths.json";

const officialSourcesPath = "data/source-registry/sources.official.json";
const officialIndexPath = "data/official-ingestion/official-source-index.json";
const modelPath = "data/classification/conflict-confidence-model.json";
const supplementalPath = "data/classification/supplemental-cxx-problems.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function allTags(record) {
  return [
    ...record.resolved_algorithm_domains,
    ...record.resolved_problem_type_tags,
    ...record.resolved_knowledge_point_tags
  ];
}

function conceptKey(tag) {
  return `${tag.kind}:${tag.value}`;
}

function prerequisiteFor(concept) {
  const value = concept.value;
  if (/binary_search|two_pointer|prefix_sum/.test(value)) return ["basic_programming", "array_traversal"];
  if (/dynamic_programming|dp|knapsack/.test(value)) return ["recursion", "state_transition", "array_traversal"];
  if (/graph|shortest_path|tree/.test(value)) return ["data_structure", "recursion"];
  if (/greedy|sort|simulation/.test(value)) return ["loop_condition_programming", "array_traversal"];
  if (/number|gcd|lcm|prime|factor/.test(value)) return ["modulo_arithmetic", "loop_condition_programming"];
  return ["basic_programming"];
}

function pythonTransferNotes(concept) {
  const label = concept.label;
  if (/位|bit|and|or|xor/i.test(`${concept.value} ${label}`)) {
    return "Python 使用 &, |, ^ 等位运算符，整数精度不受 C++ int/long long 固定位宽限制，需注意题目要求的范围。";
  }
  if (/sort|排序|贪心/.test(`${concept.value} ${label}`)) {
    return "Python 可用 list.sort() / sorted() 和 key 函数表达排序关键字，复杂度仍需按 O(n log n) 分析。";
  }
  if (/dynamic_programming|dp|动态规划/i.test(`${concept.value} ${label}`)) {
    return "Python DP 需要注意列表初始化、滚动数组和递归深度，核心状态转移与 C++ 可对齐。";
  }
  if (/graph|tree|图|树/.test(`${concept.value} ${label}`)) {
    return "Python 图/树题可用 list 邻接表和 deque；大输入时要使用 sys.stdin.buffer。";
  }
  return "概念可跨 C++ / Python 对齐，但语法、输入输出和标准库用法需要单独练习。";
}

function isWeakTag(tag) {
  return tag.effective_review_status === "needs_review"
    || tag.review_status === "needs_review"
    || Number(tag.final_confidence || 0) < 0.66;
}

function buildPythonPdfCandidates(documents) {
  const candidatesByUrl = new Map();
  for (const document of documents) {
    const links = Array.isArray(document.discovered_links) ? document.discovered_links : [];
    for (const link of links) {
      if (link.link_kind !== "pdf_attachment" || !/\.pdf(?:$|\?)/i.test(link.url)) {
        continue;
      }
      if (!candidatesByUrl.has(link.url)) {
        candidatesByUrl.set(link.url, {
          url: link.url,
          discovered_from: document.url,
          source_id: document.source_id || null,
          source_title: document.title || null,
          source_published_at: document.published_at || null,
          storage_policy: "metadata_only",
          parse_command: "npm run parse:official-pdfs:python",
          review_status: "needs_review"
        });
      }
    }
  }
  return [...candidatesByUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
}

async function main() {
  const [officialSourcesData, officialIndex, model, supplemental] = await Promise.all([
    readJson(officialSourcesPath),
    readJson(officialIndexPath),
    readJson(modelPath),
    readJson(supplementalPath)
  ]);
  const officialSources = officialSourcesData.sources || officialSourcesData;
  const pythonSources = officialSources
    .filter((source) => Array.isArray(source.language_scope) && source.language_scope.includes("Python"))
    .map((source) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      source_type: source.source_type,
      trust_level: source.trust_level,
      crawl_strategy: source.crawl_strategy,
      license_status: source.license_status,
      level_scope: source.level_scope,
      content_scope: source.content_scope,
      can_store_full_text: source.can_store_full_text
    }));
  const sourceDocuments = officialIndex.documents || [];
  const pythonDocumentRecords = sourceDocuments
    .filter((document) => /Python|C\+\+\/Python/i.test(JSON.stringify(document)));
  const officialPythonDocuments = pythonDocumentRecords
    .filter((document) => /Python|C\+\+\/Python/i.test(JSON.stringify(document)))
    .map((document) => ({
      title: document.title,
      url: document.url,
      publication_date: document.publication_date || null,
      sha256: document.sha256 || document.hash || null,
      source_type: document.source_type || document.document_type || null,
      storage_policy: "metadata_only"
    }));
  const pythonOfficialPdfCandidates = buildPythonPdfCandidates(pythonDocumentRecords);

  const records = [...model.records, ...supplemental.records];
  const conceptMap = new Map();
  const weakRefsByConcept = new Map();
  for (const record of records) {
    for (const tag of allTags(record)) {
      const key = conceptKey(tag);
      if (!conceptMap.has(key)) {
        conceptMap.set(key, {
          kind: tag.kind,
          value: tag.value,
          label: tag.label,
          cxx_levels: new Set(),
          cxx_problem_count: 0,
          review_statuses: new Set(),
          python_status: "comparable_concept",
          python_transfer_note: ""
        });
      }
      const concept = conceptMap.get(key);
      concept.cxx_levels.add(record.level);
      concept.cxx_problem_count += 1;
      concept.review_statuses.add(tag.review_status || tag.effective_review_status || "unknown");
      if (isWeakTag(tag)) {
        if (!weakRefsByConcept.has(key)) weakRefsByConcept.set(key, []);
        weakRefsByConcept.get(key).push({
          canonical_problem_id: record.canonical_problem_id,
          level: record.level,
          title: record.title,
          final_confidence: tag.final_confidence ?? null,
          review_status: tag.review_status || tag.effective_review_status || "unknown"
        });
      }
    }
  }

  const sharedConcepts = [...conceptMap.values()]
    .map((concept) => ({
      ...concept,
      cxx_levels: [...concept.cxx_levels].sort((a, b) => a - b),
      review_statuses: [...concept.review_statuses].sort(),
      python_transfer_note: pythonTransferNotes(concept)
    }))
    .sort((a, b) => b.cxx_problem_count - a.cxx_problem_count || a.value.localeCompare(b.value));

  const learningPaths = sharedConcepts
    .filter((concept) => weakRefsByConcept.has(`${concept.kind}:${concept.value}`))
    .slice(0, 40)
    .map((concept, index) => {
      const weakProblemRefs = weakRefsByConcept.get(`${concept.kind}:${concept.value}`).slice(0, 8);
      return {
        id: `lp-${String(index + 1).padStart(3, "0")}-${concept.value}`,
        title: `${concept.label} 跨语言巩固`,
        target_concept: {
          kind: concept.kind,
          value: concept.value,
          label: concept.label
        },
        cxx_levels: concept.cxx_levels,
        python_status: concept.python_status,
        prerequisites: prerequisiteFor(concept),
        weak_problem_refs: weakProblemRefs,
        recommendation_steps: [
          "先用 C++ 题目确认题意、边界和复杂度要求。",
          "把核心状态、循环或数据结构操作抽成语言无关步骤。",
          "用 Python 重写输入输出和核心逻辑，注意标准库与性能边界。",
          "回到复核队列确认低置信度标签和证据是否需要人工调整。"
        ],
        review_status: "needs_review"
      };
    });

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/build-python-learning-paths.mjs",
    policy: {
      python_sources_are_metadata_only: true,
      python_pdf_candidates_are_metadata_only: true,
      cxx_records_remain_separate: true,
      python_entries_status: "planned_from_official_sources",
      learning_paths_status: "needs_review"
    },
    summary: {
      python_official_source_count: pythonSources.length,
      python_official_document_count: officialPythonDocuments.length,
      python_official_pdf_candidate_count: pythonOfficialPdfCandidates.length,
      shared_concept_count: sharedConcepts.length,
      learning_path_count: learningPaths.length,
      cxx_record_count: records.length
    },
    python_official_sources: pythonSources,
    python_official_documents: officialPythonDocuments,
    python_official_pdf_candidates: pythonOfficialPdfCandidates,
    shared_concepts: sharedConcepts,
    learning_paths: learningPaths
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`python official sources: ${pythonSources.length}`);
  console.log(`python official documents: ${officialPythonDocuments.length}`);
  console.log(`python official PDF candidates: ${pythonOfficialPdfCandidates.length}`);
  console.log(`shared concepts: ${sharedConcepts.length}`);
  console.log(`learning paths: ${learningPaths.length}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`Python learning path build failed: ${error.message}`);
  process.exitCode = 1;
});
