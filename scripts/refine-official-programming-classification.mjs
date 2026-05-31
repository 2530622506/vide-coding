import { readFile, writeFile } from "node:fs/promises";

const modelPath = "data/classification/conflict-confidence-model.json";
const detailsPath = "data/classification/problem-details.json";

const refinementSource = "source_extracted_statement_ai_solution_review";

const classificationPacks = {
  "canonical:2026-03:c++:level-1:programming:01": {
    domains: [["sort_simulation", "排序/模拟"]],
    problemTypes: [["condition_comparison_simulation", "条件比较模拟型"]],
    knowledgePoints: [["absolute_difference", "绝对值差值"], ["tie_breaker", "并列规则处理"]]
  },
  "canonical:2026-03:c++:level-1:programming:02": {
    domains: [["string", "字符串"], ["sort_simulation", "排序/模拟"]],
    problemTypes: [["string_replacement_simulation", "字符串替换模拟型"]],
    knowledgePoints: [["character_traversal", "字符遍历"], ["digit_character_replacement", "数字字符替换"]]
  },
  "canonical:2026-03:c++:level-2:programming:01": {
    domains: [["sort_simulation", "排序/模拟"]],
    problemTypes: [["digit_counting_enumeration", "数位计数枚举型"]],
    knowledgePoints: [["digit_decomposition", "数位拆分"], ["interval_enumeration", "区间枚举"]]
  },
  "canonical:2026-03:c++:level-2:programming:02": {
    domains: [["sort_simulation", "排序/模拟"]],
    problemTypes: [["ascii_art_simulation", "图形输出模拟型"]],
    knowledgePoints: [["two_dimensional_position_check", "二维位置判断"], ["boundary_case_split", "边界分类"]]
  },
  "canonical:2026-03:c++:level-3:programming:01": {
    domains: [["string", "字符串"], ["sort_simulation", "排序/模拟"]],
    problemTypes: [["binary_representation_judgment", "二进制表示判断型"]],
    knowledgePoints: [["base_conversion", "进制转换"], ["palindrome_check", "回文判断"]]
  },
  "canonical:2026-03:c++:level-3:programming:02": {
    domains: [["string", "字符串"]],
    problemTypes: [["string_mapping_simulation", "字符串映射模拟型"]],
    knowledgePoints: [["caesar_cipher", "凯撒密码"], ["cyclic_shift", "循环位移"]]
  },
  "canonical:2026-03:c++:level-4:programming:01": {
    domains: [["sort_simulation", "排序/模拟"]],
    problemTypes: [["grid_neighbor_judgment", "网格邻接判断型"]],
    knowledgePoints: [["eight_direction_neighbors", "八方向邻接"], ["two_dimensional_array_traversal", "二维数组遍历"]]
  },
  "canonical:2026-03:c++:level-4:programming:02": {
    domains: [["sort_simulation", "排序/模拟"]],
    problemTypes: [["multi_key_sorting", "多关键字排序型"]],
    knowledgePoints: [["struct_sorting", "结构体排序"], ["stable_tie_break_rules", "稳定并列规则"]]
  },
  "canonical:2026-03:c++:level-5:programming:01": {
    domains: [["number_theory", "数论"]],
    problemTypes: [["prime_factorization", "质因数分解型"]],
    knowledgePoints: [["finite_decimal_judgment", "有限小数判定"], ["unique_factorization", "唯一分解定理"]]
  },
  "canonical:2026-03:c++:level-5:programming:02": {
    domains: [["binary_search", "二分"], ["sort_simulation", "排序/模拟"]],
    problemTypes: [["sorted_binary_lookup", "排序后二分查找型"]],
    knowledgePoints: [["binary_search_lookup", "二分查找"], ["array_intersection", "数组交集"]]
  },
  "canonical:2026-03:c++:level-6:programming:01": {
    domains: [["dynamic_programming", "动态规划"]],
    problemTypes: [["linear_dp_with_jump_constraint", "一维线性 DP 型"]],
    knowledgePoints: [["state_transition", "状态转移"], ["jump_constraint", "跳跃约束"]]
  },
  "canonical:2026-03:c++:level-6:programming:02": {
    domains: [["tree", "树"]],
    problemTypes: [["binary_tree_property_dp", "二叉树性质判定型"]],
    knowledgePoints: [["complete_binary_tree", "完全二叉树"], ["postorder_tree_dp", "后序 DP"], ["perfect_binary_tree", "满二叉树"]]
  },
  "canonical:2026-03:c++:level-7:programming:01": {
    domains: [["number_theory", "数论"], ["greedy", "贪心"]],
    problemTypes: [["integer_break_max_product", "整数拆分最优乘积型"]],
    knowledgePoints: [["fast_power", "快速幂"], ["modular_arithmetic", "模运算"], ["integer_break", "整数拆分"]]
  },
  "canonical:2026-03:c++:level-7:programming:02": {
    domains: [["graph", "图论"]],
    problemTypes: [["layered_shortest_path", "分层最短路型"]],
    knowledgePoints: [["dijkstra", "Dijkstra"], ["state_layering", "状态分层"], ["threshold_enumeration", "枚举阈值"]]
  },
  "canonical:2026-03:c++:level-8:programming:01": {
    domains: [["graph", "图论"], ["dynamic_programming", "动态规划"]],
    problemTypes: [["sparse_shortcut_shortest_path", "稀疏快捷边最短路型"]],
    knowledgePoints: [["interval_dp", "区间 DP"], ["sparse_edge_optimization", "稀疏边优化"], ["shortest_path_transformation", "最短路转化"]]
  },
  "canonical:2026-03:c++:level-8:programming:02": {
    domains: [["graph", "图论"]],
    problemTypes: [["interval_all_pairs_shortest_path", "区间全源最短路型"]],
    knowledgePoints: [["floyd", "Floyd"], ["incremental_shortest_path", "增量最短路"], ["induced_subgraph", "诱导子图"]]
  }
};

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function excerpt(detail) {
  const description = detail?.statement?.sections?.find((section) => section.id === "description")?.markdown || detail?.statement?.stem || "";
  return description.replace(/\s+/g, " ").slice(0, 180);
}

