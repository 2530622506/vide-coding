import { mkdir, readFile, writeFile } from "node:fs/promises";

const candidatesPath = "data/oj-ingestion/mirror-problem-candidates.json";
const canonicalPath = "data/canonical-problems/canonical-problem-alignment.json";
const outputDir = "data/classification";
const outputPath = `${outputDir}/supplemental-cxx-problems.json`;

const domainSeeds = [
  { id: "number_theory", label: "数论", keywords: ["因数", "质数", "素数", "最大公因数", "最小公倍数", "gcd", "勾股", "自幂数", "进制", "数字", "幸运数", "原根", "幂和"] },
  { id: "binary_search", label: "二分", keywords: ["二分", "查找", "寻找", "找数", "最大可能", "最小可能"] },
  { id: "linked_list", label: "链表", keywords: ["链表", "队列", "栈"] },
  { id: "greedy", label: "贪心", keywords: ["最优", "优先", "购买", "兑换", "分配", "挑战", "奖品"] },
  { id: "recursion", label: "递归", keywords: ["递归", "拆分", "划分"] },
  { id: "divide_conquer", label: "分治", keywords: ["分治", "排序", "连续段", "矩阵"] },
  { id: "sort_simulation", label: "排序/模拟", keywords: ["排序", "模拟", "矩阵", "图像", "画", "打印", "日历", "购物", "时间", "温度", "移动", "序列", "密码", "商店", "折扣"] },
  { id: "string", label: "字符串", keywords: ["字符串", "密码", "回文", "词频", "凯撒"] },
  { id: "graph", label: "图论", keywords: ["图", "连通", "最短", "路径", "网络"] },
  { id: "tree", label: "树", keywords: ["树", "二叉树"] },
  { id: "dynamic_programming", label: "动态规划", keywords: ["动态规划", "dp", "最长不下降", "背包"] }
];

const problemTypeSeeds = [
  { id: "number_theory_programming", label: "数论程序设计型", domains: ["number_theory"], keywords: ["因数", "质数", "素数", "最大公因数", "gcd", "进制", "原根", "数字"] },
  { id: "binary_answer_programming", label: "二分答案程序设计型", domains: ["binary_search"], keywords: ["二分", "查找", "最大可能", "最小可能"] },
  { id: "sequence_simulation_programming", label: "序列/数组模拟型", domains: ["sort_simulation"], keywords: ["序列", "数组", "移动", "矩阵", "排序", "打印", "日历"] },
  { id: "string_processing_programming", label: "字符串处理型", domains: ["string"], keywords: ["字符串", "密码", "回文", "词频", "凯撒"] },
  { id: "greedy_choice_programming", label: "贪心选择型", domains: ["greedy"], keywords: ["最优", "优先", "购买", "兑换", "分配", "奖品"] },
  { id: "graph_tree_programming", label: "图/树结构程序设计型", domains: ["graph", "tree"], keywords: ["图", "树", "路径", "连通", "二叉树"] },
  { id: "basic_io_simulation", label: "基础输入输出模拟型", domains: ["sort_simulation"], keywords: ["面积", "时间", "天数", "购物", "温度", "折扣"] }
];

const knowledgeSeeds = [
  { id: "integer_factor", label: "整数因子与整除", domains: ["number_theory"], keywords: ["因数", "质数", "素数", "最大公因数", "gcd", "整除"] },
  { id: "base_conversion", label: "进制转换", domains: ["number_theory"], keywords: ["进制"] },
  { id: "brute_force_enumeration", label: "枚举与条件判断", domains: ["sort_simulation", "number_theory"], keywords: ["百鸡", "寻找", "判断", "数字", "幸运"] },
  { id: "array_sequence_state", label: "数组与序列状态维护", domains: ["sort_simulation"], keywords: ["数组", "序列", "移动", "清零", "连续段"] },
  { id: "matrix_grid_traversal", label: "矩阵/网格处理", domains: ["sort_simulation"], keywords: ["矩阵", "菱形", "金字塔", "画", "图像"] },
  { id: "string_scan", label: "字符串扫描", domains: ["string"], keywords: ["字符串", "密码", "回文", "词频", "凯撒"] },
  { id: "greedy_ordering", label: "贪心排序与选择", domains: ["greedy", "sort_simulation"], keywords: ["排序", "优先", "购买", "兑换", "奖品", "分配"] },
  { id: "graph_connectivity", label: "图连通与路径", domains: ["graph"], keywords: ["连通", "路径", "图", "最短"] },
  { id: "tree_property", label: "树结构性质", domains: ["tree"], keywords: ["树", "二叉树"] }
];

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'");
}

