import { mkdir, readFile, writeFile } from "node:fs/promises";

const levelDomainPath = "data/classification/level-domain-classification.json";
const canonicalAlignmentPath = "data/canonical-problems/canonical-problem-alignment.json";
const outputDir = "data/classification";
const outputPath = `${outputDir}/problem-type-knowledge.json`;
const level5TaxonomyPath = `${outputDir}/cxx-level5-taxonomy-table.json`;
const generator = "scripts/extract-problem-types-knowledge.mjs";

const problemTypeSeeds = [
  {
    id: "binary_answer_check",
    label: "二分答案判定型",
    domain_ids: ["binary_search"],
    keywords: ["最大可能长度", "不少于", "判定", "二分答案", "答案"]
  },
  {
    id: "prime_factorization",
    label: "质因数分解型",
    domain_ids: ["number_theory"],
    keywords: ["质因数", "唯一分解", "质数", "素数", "整除", "有限不循环小数"]
  },
  {
    id: "gcd_lcm_transform",
    label: "gcd/lcm 变形型",
    domain_ids: ["number_theory"],
    keywords: ["gcd", "最大公因数", "最小公倍数", "欧几里得", "辗转相除"]
  },
  {
    id: "linked_list_operation_simulation",
    label: "链表操作模拟型",
    domain_ids: ["linked_list"],
    keywords: ["链表", "单链表", "双链表", "循环链表", "结点", "指针", "哑结点", "插入", "删除"]
  },
  {
    id: "sort_key_greedy",
    label: "排序过程/关键字型",
    domain_ids: ["sort_simulation", "greedy"],
    keywords: ["快速排序", "稳定排序", "稳定性", "排行榜", "有序排行榜", "排序算法", "pivot", "枢轴", "关键字", "礼盒排序", "总价", "最大值", "最小值"]
  },
  {
    id: "complexity_judgment",
    label: "复杂度判断型",
    domain_ids: ["complexity"],
    keywords: ["时间复杂度", "空间复杂度", "复杂度", "递推式"]
  },
  {
    id: "sieve_fill_judgment",
    label: "筛法填空/判断型",
    domain_ids: ["number_theory"],
    keywords: ["欧拉", "线性筛", "埃氏筛", "合数", "重复标记"]
  },
  {
    id: "recursion_divide_process",
    label: "递归/分治过程分析型",
    domain_ids: ["recursion", "divide_conquer"],
    keywords: ["递归", "分治", "递推式", "最大连续子段和", "快速排序", "pivot", "枢轴"]
  },
  {
    id: "high_precision_arithmetic",
    label: "高精度运算模拟型",
    domain_ids: ["high_precision"],
    keywords: ["高精度", "大整数", "除法", "被除数"]
  },
  {
    id: "grid_or_sequence_simulation",
    label: "网格/序列模拟型",
    domain_ids: ["sort_simulation"],
    keywords: ["网格", "山之谷", "相邻", "上、下、左、右", "数字移动"]
  }
];

