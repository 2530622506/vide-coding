import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const inputPath = "data/wanjuanwang-ingestion/wanjuanwang-gesp-cpp-exams.json";
const classificationPath = "data/classification/wanjuanwang-gesp-cpp-classification.json";
const reviewQueuePath = "data/classification/wanjuanwang-gesp-cpp-review-queue.json";

const domainRules = [
  { value: "graph", label: "图论", keywords: ["图", "顶点", "边", "深度优先", "广度优先", "最短路", "线图"] },
  { value: "tree", label: "树", keywords: ["二叉树", "完全二叉树", "先序遍历", "中序遍历", "后序遍历"] },
  { value: "dynamic_programming", label: "动态规划", keywords: ["动态规划", "递推公式", "状态", "最大化", "平衡"] },
  { value: "binary_search", label: "二分", keywords: ["二分", "lower_bound", "有序", "查找"] },
  { value: "number_theory", label: "数论", keywords: ["质数", "素数", "质因数", "最大公因数", "最小公倍数", "闰年"] },
  { value: "string", label: "字符串", keywords: ["字符串", "to_string", "回文", "字符"] },
  { value: "bit_operation", label: "位运算", keywords: ["位运算", "|", "&", "^", "ASCII"] },
  { value: "sort_simulation", label: "排序/模拟", keywords: ["排序", "归并排序", "快速排序", "模拟", "枚举"] },
  { value: "recursion", label: "递归", keywords: ["递归"] },
  { value: "divide_conquer", label: "分治", keywords: ["分治"] },
  { value: "greedy", label: "贪心", keywords: ["贪心"] },
  { value: "linked_list", label: "链表", keywords: ["链表", "指针"] },
  { value: "high_precision", label: "高精度", keywords: ["高精度", "大整数"] },
  { value: "complexity", label: "复杂度", keywords: ["时间复杂度", "空间复杂度", "复杂度"] },
  { value: "basic_programming", label: "基础程序设计", keywords: ["cout", "pow(", "log(", "cmath", "math.h"] }
];

const knowledgeRules = [
  { value: "graph_traversal", label: "图遍历", keywords: ["深度优先", "广度优先", "遍历"] },
  { value: "binary_tree_traversal", label: "二叉树遍历", keywords: ["二叉树", "先序遍历", "中序遍历", "后序遍历"] },
  { value: "time_complexity", label: "时间复杂度", keywords: ["时间复杂度"] },
  { value: "dynamic_programming", label: "动态规划", keywords: ["动态规划", "状态", "递推公式"] },
  { value: "hash_conflict", label: "哈希冲突", keywords: ["哈希", "冲突"] },
  { value: "linear_sieve", label: "线性筛", keywords: ["线性筛", "欧拉筛", "埃氏筛"] },
  { value: "bit_xor", label: "异或运算", keywords: ["^", "异或"] },
  { value: "pointer_arithmetic", label: "指针运算", keywords: ["int *", "指针", "p + a", "p[3]"] }
];

const titleDomainOverrides = new Map([
  ["假期阅读", [{ value: "basic_programming", label: "基础程序设计" }]],
  ["值日", [{ value: "number_theory", label: "数论" }]],
  ["数三角形", [{ value: "number_theory", label: "数论" }, { value: "sort_simulation", label: "排序/模拟" }]],
  ["幂和数", [{ value: "number_theory", label: "数论" }, { value: "bit_operation", label: "位运算" }]],
  ["分糖果", [{ value: "greedy", label: "贪心" }, { value: "sort_simulation", label: "排序/模拟" }]],
  ["奇偶校验", [{ value: "bit_operation", label: "位运算" }]],
  ["排序", [{ value: "sort_simulation", label: "排序/模拟" }]],
  ["画布裁剪", [{ value: "string", label: "字符串" }, { value: "sort_simulation", label: "排序/模拟" }]],
  ["奖品兑换", [{ value: "binary_search", label: "二分" }, { value: "greedy", label: "贪心" }]],
  ["最大公因数", [{ value: "number_theory", label: "数论" }]],
  ["学习小组", [{ value: "dynamic_programming", label: "动态规划" }]],
  ["最大因数", [{ value: "number_theory", label: "数论" }, { value: "tree", label: "树" }]],
  ["线图", [{ value: "graph", label: "图论" }]],
  ["调味平衡", [{ value: "dynamic_programming", label: "动态规划" }]],
  ["遍历计数", [{ value: "tree", label: "树" }, { value: "graph", label: "图论" }]],
  ["树上旅行", [{ value: "tree", label: "树" }]]
]);

