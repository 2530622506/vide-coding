import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const inputPath = "data/wanjuanwang-ingestion/wanjuanwang-gesp-cpp-exams.json";
const outputPath = "data/classification/wanjuanwang-gesp-cpp-problems.json";
const classificationPath = "data/classification/wanjuanwang-gesp-cpp-classification.json";
const generatedAnswersPath = "data/classification/wanjuanwang-gesp-cpp-generated-answers.json";
const imageOptionOcrPath = "data/classification/wanjuanwang-gesp-cpp-image-option-ocr.json";
const programmingSolutionsPath = "data/classification/wanjuanwang-gesp-cpp-programming-solutions.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch {
    return null;
  }
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildTag(kind, value, label, evidence) {
  return {
    kind,
    value,
    label,
    source: "wanjuanwang_public_html",
    evidence: {
      source: "wanjuanwang_public_html",
      source_id: "wanjuanwang_exam_html",
      source_url: evidence.source_url,
      evidence: evidence.text
    },
    confidence: 0.42,
    syllabus_fit: "community_inferred",
    review_status: "needs_review",
    raw_confidence: 0.42,
    final_confidence: 0.36,
    confidence_breakdown: [
      {
        factor: "third_party_public_exam_html",
        delta: 0.42,
        description: "classification derived from public WanJuanWang exam HTML"
      },
      {
        factor: "manual_review_required",
        delta: -0.06,
        description: "third-party source requires review before promotion"
      }
    ],
    conflict_reasons: [],
    effective_review_status: "needs_review",
    review_reason: [
      "wanjuanwang_public_source_needs_review"
    ]
  };
}

function buildQuestionTypeTag(question) {
  const typeMeta = {
    selection: { value: "selection_question", label: "选择题" },
    judgment: { value: "judgment_question", label: "判断题" },
    programming: { value: "programming_question", label: "编程题" }
  }[question.question_type];

  return buildTag("problem_type", typeMeta.value, typeMeta.label, {
    source_url: question.source.source_url,
    text: question.section_title
  });
}

function buildBroadKnowledgeTags(question) {
  return (question.knowledge_labels || []).map((label) => buildTag(
    "knowledge_point",
    slugify(label) || `wanjuan_knowledge_${question.questionid}`,
    label,
    {
      source_url: question.source.source_url,
      text: label
    }
  ));
}

function buildDomainTags(question) {
  if (question.question_type !== "programming") {
    return [];
  }

  return [
    buildTag("algorithm_domain", "unclassified", "未分类", {
      source_url: question.source.source_url,
      text: question.stem_text || question.page_title
    })
  ];
}

function compactTitle(question) {
  const source = String(question.stem_text || question.page_title || "").trim();
  const firstSentence = source
    .split(/时间限制：|【问题描述】|【输入描述】|【输出描述】/)
    .map((part) => part.trim())
    .find(Boolean) || source;
  return firstSentence.slice(0, 120);
}

function buildRecord(question, classifiedRecord) {
  return {
    canonical_problem_id: question.id,
    official_problem_id: `mirror:${question.source.source_kind}:${question.questionid}`,
    record_origin: "wanjuanwang_public_exam",
    session: question.session,
    language: "C++",
    level: question.level,
    question_type: question.question_type,
    question_number: question.question_number,
    title: compactTitle(question) || `${question.page_title} 第 ${question.question_number} 题`,
    source_signals: {
      official_problem_text: false,
      solution_text: false,
      code_signal: question.blocks.some((block) => block.type === "code"),
      practice_link: true,
      secondary_source_count: 1,
      source_version_count: 1,
      wanjuanwang_public_source: true,
      has_images: question.images.length > 0,
      has_samples: question.sample_cases.length > 0
    },
    source_conflict_refs: [],
    out_of_level_signal_refs: [],
    review_queue_refs: [],
    resolved_algorithm_domains: classifiedRecord?.resolved_algorithm_domains?.length
      ? classifiedRecord.resolved_algorithm_domains
      : buildDomainTags(question),
    resolved_problem_type_tags: [buildQuestionTypeTag(question)],
    resolved_knowledge_point_tags: classifiedRecord?.resolved_knowledge_point_tags?.length
      ? classifiedRecord.resolved_knowledge_point_tags
      : buildBroadKnowledgeTags(question),
    effective_review_status: "needs_review"
  };
}