function cleanProblemTitle(title) {
  return normalizeWhitespace(decodeHtml(title))
    .replace(/^#?[A-Z]\d+\s*/i, "")
    .replace(/^\d+\s*[:：]\s*/, "")
    .replace(/^\d+\s+/, "")
    .replace(/\[[^\]]*GESP[^\]]*\]\s*/i, "")
    .trim();
}

function canonicalId(entry) {
  return `supplemental:${entry.oj_system}:${entry.oj_id}`.toLowerCase().replace(/[^a-z0-9:+-]+/g, "-");
}

function hasOfficialAlignment(entry, canonicalAlignment) {
  for (const problem of canonicalAlignment.canonical_problems || []) {
    for (const source of problem.source_versions || []) {
      if (source.source_entry_id === entry.id) {
        return true;
      }
    }
  }
  return false;
}

function officialTitleIndex(canonicalAlignment) {
  const titles = new Set();
  for (const problem of canonicalAlignment.canonical_problems || []) {
    if (problem.question_type !== "programming") {
      continue;
    }
    titles.add(cleanProblemTitle(problem.title).toLowerCase());
    for (const source of problem.source_versions || []) {
      if (source.title) {
        titles.add(cleanProblemTitle(source.title).toLowerCase());
      }
    }
  }
  return titles;
}

function matchesOfficialProgrammingTitle(entry, officialTitles) {
  const title = cleanProblemTitle(entry.title).toLowerCase();
  return title && officialTitles.has(title);
}

function isSupplementalProblemEntry(entry, canonicalAlignment, officialTitles) {
  if (hasOfficialAlignment(entry, canonicalAlignment)) {
    return false;
  }
  if (matchesOfficialProgrammingTitle(entry, officialTitles)) {
    return false;
  }
  if (!entry.language_hint?.includes("C++")) {
    return false;
  }
  if (entry.oj_system === "github") {
    return false;
  }
  if (!entry.oj_id || !entry.title || /^题目详情$/.test(entry.title)) {
    return false;
  }
  return /GESP/i.test(entry.title) || (/GESP/i.test(entry.url) && Number.isInteger(entry.level_hint));
}

function matchSeeds(seeds, text, domainIds = null) {
  const lowerText = text.toLowerCase();
  return seeds.flatMap((seed) => {
    if (domainIds && !seed.domains.some((domainId) => domainIds.has(domainId))) {
      return [];
    }
    const keyword = seed.keywords.find((item) => lowerText.includes(item.toLowerCase()));
    return keyword ? [{ seed, keyword }] : [];
  });
}

function tag({ kind, seed, entry, keyword, confidence, source = "public_oj_metadata", syllabusFit = "community_inferred" }) {
  return {
    kind,
    value: seed.id,
    label: seed.label,
    source,
    evidence: {
      source,
      source_id: entry.source_id,
      source_url: entry.url,
      evidence: keyword || entry.title
    },
    confidence,
    syllabus_fit: syllabusFit,
    review_status: "needs_review",
    raw_confidence: confidence,
    final_confidence: Math.max(0.1, confidence - 0.08),
    confidence_breakdown: [
      {
        factor: "public_metadata_inference",
        delta: confidence,
        description: "inferred from public OJ title/tags, not official problem text"
      },
      {
        factor: "manual_review_required",
        delta: -0.08,
        description: "supplemental source requires review before promotion"
      }
    ],
    conflict_reasons: [],
    effective_review_status: "needs_review",
    review_reason: ["supplemental_public_source_needs_review"]
  };
}

