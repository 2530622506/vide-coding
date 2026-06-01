import { mkdir, readFile, writeFile } from "node:fs/promises";

const modelPath = "data/classification/conflict-confidence-model.json";
const officialReviewPath = "data/classification/review-queue.json";
const officialDetailsPath = "data/classification/problem-details.json";
const supplementalPath = "data/classification/supplemental-cxx-problems.json";
const outputPath = "data/classification/review-workqueue-plan.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function addCount(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function tagReviewItems(record) {
  const items = [];
  for (const field of ["resolved_algorithm_domains", "resolved_problem_type_tags", "resolved_knowledge_point_tags"]) {
    for (const tag of record[field] || []) {
      if (tag.effective_review_status === "needs_review") {
        items.push({
          type: "tag_needs_review",
          priority: tag.final_confidence < 0.6 ? "medium" : "low",
          canonical_problem_id: record.canonical_problem_id,
          title: record.title,
          level: record.level,
          question_type: record.question_type,
          tag_kind: tag.kind,
          tag_value: tag.value,
          tag_label: tag.label,
          final_confidence: tag.final_confidence,
          reason: tag.evidence?.evidence || "标签仍处于 needs_review。",
          recommended_action: "对照官方大纲、公开题面、样例通过解法和题目来源，确认算法范畴、题型和知识点是否准确。"
        });
      }
    }
  }
  return items;
}

function detailReviewItems(record, detail) {
  const items = [];
  if (!detail) {
    items.push({
      type: "missing_detail",
      priority: "high",
      canonical_problem_id: record.canonical_problem_id,
      title: record.title,
      level: record.level,
      question_type: record.question_type,
      reason: "题目详情缺失。",
      recommended_action: "补齐题面、选项、样例、图片、答案和来源证据。"
    });
    return items;
  }
  if (detail.statement?.status !== "source_extracted") {
    items.push({
      type: "statement_needs_collection",
      priority: record.question_type === "programming" ? "high" : "medium",
      canonical_problem_id: record.canonical_problem_id,
      title: record.title,
      level: record.level,
      question_type: record.question_type,
      reason: `题面状态为 ${detail.statement?.status || "missing"}。`,
      recommended_action: "优先从公开 OJ 或官方 PDF 补齐结构化题面；来源条款仍保留 needs_review。"
    });
  }
  if (record.question_type === "programming" && !detail.programming_solution?.code) {
    items.push({
      type: "programming_solution_needs_review",
      priority: detail.sample_cases?.cases?.length ? "medium" : "high",
      canonical_problem_id: record.canonical_problem_id,
      title: record.title,
      level: record.level,
      question_type: record.question_type,
      reason: "编程题缺少可展示的 C++ 参考解。",
      recommended_action: "题面和样例补齐后，生成带中文注释的 C++ 参考解，跑样例验证后仍标记 needs_review。"
    });
  }
  if (record.question_type === "selection" && !detail.choice_options?.options?.length) {
    items.push({
      type: "choice_options_needs_collection",
      priority: "medium",
      canonical_problem_id: record.canonical_problem_id,
      title: record.title,
      level: record.level,
      question_type: record.question_type,
      reason: "选择题缺少结构化选项。",
      recommended_action: "从官方 PDF 或公开题面补齐 A/B/C/D 选项，不能只保存答案字母。"
    });
  }
  if (detail.visual_assets?.status === "pending_collection") {
    items.push({
      type: "visual_assets_pending",
      priority: "low",
      canonical_problem_id: record.canonical_problem_id,
      title: record.title,
      level: record.level,
      question_type: record.question_type,
      reason: "图片资产仍待采集。",
      recommended_action: "从题面或 PDF 裁剪图提取 asset_url/source_url/alt_text；AI 示意图必须显式标注。"
    });
  }
  return items;
}

function summarize(items) {
  const byType = {};
  const byPriority = {};
  const byLevel = {};
  for (const item of items) {
    addCount(byType, item.type);
    addCount(byPriority, item.priority);
    addCount(byLevel, String(item.level || "unknown"));
  }
  return {
    total_count: items.length,
    by_type: byType,
    by_priority: byPriority,
    by_level: byLevel
  };
}

async function main() {
  const [model, officialReviewQueue, officialDetailsData, supplemental] = await Promise.all([
    readJson(modelPath),
    readJson(officialReviewPath),
    readJson(officialDetailsPath),
    readJson(supplementalPath)
  ]);
  const officialDetails = new Map(officialDetailsData.records.map((detail) => [detail.canonical_problem_id, detail]));
  const supplementalDetails = new Map(supplemental.problem_details.map((detail) => [detail.canonical_problem_id, detail]));
  const officialItems = officialReviewQueue.items.map((item) => ({
    ...item,
    source_bucket: "official_review_queue",
    recommended_action: item.reason === "title_matches_but_session_or_level_differs"
      ? "人工核对标题相同但场次/等级不同的来源，确认是否同题、改题或误匹配。"
      : "人工核对官方题面、大纲和分类标签。"
  }));
  const supplementalItems = [];
  for (const record of supplemental.records) {
    supplementalItems.push(...tagReviewItems(record).map((item) => ({ ...item, source_bucket: "supplemental" })));
    supplementalItems.push(...detailReviewItems(record, supplementalDetails.get(record.canonical_problem_id)).map((item) => ({ ...item, source_bucket: "supplemental" })));
  }
  const officialTagItems = [];
  for (const record of model.records) {
    officialTagItems.push(...tagReviewItems(record).map((item) => ({ ...item, source_bucket: "official_tags" })));
    officialTagItems.push(...detailReviewItems(record, officialDetails.get(record.canonical_problem_id)).map((item) => ({ ...item, source_bucket: "official_details", priority: "low" })));
  }

  const allItems = [...officialItems, ...officialTagItems, ...supplementalItems]
    .sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return (priority[a.priority] ?? 9) - (priority[b.priority] ?? 9)
        || (a.level || 0) - (b.level || 0)
        || String(a.canonical_problem_id || "").localeCompare(String(b.canonical_problem_id || ""));
    })
    .map((item, index) => ({
      id: `review-plan:${String(index + 1).padStart(5, "0")}`,
      status: "open",
      ...item
    }));

  const payload = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/plan-review-workqueue.mjs",
    policy: {
      language_scope: "C++ only",
      official_priority: "官方来源决定等级和官方知识点范围。",
      ai_content: "AI 生成答案、图片或讲解必须保留 needs_review 和甄别提示。"
    },
    summary: summarize(allItems),
    source_summaries: {
      official_review_queue: summarize(officialItems),
      official_tag_and_detail_review: summarize(officialTagItems),
      supplemental_review: summarize(supplementalItems)
    },
    next_batch: allItems.slice(0, 50),
    items: allItems
  };

  await mkdir("data/classification", { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`planned review workqueue items: ${payload.summary.total_count}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`Review workqueue planning failed: ${error.message}`);
  process.exitCode = 1;
});