const knowledgeSeeds = [
  { id: "singly_linked_list", label: "单链表", domain_ids: ["linked_list"], keywords: ["单链表", "单向链表"] },
  { id: "doubly_linked_list", label: "双链表", domain_ids: ["linked_list"], keywords: ["双链表", "双向循环链表"] },
  { id: "circular_linked_list", label: "循环链表", domain_ids: ["linked_list"], keywords: ["循环链表"] },
  { id: "pointer_rewire", label: "指针重连", domain_ids: ["linked_list"], keywords: ["指针", "结点", "插入", "删除", "哑结点"] },
  { id: "euclid_gcd", label: "欧几里得算法 / gcd", domain_ids: ["number_theory"], keywords: ["gcd", "欧几里得", "辗转相除", "最大公因数"] },
  { id: "sieve_prime", label: "筛法求质数", domain_ids: ["number_theory"], keywords: ["筛", "欧拉", "线性筛", "埃氏筛", "质数", "素数"] },
  { id: "unique_factorization", label: "唯一分解定理", domain_ids: ["number_theory"], keywords: ["唯一分解", "质因数"] },
  { id: "finite_decimal", label: "有限小数判定", domain_ids: ["number_theory"], keywords: ["有限不循环小数", "小数", "分数"] },
  { id: "lower_bound", label: "第一个大于等于", domain_ids: ["binary_search"], keywords: ["第一个大于等于", "lower_bound", "升序数组"] },
  { id: "monotonic_check", label: "单调性判定", domain_ids: ["binary_search"], keywords: ["最大可能长度", "不少于", "判定", "二分答案"] },
  { id: "recursion_call_stack", label: "递归调用与调用栈", domain_ids: ["recursion"], keywords: ["递归", "函数调用", "栈来模拟递归"] },
  { id: "recurrence_complexity", label: "递推式复杂度", domain_ids: ["recursion", "complexity"], keywords: ["递推式", "时间复杂度"] },
  { id: "divide_and_conquer_merge", label: "分治拆分与合并", domain_ids: ["divide_conquer"], keywords: ["分治", "最大连续子段和", "合并"] },
  { id: "quick_sort_partition", label: "快速排序划分", domain_ids: ["divide_conquer", "sort_simulation"], keywords: ["快速排序", "pivot", "枢轴"] },
  { id: "sort_stability", label: "排序稳定性", domain_ids: ["sort_simulation"], keywords: ["稳定排序", "稳定性"] },
  { id: "multi_key_sort", label: "多关键字排序", domain_ids: ["sort_simulation", "greedy"], keywords: ["关键字", "礼盒排序", "总价", "最大值", "最小值"] },
  { id: "inversion_pair", label: "逆序对", domain_ids: ["sort_simulation"], keywords: ["逆序对"] },
  { id: "big_integer_division", label: "大整数除法", domain_ids: ["high_precision"], keywords: ["大整数", "除法", "高精度"] },
  { id: "grid_neighbors", label: "八方向邻接", domain_ids: ["sort_simulation"], keywords: ["山之谷", "相邻", "上、下、左、右", "网格"] },
  { id: "string_transform", label: "字符串变换", domain_ids: ["string"], keywords: ["凯撒密码", "回文串", "字符串"] },
  { id: "shortest_path", label: "最短路", domain_ids: ["graph"], keywords: ["最短路", "子图", "网络"] },
  { id: "binary_tree_property", label: "二叉树性质", domain_ids: ["tree"], keywords: ["二叉树", "完全二叉树"] }
];

const titleTypeOverrides = new Map([
  ["有限不循环小数", ["prime_factorization"]],
  ["找数", ["binary_answer_check"]],
  ["礼盒排序", ["sort_key_greedy"]],
  ["山之谷", ["grid_or_sequence_simulation"]],
  ["完全二叉树", ["grid_or_sequence_simulation"]]
]);