function classify(entry) {
  const title = cleanProblemTitle(entry.title);
  const text = normalizeWhitespace([entry.title, entry.evidence_snippet, entry.oj_id, ...(entry.community_tags || [])].join(" "));
  const domainTags = matchSeeds(domainSeeds, text)
    .filter(({ seed }) => entry.level_hint !== 5 || seed.id !== "dynamic_programming")
    .map(({ seed, keyword }) => tag({ kind: "algorithm_domain", seed, entry, keyword, confidence: 0.5 }));
  const domainIds = new Set(domainTags.map((item) => item.value));
  const typeTags = matchSeeds(problemTypeSeeds, text, domainIds)
    .map(({ seed, keyword }) => tag({ kind: "problem_type", seed, entry, keyword, confidence: 0.46 }));
  const knowledgeTags = matchSeeds(knowledgeSeeds, text, domainIds)
    .map(({ seed, keyword }) => tag({ kind: "knowledge_point", seed, entry, keyword, confidence: 0.44 }));

  return {
    title,
    domainTags: dedupeTags(domainTags),
    typeTags: dedupeTags(typeTags),
    knowledgeTags: dedupeTags(knowledgeTags)
  };
}

function dedupeTags(tags) {
  const byId = new Map();
  for (const item of tags) {
    if (!byId.has(item.value) || byId.get(item.value).confidence < item.confidence) {
      byId.set(item.value, item);
    }
  }
  return [...byId.values()].sort((a, b) => b.final_confidence - a.final_confidence || a.value.localeCompare(b.value));
}

function sourceVersion(recordId, entry) {
  return {
    id: `source-version:${recordId}:${entry.source_id}:${entry.oj_system}:${entry.oj_id}`,
    canonical_problem_id: recordId,
    role: "supplemental_practice_entry",
    source_kind: entry.source_type,
    source_id: entry.source_id,
    source_entry_id: entry.id,
    source_url: entry.url,
    url: entry.url,
    trust_level: entry.trust_level,
    oj_system: entry.oj_system,
    oj_id: entry.oj_id,
    title: entry.title,
    level_hint: entry.level_hint,
    session_hint: entry.session_hint,
    evidence_snippet: entry.evidence_snippet,
    extraction_method: entry.extraction_method,
    review_status: "needs_review"
  };
}

function answerGuidance(record, entry, classification, sourceVersions) {
  const domainLabels = classification.domainTags.map((item) => item.label);
  const typeLabels = classification.typeTags.map((item) => item.label);
  const knowledgeLabels = classification.knowledgeTags.map((item) => item.label);
  const focus = domainLabels[0] || "基础程序设计";
  return {
    canonical_problem_id: record.canonical_problem_id,
    content_origin: "ai_generated_learning_aid",
    ai_generation_notice: "该理解示例由系统根据公开题目标题、来源标签和分类规则生成，不是官方题解；请结合题面与评测结果甄别。",
    reference_answer: {
      status: "reference_link",
      answer: "以可通过公开 OJ 的 C++ 程序为准",
      answer_format: "programming_solution",
      source: "public_oj_practice_entry",
      source_url: entry.url,
      evidence: `公开 OJ 练习入口：${entry.oj_system} ${entry.oj_id}`,
      confidence: 0.36,
      review_status: "needs_review"
    },
    understanding_example: {
      language: "zh-CN",
      summary: `这是一道来自公开题源的 ${focus} 练习题。当前讲解基于题名“${record.title}”和公开标签生成，需要在补齐完整题面后复核。`,
      algorithm_domains: domainLabels,
      problem_types: typeLabels,
      knowledge_points: knowledgeLabels,
      steps: [
        "先打开来源题面，确认输入输出范围、边界条件和是否存在图片或表格。",
        `围绕${focus}建立核心状态或判定条件，避免只凭题名猜解法。`,
        "用样例和自造边界用例验证 C++ 程序，再把可通过评测的代码作为参考解。"
      ],
      chinese_comments: [
        "中文注释：该讲解为 AI 生成的学习辅助内容，不能替代官方题解。",
        "中文注释：补齐完整题面后，需要复核算法标签和参考解。"
      ],
      example_hint: "后续采集到样例输入输出后，在这里补充可手算的小样例。"
    },
    reference_links: sourceVersions,
    review_notes: [
      "补充题库记录来自公开 OJ metadata，需要人工确认题面、图片、样例和参考解。",
      "AI 生成讲解只作学习提示，不能标记为官方答案。"
    ]
  };
}

