import { mkdir, readFile, writeFile } from "node:fs/promises";

const canonicalAlignmentPath = "data/canonical-problems/canonical-problem-alignment.json";
const outputDir = "data/classification";
const outputPath = `${outputDir}/level-domain-classification.json`;
const level5TablePath = `${outputDir}/cxx-level5-domain-table.json`;
const generator = "scripts/classify-level-domains.mjs";

const domainSeeds = [
  {
    id: "number_theory",
    label: "数论",
    keywords: ["gcd", "最大公因数", "最小公倍数", "欧几里得", "辗转相除", "筛", "质数", "素数", "质因数", "唯一分解", "小数", "分数", "互质", "整除"]
  },
  {
    id: "binary_search",
    label: "二分",
    keywords: ["二分", "升序数组", "第一个大于等于", "最大可能长度", "查找", "lower_bound", "判定"]
  },
  {
    id: "linked_list",
    label: "链表",
    keywords: ["链表", "单链表", "双链表", "循环链表", "结点", "指针", "哑结点", "线性表"]
  },
  {
    id: "greedy",
    label: "贪心",
    keywords: ["贪心", "最优子结构", "最优解", "局部最优"]
  },
  {
    id: "recursion",
    label: "递归",
    keywords: ["递归", "递推式", "函数调用", "栈来模拟递归"]
  },
  {
    id: "divide_conquer",
    label: "分治",
    keywords: ["分治", "快速排序", "归并", "最大连续子段和", "pivot", "枢轴"]
  },
  {
    id: "high_precision",
    label: "高精度",
    keywords: ["高精度", "大整数"]
  },
  {
    id: "complexity",
    label: "复杂度",
    keywords: ["时间复杂度", "空间复杂度", "复杂度"]
  },
  {
    id: "sort_simulation",
    label: "排序/模拟",
    keywords: ["排序", "有序排行榜", "合并成一个有序", "排行榜", "逆序对", "模拟", "礼盒排序", "山之谷", "凯撒密码", "数字替换", "画画"]
  },
  {
    id: "graph",
    label: "图论",
    keywords: ["图", "最短路", "子图", "网络"]
  },
  {
    id: "tree",
    label: "树",
    keywords: ["二叉树", "完全二叉树", "树"]
  },
  {
    id: "string",
    label: "字符串",
    keywords: ["字符串", "回文串", "凯撒密码", "二进制回文串"]
  }
];

const titleOverrides = new Map([
  ["交朋友", ["sort_simulation"]],
  ["数数", ["sort_simulation"]],
  ["拆分", ["divide_conquer", "recursion"]],
  ["选数", ["recursion"]],
  ["找数", ["binary_search"]],
  ["有限不循环小数", ["number_theory"]],
  ["消息查找", ["binary_search"]],
  ["物流网络", ["graph"]],
  ["子图最短路", ["graph"]],
  ["完全二叉树", ["tree"]]
]);