const titleKnowledgeOverrides = new Map([
  ["假期阅读", [{ value: "direct_formula", label: "直接计算" }]],
  ["值日", [{ value: "lcm", label: "最小公倍数" }]],
  ["数三角形", [{ value: "parity_counting", label: "奇偶性计数" }]],
  ["幂和数", [{ value: "power_of_two_enumeration", label: "2 的幂枚举" }]],
  ["分糖果", [{ value: "monotonic_greedy", label: "单调贪心" }]],
  ["奇偶校验", [{ value: "parity_check", label: "奇偶校验" }]],
  ["排序", [{ value: "inversion_count", label: "逆序对计数" }]],
  ["画布裁剪", [{ value: "matrix_substring_crop", label: "字符矩阵截取" }]],
  ["最大公因数", [{ value: "gcd", label: "最大公因数" }]],
  ["学习小组", [{ value: "group_partition_dp", label: "分组动态规划" }]],
  ["遍历计数", [{ value: "dfs_order_count", label: "DFS 遍历序计数" }]],
  ["树上旅行", [{ value: "tree_navigation", label: "树上移动模拟" }]]
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function buildCorpus(question) {
  return normalizeWhitespace([
    question.page_title,
    question.section_title,
    question.stem_text,
    ...question.choice_options.map((option) => option.text),
    ...question.programming_sections.map((section) => section.title),
    ...question.programming_sections.map((section) => section.text)
  ].filter(Boolean).join(" "));
}

function buildTag(kind, rule, question, evidenceText) {
  return {
    kind,
    value: rule.value,
    label: rule.label,
    source: "wanjuanwang_public_html_heuristic",
    evidence: {
      source: "wanjuanwang_public_html_heuristic",
      source_id: "wanjuanwang_exam_html",
      source_url: question.source.source_url,
      evidence: evidenceText
    },
    confidence: 0.55,
    syllabus_fit: "community_inferred",
    review_status: "needs_review",
    raw_confidence: 0.55,
    final_confidence: 0.49,
    confidence_breakdown: [
      {
        factor: "keyword_match",
        delta: 0.55,
        description: "classification inferred from WanJuanWang public HTML keyword hits"
      },
      {
        factor: "manual_review_required",
        delta: -0.06,
        description: "third-party heuristic result still requires review"
      }
    ],
    conflict_reasons: [],
    effective_review_status: "needs_review",
    review_reason: [
      "wanjuanwang_heuristic_needs_review"
    ]
  };
}

function buildOverrideTag(kind, value, label, question) {
  return {
    kind,
    value,
    label,
    source: "wanjuanwang_title_override",
    evidence: {
      source: "wanjuanwang_title_override",
      source_id: "wanjuanwang_exam_html",
      source_url: question.source.source_url,
      evidence: question.stem_text || question.page_title
    },
    confidence: 0.72,
    syllabus_fit: "community_inferred",
    review_status: "needs_review",
    raw_confidence: 0.72,
    final_confidence: 0.66,
    confidence_breakdown: [
      {
        factor: "title_override",
        delta: 0.72,
        description: "classification assigned by curated WanJuanWang GESP C++ title override"
      },
      {
        factor: "manual_review_required",
        delta: -0.06,
        description: "third-party source still requires review"
      }
    ],
    conflict_reasons: [],
    effective_review_status: "needs_review",
    review_reason: [
      "wanjuanwang_title_override_needs_review"
    ]
  };
}

function findTitleOverride(question, overrideMap) {
  const title = normalizeWhitespace(question.stem_text || question.page_title);
  for (const [needle, overrides] of overrideMap.entries()) {
    if (title.includes(needle)) {
      return overrides;
    }
  }
  return null;
}

function matchRules(rules, corpus, question, kind) {
  const tags = [];
  const lowered = corpus.toLowerCase();

  for (const rule of rules) {
    const matchedKeyword = rule.keywords.find((keyword) => keywordMatches(corpus, lowered, keyword));
    if (!matchedKeyword) {
      continue;
    }
    tags.push(buildTag(kind, rule, question, matchedKeyword));
  }

  const seen = new Set();
  return tags.filter((tag) => {
    if (seen.has(tag.value)) {
      return false;
    }
    seen.add(tag.value);
    return true;
  });
}

function keywordMatches(corpus, lowered, keyword) {
  if (keyword !== "^") {
    return lowered.includes(keyword.toLowerCase());
  }

  // Avoid treating ranges such as 10^9 as C++ bitwise XOR.
  return /(?:[A-Za-z_\]\)])\s*\^\s*(?:[A-Za-z_\(]|\d)/.test(corpus);
}

function buildReviewItem(id, title, reason, canonicalProblemId, priority = "medium") {
  return {
    id,
    type: "wanjuanwang_review",
    priority,
    status: "open",
    canonical_problem_id: canonicalProblemId,
    title,
    reason,
    final_confidence: null
  };
}

async function main() {
  const artifact = await readJson(inputPath);
  const questions = artifact.pages.flatMap((page) => page.questions);
  const records = [];
  const reviewItems = [];

  for (const question of questions) {
    const corpus = buildCorpus(question);
    const domainOverride = findTitleOverride(question, titleDomainOverrides);
    const knowledgeOverride = findTitleOverride(question, titleKnowledgeOverrides);
    const resolved_algorithm_domains = domainOverride
      ? domainOverride.map((override) => buildOverrideTag("algorithm_domain", override.value, override.label, question))
      : matchRules(domainRules, corpus, question, "algorithm_domain");
    const resolved_knowledge_point_tags = knowledgeOverride
      ? knowledgeOverride.map((override) => buildOverrideTag("knowledge_point", override.value, override.label, question))
      : matchRules(knowledgeRules, corpus, question, "knowledge_point");

    if (question.question_type === "programming" && resolved_algorithm_domains.length === 0) {
      reviewItems.push(buildReviewItem(
        `wanjuanwang-review:${question.questionid}:unclassified-programming`,
        question.stem_text || question.page_title,
        "编程题未能自动归类到现有算法范畴。",
        question.id,
        "high"
      ));
    }

    if (question.question_type === "selection" && question.choice_options.length === 0) {
      reviewItems.push(buildReviewItem(
        `wanjuanwang-review:${question.questionid}:missing-options`,
        question.stem_text || question.page_title,
        "选择题未解析出结构化选项。",
        question.id,
        "high"
      ));
    }

    if (resolved_algorithm_domains.some((tag) => tag.value === "dynamic_programming") && question.level === 5) {
      reviewItems.push(buildReviewItem(
        `wanjuanwang-review:${question.questionid}:level5-dp`,
        question.stem_text || question.page_title,
        "五级题目命中了动态规划候选标签，需要按越级规则复核。",
        question.id,
        "high"
      ));
    }

    records.push({
      canonical_problem_id: question.id,
      question_type: question.question_type,
      level: question.level,
      resolved_algorithm_domains,
      resolved_knowledge_point_tags
    });
  }

  const classificationOutput = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/classify-wanjuanwang-gesp-cpp.mjs",
    inputs: {
      ingestion_artifact: inputPath
    },
    summary: {
      record_count: records.length,
      classified_domain_count: records.filter((record) => record.resolved_algorithm_domains.length > 0).length,
      classified_knowledge_count: records.filter((record) => record.resolved_knowledge_point_tags.length > 0).length,
      review_item_count: reviewItems.length
    },
    records
  };

  const reviewQueueOutput = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/classify-wanjuanwang-gesp-cpp.mjs",
    summary: {
      total_count: reviewItems.length,
      by_priority: reviewItems.reduce((accumulator, item) => {
        accumulator[item.priority] = (accumulator[item.priority] || 0) + 1;
        return accumulator;
      }, {}),
      by_type: {
        wanjuanwang_review: reviewItems.length
      }
    },
    items: reviewItems
  };

  await mkdir(dirname(classificationPath), { recursive: true });
  await writeFile(classificationPath, `${JSON.stringify(classificationOutput, null, 2)}\n`);
  await writeFile(reviewQueuePath, `${JSON.stringify(reviewQueueOutput, null, 2)}\n`);

  console.log(`wanjuanwang classified records: ${classificationOutput.summary.record_count}`);
  console.log(`wanjuanwang domain-classified records: ${classificationOutput.summary.classified_domain_count}`);
  console.log(`wanjuanwang knowledge-classified records: ${classificationOutput.summary.classified_knowledge_count}`);
  console.log(`wanjuanwang review items: ${classificationOutput.summary.review_item_count}`);
  console.log(`wrote ${classificationPath}`);
  console.log(`wrote ${reviewQueuePath}`);
}

main().catch((error) => {
  console.error(`WanJuanWang GESP C++ classification failed: ${error.message}`);
  process.exitCode = 1;
});