function tag(kind, [value, label], detail) {
  return {
    kind,
    value,
    label,
    source: refinementSource,
    evidence: {
      source: refinementSource,
      source_id: "official_programming_oj_enrichment+ai_sample_verified_solution",
      source_url: detail?.source_enrichment?.source_url || detail?.statement?.source_url || null,
      evidence: excerpt(detail),
      ai_solution_verification: detail?.programming_solution?.verification?.status || "not_verified"
    },
    confidence: 0.72,
    syllabus_fit: "needs_review",
    review_status: "needs_review",
    raw_confidence: 0.72,
    final_confidence: 0.74,
    confidence_breakdown: [
      {
        factor: "source_extracted_official_programming_statement",
        delta: 0.44,
        description: "classification based on source-extracted official C++ programming statement"
      },
      {
        factor: "sample_verified_ai_solution",
        delta: 0.22,
        description: "AI-generated C++ reference solution passed current public samples"
      },
      {
        factor: "needs_manual_review",
        delta: -0.08,
        description: "AI-assisted classification must remain reviewed before promotion"
      }
    ],
    conflict_reasons: [],
    effective_review_status: "needs_review",
    review_reason: ["ai_sample_verified_requires_review"]
  };
}

function summarize(model) {
  const tagStatusCounts = {};
  const recordStatusCounts = {};
  let tagCount = 0;
  let level5NeedsReview = 0;
  let level5Conflict = 0;

  for (const record of model.records) {
    recordStatusCounts[record.effective_review_status] = (recordStatusCounts[record.effective_review_status] || 0) + 1;
    if (record.level === 5 && record.effective_review_status === "needs_review") {
      level5NeedsReview += 1;
    }
    if (record.level === 5 && record.effective_review_status === "conflict") {
      level5Conflict += 1;
    }
    const tags = [
      ...record.resolved_algorithm_domains,
      ...record.resolved_problem_type_tags,
      ...record.resolved_knowledge_point_tags
    ];
    tagCount += tags.length;
    for (const item of tags) {
      tagStatusCounts[item.effective_review_status] = (tagStatusCounts[item.effective_review_status] || 0) + 1;
    }
  }

  return {
    ...model.summary,
    record_count: model.records.length,
    cxx_level5_record_count: model.records.filter((record) => record.level === 5).length,
    cxx_level5_conflict_count: level5Conflict,
    cxx_level5_needs_review_count: level5NeedsReview,
    tag_count: tagCount,
    record_status_counts: recordStatusCounts,
    tag_status_counts: tagStatusCounts
  };
}

async function main() {
  const [model, details] = await Promise.all([
    readJson(modelPath),
    readJson(detailsPath)
  ]);
  const detailsById = new Map(details.records.map((detail) => [detail.canonical_problem_id, detail]));
  let updatedCount = 0;

  model.records = model.records.map((record) => {
    const pack = classificationPacks[record.canonical_problem_id];
    if (!pack) {
      return record;
    }
    const detail = detailsById.get(record.canonical_problem_id);
    if (detail?.programming_solution?.verification?.status !== "sample_passed") {
      throw new Error(`${record.canonical_problem_id}: sample-verified AI solution required before official classification refinement`);
    }
    updatedCount += 1;
    return {
      ...record,
      resolved_algorithm_domains: pack.domains.map((item) => tag("algorithm_domain", item, detail)),
      resolved_problem_type_tags: pack.problemTypes.map((item) => tag("problem_type", item, detail)),
      resolved_knowledge_point_tags: pack.knowledgePoints.map((item) => tag("knowledge_point", item, detail)),
      effective_review_status: "needs_review",
      classification_refinement: {
        source: refinementSource,
        source_id: "official_programming_oj_enrichment+ai_sample_verified_solution",
        applied_at: new Date().toISOString(),
        policy: "Official programming refinements may use public OJ statements and sample-verified AI C++ solutions, but remain needs_review until manual or OJ review."
      }
    };
  });

  model.generated_at = new Date().toISOString();
  model.official_programming_classification_refinement = {
    applied_at: model.generated_at,
    applied_count: updatedCount,
    source: refinementSource,
    review_status: "needs_review"
  };
  model.summary = summarize(model);

  await writeFile(modelPath, `${JSON.stringify(model, null, 2)}\n`);
  console.log(`official programming classification refinements applied: ${updatedCount}`);
  console.log(`confidence tag count: ${model.summary.tag_count}`);
  console.log(`C++ level 5 needs review count: ${model.summary.cxx_level5_needs_review_count}`);
  console.log(`wrote ${modelPath}`);
}

main().catch((error) => {
  console.error(`Official programming classification refinement failed: ${error.message}`);
  process.exitCode = 1;
});