function buildImageOcrLookup(records) {
  const byQuestion = new Map();
  for (const record of records || []) {
    byQuestion.set(record.canonical_problem_id, new Map(record.options.map((option) => [option.key, option])));
  }
  return byQuestion;
}

function isLikelyImageUrl(value) {
  const text = String(value || "").trim();
  return /^https?:\/\/.+(\.(png|jpe?g|gif|webp|svg|image)(\?.*)?)$/i.test(text)
    || /^https?:\/\/image\.wanjuanwang\.com\/images\/.+/i.test(text);
}

function formatInlineMarkdown(value) {
  return String(value || "")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || !isLikelyImageUrl(trimmed)) {
        return line;
      }
      return `![题图](${trimmed})`;
    })
    .join("\n");
}

function blocksToMarkdown(blocks) {
  return blocks
    .map((block, index) => {
      if (block.type === "code") {
        return `\`\`\`cpp\n${block.text}\n\`\`\``;
      }
      if (block.type === "image") {
        return `![题图 ${index + 1}](${block.asset_url})`;
      }
      return formatInlineMarkdown(block.text);
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function choiceOptionsDetail(question, imageOcrByQuestion) {
  const imageOcrByKey = imageOcrByQuestion.get(question.id) || new Map();
  if (question.question_type === "programming") {
    return {
      status: "not_applicable",
      options: [],
      notes: ["编程题没有选择项。"]
    };
  }

  if (question.question_type === "judgment") {
    return {
      status: "standard_binary",
      options: question.choice_options.map((option) => ({
        key: option.key,
        text: option.text,
        source_status: "inferred_from_wanjuanwang_section",
        ocr_text: undefined,
        ocr_error: null
      })),
      notes: ["判断题选项按标准二元选项规范化。"]
    };
  }

  return {
    status: question.choice_options.length > 0 ? "source_extracted" : "pending_collection",
    options: question.choice_options.map((option) => ({
      key: option.key,
      text: option.text,
      source_status: "wanjuanwang_public_html",
      ocr_text: imageOcrByKey.get(option.key)?.source === "ocr" ? imageOcrByKey.get(option.key)?.text || undefined : undefined,
      ocr_error: imageOcrByKey.get(option.key)?.error || null
    })),
    extraction_method: "wanjuanwang_options_table",
    notes: ["选择题选项从万卷网公开 HTML 的 optionsTable 抽取。"]
  };
}

function buildProblemDetail(question, imageOcrByQuestion, programmingSolutionById) {
  const sections = question.question_type === "programming"
    ? question.programming_sections.map((section, index) => ({
      id: `section_${index + 1}`,
      title: section.title,
      markdown: formatInlineMarkdown(section.text)
    })).filter((section) => section.markdown.trim())
    : [{
      id: "statement",
      title: "题面",
      markdown: blocksToMarkdown(question.blocks)
    }];

  const generatedProgramming = programmingSolutionById.get(question.id);
  return {
    canonical_problem_id: question.id,
    content_origin: "source_extracted_public_html",
    statement: {
      status: "source_extracted",
      stem: (question.stem_text || question.page_title).slice(0, 240),
      evidence_snippet: (question.stem_text || question.page_title).slice(0, 240),
      source_url: question.source.source_url,
      source_page: null,
      source_terms_status: "needs_review",
      sections,
      notes: [
        "题面来自万卷网公开 HTML，需保留第三方来源复核状态。"
      ]
    },
    choice_options: choiceOptionsDetail(question, imageOcrByQuestion),
    visual_assets: {
      status: question.images.length > 0 ? "source_extracted" : "none_found",
      assets: question.images.map((image) => ({
        ...image,
        source_page: null
      })),
      source_hint: {
        source_url: question.source.source_url,
        source_page: null
      },
      notes: question.images.length > 0
        ? ["图片 URL 来自万卷网公开 HTML，尚未下载为本地资产。"]
        : ["当前题目未发现图片。"]
    },
    programming_solution: {
      status: question.question_type === "programming" ? "needs_review" : "not_applicable",
      language: "C++",
      code: generatedProgramming?.code || null,
      content_origin: generatedProgramming ? "ai_generated_sample_verified" : undefined,
      ai_generation_notice: generatedProgramming ? "本地生成并通过公开样例校验的候选 C++ 解答，仅作学习参考，仍需人工复核。" : undefined,
      algorithm: generatedProgramming?.algorithm || undefined,
      complexity: generatedProgramming?.complexity || undefined,
      verification: generatedProgramming?.verification || undefined,
      reference_answer: generatedProgramming ? "已生成本地候选 C++ 解答并通过当前公开样例校验。" : null,
      notes: question.question_type === "programming"
        ? [generatedProgramming ? "本地候选 C++ 解答已写入，仍需人工复核。" : "未采集登录后答案，编程题参考解待后续授权来源或人工补充。"]
        : ["非编程题不需要 C++ 参考程序。"]
    },
    sample_cases: {
      status: question.question_type === "programming"
        ? (question.sample_cases.length > 0 ? "source_extracted" : "pending_collection")
        : "not_applicable",
      cases: question.sample_cases.map((sample) => ({
        input: sample.input,
        output: sample.output
      })),
      notes: question.question_type === "programming"
        ? ["样例输入输出来自万卷网公开 HTML。"]
        : ["非编程题不需要样例输入输出。"]
    },
    source_links: [
      {
        role: "public_exam_page",
        source_kind: "wanjuanwang_exam",
        title: question.page_title,
        url: question.source.source_url,
        source_url: question.source.source_url,
        trust_level: "needs_review",
        reference_kind: "public_exam_html"
      },
      {
        role: "public_question_detail",
        source_kind: "wanjuanwang_question_detail",
        title: `${question.page_title} 详情页`,
        url: question.source.detail_url,
        source_url: question.source.detail_url,
        trust_level: "needs_review",
        reference_kind: "question_detail_html"
      }
    ],
    completeness: {
      has_statement_stem: Boolean(question.stem_text),
      has_choice_options: question.question_type !== "programming" ? question.choice_options.length > 0 : false,
      has_visual_assets: question.images.length > 0,
      has_reference_answer: false,
      needs_option_collection: question.question_type === "selection" && question.choice_options.length === 0,
      needs_visual_asset_collection: false,
      needs_programming_solution: question.question_type === "programming" && !generatedProgramming,
      needs_source_enrichment: false
    }
  };
}

function buildAnswerGuidance(question, generatedAnswer, generatedProgramming) {
  const generatedConfidence = generatedAnswer
    ? generatedAnswer.generation_method === "local_cpp_execution"
      ? 0.92
      : generatedAnswer.generation_method === "compile_error" || generatedAnswer.generation_method === "runtime_error"
        ? 0.78
        : 0.7
    : 0;
  return {
    canonical_problem_id: question.id,
    content_origin: generatedAnswer || generatedProgramming ? "ai_generated_learning_aid" : "wanjuanwang_public_html",
    ai_generation_notice: generatedAnswer || generatedProgramming
      ? "本地编译/执行生成的候选答案，仅作学习参考，仍需人工复核，不能视为官方答案。"
      : undefined,
    reference_answer: {
      status: "needs_review",
      answer: generatedAnswer ? generatedAnswer.generated_answer : null,
      answer_format: question.question_type === "judgment" ? "true_false" : question.question_type === "selection" ? "choice" : "free_text",
      source: generatedAnswer || generatedProgramming ? "generated_local_cpp" : "restricted_or_unavailable",
      source_url: question.source.detail_url,
      evidence: generatedAnswer ? generatedAnswer.explanation : generatedProgramming ? "已生成本地候选 C++ 解答并通过当前公开样例校验。" : "公开页面未提供可直接采集的答案或解析。",
      confidence: generatedAnswer ? generatedConfidence : generatedProgramming ? 0.78 : 0,
      review_status: "needs_review"
    },
    understanding_example: {
      language: "zh-CN",
      summary: `${question.page_title} 的第 ${question.question_number} 题来自万卷网公开 HTML，题型为 ${question.section_title}，当前仅完成题面结构化，答案与解析待后续复核。`,
      algorithm_domains: [],
      problem_types: [buildQuestionTypeTag(question).label],
      knowledge_points: question.knowledge_labels || [],
      steps: [
        "先核对题面、选项、样例和图片是否完整。",
        "再补齐算法范畴和具体知识点分类。",
        "最后通过授权来源或人工复核补答案。"
      ],
      chinese_comments: [
        "中文注释：第三方公开题源先入库，再分类复核。",
        "中文注释：不抓取登录后答案。"
      ],
      example_hint: "该记录当前不能视为官方答案来源。"
    },
    reference_links: [
      {
        role: "public_exam_page",
        source_kind: "wanjuanwang_exam",
        title: question.page_title,
        url: question.source.source_url,
        source_url: question.source.source_url,
        trust_level: "needs_review"
      }
    ],
    review_notes: [
      "万卷网为第三方公开题源，默认 needs_review。",
      generatedAnswer || generatedProgramming
        ? "答案由本地编译/执行候选生成，默认 needs_review。"
        : "答案解析未公开展示，当前不写入答案。"
    ]
  };
}

function buildSourceVersion(question) {
  return {
    canonical_problem_id: question.id,
    role: "public_exam_page",
    source_kind: "wanjuanwang_exam",
    source_id: question.questionid,
    source_url: question.source.source_url,
    title: question.page_title,
    trust_level: "needs_review",
    review_status: "needs_review",
    content_hash: question.source.content_hash,
    fetched_at: question.source.fetched_at,
    detail_url: question.source.detail_url,
    question_type: question.question_type,
    level: question.level,
    session: question.session
  };
}

function summarize(records) {
  const byLevel = {};
  const byType = {};

  for (const record of records) {
    byLevel[record.level] = (byLevel[record.level] || 0) + 1;
    byType[record.question_type] = (byType[record.question_type] || 0) + 1;
  }

  return {
    record_count: records.length,
    by_level: byLevel,
    by_question_type: byType,
    review_required_count: records.length
  };
}

async function main() {
  const input = await readJson(inputPath);
  const classification = await readOptionalJson(classificationPath);
  const generatedAnswers = await readOptionalJson(generatedAnswersPath);
  const imageOptionOcr = await readOptionalJson(imageOptionOcrPath);
  const programmingSolutions = await readOptionalJson(programmingSolutionsPath);
  const questions = input.pages.flatMap((page) => page.questions);
  const classifiedById = new Map((classification?.records || []).map((record) => [record.canonical_problem_id, record]));
  const generatedAnswerById = new Map((generatedAnswers?.records || []).map((record) => [record.canonical_problem_id, record]));
  const imageOcrByQuestion = buildImageOcrLookup(imageOptionOcr?.records || []);
  const programmingSolutionById = new Map((programmingSolutions?.records || []).filter((record) => record.verification?.status === "sample_passed").map((record) => [record.canonical_problem_id, record]));

  const records = questions.map((question) => buildRecord(question, classifiedById.get(question.id)));
  const answer_guidance = questions.map((question) => buildAnswerGuidance(question, generatedAnswerById.get(question.id), programmingSolutionById.get(question.id)));
  const problem_details = questions.map((question) => buildProblemDetail(question, imageOcrByQuestion, programmingSolutionById));
  const source_versions = questions.map(buildSourceVersion);

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/build-wanjuanwang-gesp-cpp-catalog.mjs",
    inputs: {
      ingestion_artifact: inputPath
    },
    inclusion_policy: {
      language: "C++ only",
      accepted_sources: "WanJuanWang public GESP C++ exam HTML",
      excluded_sources: "login-protected answers and analysis",
      official_boundary: "WanJuanWang records never override official level or syllabus evidence"
    },
    summary: summarize(records),
    records,
    answer_guidance,
    problem_details,
    source_versions
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`wanjuanwang catalog records: ${output.summary.record_count}`);
  console.log(`wanjuanwang catalog selection: ${output.summary.by_question_type.selection || 0}`);
  console.log(`wanjuanwang catalog judgment: ${output.summary.by_question_type.judgment || 0}`);
  console.log(`wanjuanwang catalog programming: ${output.summary.by_question_type.programming || 0}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`WanJuanWang GESP C++ catalog build failed: ${error.message}`);
  process.exitCode = 1;
});