const titleKnowledgeOverrides = new Map([
  ["有限不循环小数", ["finite_decimal", "unique_factorization"]],
  ["找数", ["lower_bound", "monotonic_check"]],
  ["礼盒排序", ["multi_key_sort"]],
  ["山之谷", ["grid_neighbors"]],
  ["完全二叉树", ["binary_tree_property"]]
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function corpusFor(record, canonicalProblem) {
  return normalizeWhitespace([
    record.title,
    canonicalProblem?.normalized_title,
    ...(canonicalProblem?.source_versions || []).flatMap((source) => [
      source.title,
      source.evidence_snippet,
      source.oj_id,
      source.reference_kind
    ])
  ].filter(Boolean).join(" "));
}

function domainIds(record) {
  return new Set((record.labels?.algorithm_domain || []).map((tag) => tag.value));
}

function firstOfficialEvidence(canonicalProblem, fallbackUrl) {
  const official = canonicalProblem?.source_versions?.find((source) => source.source_kind === "official_pdf");
  return {
    source: "official_pdf",
    source_id: official?.source_id || "official-gesp-true-questions",
    source_url: official?.source_url || fallbackUrl || "",
    evidence: official?.evidence_snippet || ""
  };
}

function tagEvidence({ record, canonicalProblem, matchedText, source = "official_pdf" }) {
  const official = firstOfficialEvidence(canonicalProblem);
  return {
    source,
    source_id: official.source_id,
    source_url: official.source_url,
    evidence: normalizeWhitespace(matchedText || record.title || official.evidence).slice(0, 180)
  };
}

function tagShape({ kind, seed, record, canonicalProblem, matchedText, confidence, syllabusFit = "needs_review", reviewStatus = "candidate", source = "official_pdf" }) {
  return {
    kind,
    value: seed.id,
    label: seed.label,
    source,
    evidence: tagEvidence({ record, canonicalProblem, matchedText, source }),
    confidence,
    syllabus_fit: syllabusFit,
    review_status: reviewStatus
  };
}

function seedMatches(seed, text, domains) {
  const domainMatches = seed.domain_ids.some((domainId) => domains.has(domainId));
  const keyword = seed.keywords.find((item) => text.toLowerCase().includes(item.toLowerCase()));
  return { domainMatches, keyword };
}

function extractProblemTypeTags(record, canonicalProblem) {
  const text = corpusFor(record, canonicalProblem);
  const domains = domainIds(record);
  const tags = [];

  for (const seed of problemTypeSeeds) {
    const { domainMatches, keyword } = seedMatches(seed, text, domains);
    if (!keyword) {
      continue;
    }
    if (!domainMatches) {
      continue;
    }
    tags.push(tagShape({
      kind: "problem_type",
      seed,
      record,
      canonicalProblem,
      matchedText: keyword,
      confidence: 0.76,
      syllabusFit: "needs_review"
    }));
  }

  for (const seedId of titleTypeOverrides.get(record.title) || []) {
    if (tags.some((tag) => tag.value === seedId)) {
      continue;
    }
    const seed = problemTypeSeeds.find((item) => item.id === seedId);
    if (!seed) {
      continue;
    }
    tags.push(tagShape({
      kind: "problem_type",
      seed,
      record,
      canonicalProblem,
      matchedText: record.title,
      confidence: 0.68,
      source: "seed_rule",
      syllabusFit: "community_inferred"
    }));
  }

  return tags.sort((a, b) => b.confidence - a.confidence || a.value.localeCompare(b.value));
}

function extractKnowledgePointTags(record, canonicalProblem) {
  const text = corpusFor(record, canonicalProblem);
  const domains = domainIds(record);
  const tags = [];

  for (const seed of knowledgeSeeds) {
    const { domainMatches, keyword } = seedMatches(seed, text, domains);
    if (!keyword) {
      continue;
    }
    if (!domainMatches) {
      continue;
    }
    tags.push(tagShape({
      kind: "knowledge_point",
      seed,
      record,
      canonicalProblem,
      matchedText: keyword,
      confidence: 0.74,
      syllabusFit: "needs_review"
    }));
  }

  for (const seedId of titleKnowledgeOverrides.get(record.title) || []) {
    if (tags.some((tag) => tag.value === seedId)) {
      continue;
    }
    const seed = knowledgeSeeds.find((item) => item.id === seedId);
    if (!seed) {
      continue;
    }
    tags.push(tagShape({
      kind: "knowledge_point",
      seed,
      record,
      canonicalProblem,
      matchedText: record.title,
      confidence: 0.66,
      source: "seed_rule",
      syllabusFit: "community_inferred"
    }));
  }

  return tags.sort((a, b) => b.confidence - a.confidence || a.value.localeCompare(b.value));
}

function sourceSignals(canonicalProblem) {
  const versions = canonicalProblem?.source_versions || [];
  return {
    official_problem_text: versions.some((source) => source.source_kind === "official_pdf" && source.evidence_snippet),
    solution_text: versions.some((source) => source.reference_kind === "solution_pdf"),
    code_signal: versions.some((source) => /code|solution|参考程序|program/i.test(`${source.reference_kind || ""} ${source.evidence_snippet || ""}`)),
    practice_link: versions.some((source) => source.role === "practice_link")
  };
}

function classifyRecord(record, canonicalById) {
  const canonicalProblem = canonicalById.get(record.canonical_problem_id);
  const problemTypeTags = extractProblemTypeTags(record, canonicalProblem);
  const knowledgePointTags = extractKnowledgePointTags(record, canonicalProblem);
  return {
    canonical_problem_id: record.canonical_problem_id,
    official_problem_id: record.official_problem_id,
    session: record.session,
    language: record.language,
    level: record.level,
    question_type: record.question_type,
    question_number: record.question_number,
    title: record.title,
    algorithm_domains: record.labels.algorithm_domain,
    problem_type_tags: problemTypeTags,
    knowledge_point_tags: knowledgePointTags,
    extraction_sources: sourceSignals(canonicalProblem),
    review_status: problemTypeTags.length > 0 || knowledgePointTags.length > 0 ? "candidate" : "needs_review"
  };
}

function summarize(records) {
  const coverageByDomain = {};
  for (const record of records) {
    for (const domain of record.algorithm_domains) {
      if (!coverageByDomain[domain.value]) {
        coverageByDomain[domain.value] = {
          domain_label: domain.label,
          problem_count: 0,
          problem_type_tag_count: 0,
          knowledge_point_tag_count: 0,
          knowledge_points: {}
        };
      }
      const bucket = coverageByDomain[domain.value];
      bucket.problem_count += 1;
      bucket.problem_type_tag_count += record.problem_type_tags.length;
      bucket.knowledge_point_tag_count += record.knowledge_point_tags.length;
      for (const tag of record.knowledge_point_tags) {
        bucket.knowledge_points[tag.value] = tag.label;
      }
    }
  }

  for (const bucket of Object.values(coverageByDomain)) {
    bucket.knowledge_points = Object.entries(bucket.knowledge_points).map(([id, label]) => ({ id, label }));
  }

  return {
    record_count: records.length,
    cxx_level5_record_count: records.filter((record) => record.language === "C++" && record.level === 5).length,
    cxx_level5_with_problem_type_count: records.filter((record) => record.language === "C++" && record.level === 5 && record.problem_type_tags.length > 0).length,
    cxx_level5_with_knowledge_count: records.filter((record) => record.language === "C++" && record.level === 5 && record.knowledge_point_tags.length > 0).length,
    problem_type_tag_count: records.reduce((sum, record) => sum + record.problem_type_tags.length, 0),
    knowledge_point_tag_count: records.reduce((sum, record) => sum + record.knowledge_point_tags.length, 0),
    coverage_by_domain: coverageByDomain
  };
}

function buildLevel5Taxonomy(records) {
  const byDomain = new Map();
  for (const record of records.filter((item) => item.language === "C++" && item.level === 5)) {
    const domains = record.algorithm_domains.length > 0
      ? record.algorithm_domains
      : [{ value: "unclassified", label: "未分类" }];
    for (const domain of domains) {
      if (!byDomain.has(domain.value)) {
        byDomain.set(domain.value, {
          domain_id: domain.value,
          domain_label: domain.label,
          problem_count: 0,
          problem_types: new Map()
        });
      }
      const domainBucket = byDomain.get(domain.value);
      domainBucket.problem_count += 1;
      const types = record.problem_type_tags.length > 0
        ? record.problem_type_tags
        : [{ value: "untyped", label: "待抽取题型", confidence: 0, review_status: "needs_review" }];
      for (const type of types) {
        if (!domainBucket.problem_types.has(type.value)) {
          domainBucket.problem_types.set(type.value, {
            problem_type_id: type.value,
            problem_type_label: type.label,
            problem_count: 0,
            knowledge_points: new Map(),
            problems: []
          });
        }
        const typeBucket = domainBucket.problem_types.get(type.value);
        typeBucket.problem_count += 1;
        for (const kp of record.knowledge_point_tags) {
          typeBucket.knowledge_points.set(kp.value, { id: kp.value, label: kp.label });
        }
        typeBucket.problems.push({
          canonical_problem_id: record.canonical_problem_id,
          question_type: record.question_type,
          question_number: record.question_number,
          title: record.title,
          problem_type_confidence: type.confidence,
          review_status: record.review_status
        });
      }
    }
  }

  const domains = [...byDomain.values()].map((domain) => ({
    domain_id: domain.domain_id,
    domain_label: domain.domain_label,
    problem_count: domain.problem_count,
    problem_types: [...domain.problem_types.values()].map((type) => ({
      problem_type_id: type.problem_type_id,
      problem_type_label: type.problem_type_label,
      problem_count: type.problem_count,
      knowledge_points: [...type.knowledge_points.values()].sort((a, b) => a.id.localeCompare(b.id)),
      problems: type.problems.sort((a, b) => a.question_type.localeCompare(b.question_type) || a.question_number - b.question_number)
    })).sort((a, b) => b.problem_count - a.problem_count || a.problem_type_id.localeCompare(b.problem_type_id))
  })).sort((a, b) => b.problem_count - a.problem_count || a.domain_id.localeCompare(b.domain_id));

  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator,
    source_extraction: outputPath,
    summary: {
      domain_count: domains.length,
      problem_count: records.filter((record) => record.language === "C++" && record.level === 5).length,
      typed_problem_count: records.filter((record) => record.language === "C++" && record.level === 5 && record.problem_type_tags.length > 0).length,
      knowledge_covered_problem_count: records.filter((record) => record.language === "C++" && record.level === 5 && record.knowledge_point_tags.length > 0).length
    },
    domains
  };
}

async function main() {
  const levelDomain = await readJson(levelDomainPath);
  const canonical = await readJson(canonicalAlignmentPath);
  const canonicalById = new Map(canonical.canonical_problems.map((problem) => [problem.id, problem]));
  const records = levelDomain.records.map((record) => classifyRecord(record, canonicalById));
  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator,
    inputs: {
      level_domain_classification: levelDomainPath,
      canonical_alignment: canonicalAlignmentPath
    },
    extraction_policy: {
      tags_are_candidates: true,
      no_full_statement_storage: true,
      source_priority: ["official_pdf", "secondary_source_title", "seed_rule"],
      code_signal_note: "Only metadata and short snippets are available; full code or full solution text is not stored."
    },
    problem_type_seed: problemTypeSeeds,
    knowledge_seed: knowledgeSeeds,
    summary: summarize(records),
    records
  };
  const level5Taxonomy = buildLevel5Taxonomy(records);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  await writeFile(level5TaxonomyPath, `${JSON.stringify(level5Taxonomy, null, 2)}\n`);

  console.log(`problem knowledge record count: ${output.summary.record_count}`);
  console.log(`C++ level 5 with problem types: ${output.summary.cxx_level5_with_problem_type_count}`);
  console.log(`C++ level 5 with knowledge points: ${output.summary.cxx_level5_with_knowledge_count}`);
  console.log(`problem type tag count: ${output.summary.problem_type_tag_count}`);
  console.log(`knowledge point tag count: ${output.summary.knowledge_point_tag_count}`);
  console.log(`level 5 taxonomy domain count: ${level5Taxonomy.summary.domain_count}`);
  console.log(`wrote ${outputPath}`);
  console.log(`wrote ${level5TaxonomyPath}`);
}

main().catch((error) => {
  console.error(`Problem type and knowledge extraction failed: ${error.message}`);
  process.exitCode = 1;
});