const problemIdOverrides = new Map([
  ["canonical:2026-03:c++:level-5:judgment:05", ["sort_simulation"]],
  ["canonical:2026-03:c++:level-5:judgment:07", ["binary_search", "greedy"]],
  ["canonical:2026-03:c++:level-5:selection:07", ["binary_search", "greedy"]],
  ["canonical:2026-03:c++:level-5:selection:08", ["binary_search"]]
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function evidenceText(problem) {
  return normalizeWhitespace([
    problem.title,
    problem.normalized_title,
    ...problem.source_versions.flatMap((source) => [
      source.title,
      source.evidence_snippet,
      source.oj_id,
      source.reference_kind
    ])
  ].filter(Boolean).join(" "));
}

function makeEvidence(problem, text, sourceKind = "official_pdf") {
  const officialSource = problem.source_versions.find((source) => source.source_kind === "official_pdf");
  return {
    source: sourceKind,
    source_id: officialSource?.source_id || problem.official_source_id,
    source_url: officialSource?.source_url || problem.official_source_pdf_url,
    evidence: text.slice(0, 180)
  };
}

function levelLabel(problem) {
  return {
    kind: "level",
    value: problem.level,
    label: `${problem.level}级`,
    source: "official_pdf",
    evidence: makeEvidence(problem, `${problem.language} ${problem.level}级 ${problem.session}`),
    confidence: 1,
    syllabus_fit: "exact",
    review_status: "confirmed"
  };
}

function domainLabel(problem, seed, matchedText, confidence, syllabusFit = "needs_review", reviewStatus = "needs_review") {
  return {
    kind: "algorithm_domain",
    value: seed.id,
    label: seed.label,
    source: matchedText.source,
    evidence: makeEvidence(problem, matchedText.evidence, matchedText.source),
    confidence,
    syllabus_fit: syllabusFit,
    review_status: reviewStatus
  };
}

function classifyDomains(problem) {
  const text = evidenceText(problem);
  const labels = [];
  const lowerText = text.toLowerCase();

  for (const seed of domainSeeds) {
    const keyword = seed.keywords.find((item) => lowerText.includes(item.toLowerCase()));
    if (!keyword) {
      continue;
    }
    labels.push(domainLabel(problem, seed, {
      source: "official_pdf",
      evidence: keyword
    }, 0.78, "needs_review", "candidate"));
  }

  const overrideDomains = titleOverrides.get(problem.title) || [];
  const problemOverrideDomains = problemIdOverrides.get(problem.id) || [];
  for (const domainId of [...overrideDomains, ...problemOverrideDomains]) {
    if (labels.some((label) => label.value === domainId)) {
      continue;
    }
    const seed = domainSeeds.find((item) => item.id === domainId);
    if (!seed) {
      continue;
    }
    labels.push(domainLabel(problem, seed, {
      source: "seed_rule",
      evidence: problem.title
    }, 0.62, "needs_review", "candidate"));
  }

  return labels.sort((a, b) => b.confidence - a.confidence || a.value.localeCompare(b.value));
}

function detectOutOfLevelTags(problem, domainLabels) {
  const text = evidenceText(problem).toLowerCase();
  const conflicts = [];
  const hasDpSignal = /动态规划|\bdp\b/.test(text);
  if (problem.level === 5 && hasDpSignal) {
    conflicts.push({
      canonical_problem_id: problem.id,
      conflict_type: "out_of_level_domain_signal",
      signal: "dynamic_programming",
      syllabus_fit: "out_of_level",
      source: "community_or_secondary_signal",
      evidence: "五级题源出现 DP / 动态规划信号",
      review_status: "needs_review"
    });
  }

  for (const label of domainLabels) {
    if (problem.level === 5 && label.value === "dynamic_programming") {
      conflicts.push({
        canonical_problem_id: problem.id,
        conflict_type: "out_of_level_domain_label",
        signal: label.value,
        syllabus_fit: "out_of_level",
        source: label.source,
        evidence: label.evidence.evidence,
        review_status: "needs_review"
      });
    }
  }

  return conflicts;
}

function classifyProblem(problem) {
  const level = levelLabel(problem);
  const domains = classifyDomains(problem);
  const outOfLevelSignals = detectOutOfLevelTags(problem, domains);
  return {
    canonical_problem_id: problem.id,
    official_problem_id: problem.official_problem_id,
    session: problem.session,
    language: problem.language,
    level: problem.level,
    question_type: problem.question_type,
    question_number: problem.question_number,
    title: problem.title,
    labels: {
      level: [level],
      algorithm_domain: domains
    },
    out_of_level_signals: outOfLevelSignals,
    review_status: domains.length > 0 ? "candidate" : "needs_review"
  };
}

function summarize(records) {
  const byDomain = {};
  const byLevel = {};
  for (const record of records) {
    byLevel[record.level] = (byLevel[record.level] || 0) + 1;
    for (const label of record.labels.algorithm_domain) {
      byDomain[label.value] = (byDomain[label.value] || 0) + 1;
    }
  }
  return {
    classified_problem_count: records.length,
    cxx_level5_problem_count: records.filter((record) => record.language === "C++" && record.level === 5).length,
    cxx_level5_with_level_label_count: records.filter((record) => record.language === "C++" && record.level === 5 && record.labels.level.length > 0).length,
    cxx_level5_with_domain_label_count: records.filter((record) => record.language === "C++" && record.level === 5 && record.labels.algorithm_domain.length > 0).length,
    programming_problem_count: records.filter((record) => record.question_type === "programming").length,
    programming_with_domain_label_count: records.filter((record) => record.question_type === "programming" && record.labels.algorithm_domain.length > 0).length,
    out_of_level_signal_count: records.reduce((sum, record) => sum + record.out_of_level_signals.length, 0),
    by_level: byLevel,
    by_domain: byDomain
  };
}

function buildLevel5Table(records) {
  const rows = records
    .filter((record) => record.language === "C++" && record.level === 5)
    .sort((a, b) => {
      const typeOrder = { selection: 1, judgment: 2, programming: 3 };
      return (typeOrder[a.question_type] || 99) - (typeOrder[b.question_type] || 99)
        || (a.question_number || 0) - (b.question_number || 0);
    })
    .map((record) => ({
      canonical_problem_id: record.canonical_problem_id,
      session: record.session,
      level: record.level,
      question_type: record.question_type,
      question_number: record.question_number,
      title: record.title,
      level_label: record.labels.level[0],
      algorithm_domains: record.labels.algorithm_domain,
      out_of_level_signals: record.out_of_level_signals,
      review_status: record.review_status
    }));
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator,
    source_classification: outputPath,
    summary: {
      row_count: rows.length,
      rows_with_domain_count: rows.filter((row) => row.algorithm_domains.length > 0).length,
      out_of_level_signal_count: rows.reduce((sum, row) => sum + row.out_of_level_signals.length, 0)
    },
    rows
  };
}

async function main() {
  const canonicalInput = await readJson(canonicalAlignmentPath);
  const records = canonicalInput.canonical_problems
    .filter((problem) => problem.language === "C++")
    .map(classifyProblem);
  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator,
    input: canonicalAlignmentPath,
    domain_seed: domainSeeds.map((seed) => ({
      id: seed.id,
      label: seed.label,
      keywords: seed.keywords
    })),
    policy: {
      official_level_source: "official_pdf",
      domain_labels_are_candidates: true,
      level5_dynamic_programming_policy: "DP on level-5 items is not an official core domain; flag as out_of_level or community_inferred if detected."
    },
    summary: summarize(records),
    records
  };
  const level5Table = buildLevel5Table(records);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  await writeFile(level5TablePath, `${JSON.stringify(level5Table, null, 2)}\n`);

  console.log(`classified problem count: ${output.summary.classified_problem_count}`);
  console.log(`C++ level 5 with level labels: ${output.summary.cxx_level5_with_level_label_count}`);
  console.log(`C++ level 5 with domain labels: ${output.summary.cxx_level5_with_domain_label_count}`);
  console.log(`programming with domain labels: ${output.summary.programming_with_domain_label_count}/${output.summary.programming_problem_count}`);
  console.log(`out-of-level signal count: ${output.summary.out_of_level_signal_count}`);
  console.log(`wrote ${outputPath}`);
  console.log(`wrote ${level5TablePath}`);
}

main().catch((error) => {
  console.error(`Level/domain classification failed: ${error.message}`);
  process.exitCode = 1;
});