function problemDetail(record, entry, classification, sourceVersions) {
  return {
    canonical_problem_id: record.canonical_problem_id,
    official_problem_id: record.official_problem_id,
    session: record.session,
    language: record.language,
    level: record.level,
    question_type: record.question_type,
    question_number: record.question_number,
    title: record.title,
    content_origin: "public_oj_metadata_with_ai_generated_learning_aid",
    ai_generation_notice: "题目详情中的理解提示可能包含 AI 生成内容；图片、完整题面、样例和参考解需要以后续采集或人工复核为准。",
    statement: {
      status: "pending_collection",
      stem: record.title,
      evidence_snippet: entry.evidence_snippet || entry.title,
      source_url: entry.url,
      source_page: null,
      storage_policy: "metadata_only_until_terms_confirmed",
      notes: [
        "当前只保存公开 OJ metadata，不保存完整题面。",
        "后续爬取公开题面或人工录入后，再补齐题干、输入输出、限制和样例。"
      ]
    },
    choice_options: {
      status: "not_applicable",
      options: [],
      notes: ["补充公开 OJ 单题当前按编程题处理，没有选择项。"]
    },
    visual_assets: {
      status: "pending_collection",
      assets: [],
      expected_asset_kinds: ["statement_image", "sample_table_image", "diagram"],
      source_hint: {
        source_url: entry.url,
        source_page: null
      },
      notes: [
        "图片尚未采集；后续需要保存 asset_url、source_url、sha256、alt_text 和归属题目。",
        "如果最终无法从来源站点抽取图片，可以生成示意图，但必须标注 AI 生成并要求甄别。"
      ]
    },
    programming_solution: {
      status: "reference_link",
      language: "C++",
      code: null,
      reference_answer: "以可通过公开 OJ 的 C++ 程序为准",
      notes: [
        "当前未生成完整 C++ 代码，先提供公开 OJ 参考入口。",
        "后续若使用 AI 生成参考解，必须标注 AI 生成、加入中文注释，并经过样例或 OJ 评测验证。"
      ]
    },
    sample_cases: {
      status: "pending_collection",
      cases: [],
      notes: ["样例输入输出需要后续从公开题面抽取或人工补齐。"]
    },
    source_links: sourceVersions,
    answer_guidance_status: "reference_link",
    classification_preview: {
      algorithm_domains: classification.domainTags.map((item) => item.label),
      problem_types: classification.typeTags.map((item) => item.label),
      knowledge_points: classification.knowledgeTags.map((item) => item.label)
    },
    completeness: {
      has_statement_stem: true,
      has_choice_options: false,
      has_visual_assets: false,
      has_reference_answer: true,
      needs_option_collection: false,
      needs_visual_asset_collection: true,
      needs_programming_solution: true,
      needs_source_enrichment: true
    }
  };
}

function choosePrimaryEntry(entries) {
  const sourceRank = (entry) => {
    if (entry.source_id === "luogu-gesp-problem-search") {
      return 0;
    }
    if (entry.trust_level === "mirror") {
      return 1;
    }
    if (entry.trust_level === "practice") {
      return 2;
    }
    return 3;
  };
  return [...entries].sort((a, b) => sourceRank(a) - sourceRank(b) || a.source_id.localeCompare(b.source_id))[0];
}

function groupByCanonicalId(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    const id = canonicalId(entry);
    if (!grouped.has(id)) {
      grouped.set(id, []);
    }
    grouped.get(id).push(entry);
  }
  return [...grouped.values()];
}

function buildRecord(entries, index) {
  const entry = choosePrimaryEntry(entries);
  const classification = classify(entry);
  const id = canonicalId(entry);
  const sourceVersions = entries.map((item) => sourceVersion(id, item));
  const level = entry.level_hint;
  const record = {
    canonical_problem_id: id,
    official_problem_id: entry.id,
    record_origin: "supplemental_public_oj",
    session: entry.session_hint || "unknown",
    language: "C++",
    level,
    question_type: "programming",
    question_number: 1000 + index,
    title: classification.title,
    source_signals: {
      official_problem_text: false,
      solution_text: false,
      code_signal: false,
      practice_link: true,
      secondary_source_count: 1,
      source_version_count: 1,
      supplemental_public_source: true,
      ai_generated_learning_aid: true
    },
    source_conflict_refs: [],
    out_of_level_signal_refs: [],
    review_queue_refs: [],
    resolved_algorithm_domains: classification.domainTags,
    resolved_problem_type_tags: classification.typeTags,
    resolved_knowledge_point_tags: classification.knowledgeTags,
    effective_review_status: "needs_review"
  };

  return {
    record,
    answer_guidance: answerGuidance(record, entry, classification, sourceVersions),
    detail: problemDetail(record, entry, classification, sourceVersions),
    source_versions: sourceVersions
  };
}

function summarize(items) {
  const byLevel = {};
  const bySource = {};
  for (const item of items) {
    byLevel[item.record.level] = (byLevel[item.record.level] || 0) + 1;
    for (const source of item.source_versions) {
      bySource[source.source_id] = (bySource[source.source_id] || 0) + 1;
    }
  }
  return {
    supplemental_record_count: items.length,
    by_level: byLevel,
    by_source: bySource,
    ai_generated_learning_aid_count: items.filter((item) => item.answer_guidance.content_origin === "ai_generated_learning_aid").length,
    pending_visual_asset_count: items.filter((item) => item.detail.completeness.needs_visual_asset_collection).length,
    pending_programming_solution_count: items.filter((item) => item.detail.completeness.needs_programming_solution).length
  };
}

async function main() {
  const [candidates, canonicalAlignment] = await Promise.all([
    readJson(candidatesPath),
    readJson(canonicalPath)
  ]);
  const officialTitles = officialTitleIndex(canonicalAlignment);
  const selectedEntries = candidates.entries
    .filter((entry) => isSupplementalProblemEntry(entry, canonicalAlignment, officialTitles))
    .sort((a, b) => (a.level_hint || 99) - (b.level_hint || 99) || (a.session_hint || "").localeCompare(b.session_hint || "") || a.oj_system.localeCompare(b.oj_system) || a.oj_id.localeCompare(b.oj_id));
  const items = groupByCanonicalId(selectedEntries).map((entries, index) => buildRecord(entries, index + 1));
  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/build-supplemental-cxx-problems.mjs",
    inputs: {
      oj_candidates: candidatesPath,
      canonical_alignment: canonicalPath
    },
    inclusion_policy: {
      language: "C++ only",
      accepted_sources: "public OJ single-problem entries only",
      excluded_sources: "GitHub PDFs are reference sources, not single supplemental problem records",
      official_boundary: "supplemental records never override official level or syllabus evidence"
    },
    ai_generation_policy: {
      allowed_when_missing_source_content: true,
      required_origin: "ai_generated_learning_aid",
      required_notice: "AI 生成内容必须显式提示需甄别，不能冒充官方答案或官方题解。"
    },
    summary: summarize(items),
    records: items.map((item) => item.record),
    answer_guidance: items.map((item) => item.answer_guidance),
    problem_details: items.map((item) => item.detail),
    source_versions: items.flatMap((item) => item.source_versions)
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`supplemental C++ problem count: ${output.summary.supplemental_record_count}`);
  console.log(`supplemental by level: ${JSON.stringify(output.summary.by_level)}`);
  console.log(`AI generated learning aid count: ${output.summary.ai_generated_learning_aid_count}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`Supplemental C++ problem build failed: ${error.message}`);
  process.exitCode = 1;
});
