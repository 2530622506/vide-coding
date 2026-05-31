import { mkdir, readFile, writeFile } from "node:fs/promises";

const conflictModelPath = "data/classification/conflict-confidence-model.json";
const canonicalAlignmentPath = "data/canonical-problems/canonical-problem-alignment.json";
const officialPdfProblemsPath = "data/problem-ingestion/official-pdf-problems.json";
const outputDir = "data/classification";
const outputPath = `${outputDir}/problem-answer-guidance.json`;
const generator = "scripts/build-answer-guidance.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseAnswerTable(snippet) {
  const compact = normalizeWhitespace(snippet);
  const match = compact.match(/题\s*号\s+((?:\d{1,2}\s+){4,}\d{1,2})\s+答案\s+([A-D](?:\s+[A-D]){4,})/);
  if (!match) {
    return new Map();
  }
  const numbers = match[1].trim().split(/\s+/).map(Number);
  const answers = match[2].trim().split(/\s+/);
  return new Map(numbers.map((number, index) => [number, answers[index]]));
}

function officialProblemLookup(officialPdfProblems) {
  const officialById = new Map();
  const selectionAnswerByDocumentKey = new Map();
  for (const document of officialPdfProblems.documents) {
    const key = `${document.inferred_session}:${document.inferred_language}:level-${document.inferred_level}`;
    selectionAnswerByDocumentKey.set(key, parseAnswerTable(document.evidence_snippet));
    for (const problem of document.problems) {
      officialById.set(problem.id, {
        ...problem,
        document_key: key,
        document_answer_table: document.evidence_snippet
      });
    }
  }
  return { officialById, selectionAnswerByDocumentKey };
}

function canonicalLookup(canonicalAlignment) {
  return new Map(canonicalAlignment.canonical_problems.map((problem) => [problem.id, problem]));
}

function sourceLinks(canonicalProblem) {
  return (canonicalProblem?.source_versions || [])
    .filter((source) => source.source_url)
    .map((source) => ({
      role: source.role,
      source_kind: source.source_kind,
      reference_kind: source.reference_kind || null,
      title: source.title || source.role,
      url: source.source_url,
      trust_level: source.trust_level
    }));
}

function referenceAnswer(record, officialProblem, canonicalProblem, answerTable) {
  if (record.question_type === "selection") {
    const answer = answerTable.get(record.question_number);
    if (answer) {
      return {
        status: "confirmed",
        answer,
        answer_format: "single_choice",
        source: "official_pdf_answer_table",
        source_url: officialProblem?.source_pdf_url || canonicalProblem?.official_source_pdf_url || "",
        evidence: `官方答案表：第 ${record.question_number} 题答案 ${answer}`,
        confidence: 0.98,
        review_status: "confirmed"
      };
    }
  }

  if (record.question_type === "programming") {
    return {
      status: "reference_link",
      answer: "以可通过 OJ 的 C++ 程序为准",
      answer_format: "programming_solution",
      source: "official_pdf_and_practice_links",
      source_url: canonicalProblem?.official_source_pdf_url || "",
      evidence: "编程题暂不保存完整参考程序；保留官方题源和练习入口用于复核。",
      confidence: 0.62,
      review_status: "needs_review"
    };
  }

  return {
    status: "needs_review",
    answer: null,
    answer_format: record.question_type === "judgment" ? "true_false" : "unknown",
    source: "not_extracted",
    source_url: officialProblem?.source_pdf_url || canonicalProblem?.official_source_pdf_url || "",
    evidence: "当前官方 PDF 文本中未稳定提取到该题型答案表，需后续人工或更强解析器复核。",
    confidence: 0,
    review_status: "needs_review"
  };
}

function domainLabels(record) {
  return record.resolved_algorithm_domains.map((tag) => tag.label);
}

function typeLabels(record) {
  return record.resolved_problem_type_tags.map((tag) => tag.label);
}

function knowledgeLabels(record) {
  return record.resolved_knowledge_point_tags.map((tag) => tag.label);
}

function primaryDomain(record) {
  return record.resolved_algorithm_domains[0]?.value || "unclassified";
}

function templateByDomain(record) {
  const domain = primaryDomain(record);
  const title = record.title;
  const questionType = record.question_type;

  if (domain === "linked_list") {
    return {
      summary: `把“${title}”先还原成结点关系问题，重点看 next / prev 指针在操作前后分别指向谁。`,
      steps: [
        "画出操作前的相邻结点关系。",
        "按语句顺序检查指针是否断链或覆盖。",
        "确认头结点、尾结点和空链表边界是否被统一处理。"
      ],
      chinese_comments: [
        "中文注释：链表题不要只看代码形式，要追踪每条指针边。",
        "中文注释：插入和删除都要先保留原相邻关系，再改写指针。"
      ]
    };
  }

  if (domain === "number_theory") {
    return {
      summary: `把“${title}”拆成整除、质因数或 gcd 的判定条件，再看题目是否要求构造或判断。`,
      steps: [
        "先确认题目中的整数关系：整除、最大公因数、质数或筛法。",
        "把条件化成可验证的不变量，例如剩余因子、重复标记次数或 gcd 递归序列。",
        "用一个小数例检查边界，例如 1、质数、合数、互质数。"
      ],
      chinese_comments: [
        "中文注释：数论题的关键是把文字条件转成整除关系。",
        "中文注释：筛法题要关注每个合数被标记的次数和起始位置。"
      ]
    };
  }

  if (domain === "binary_search") {
    return {
      summary: `把“${title}”看成单调性问题，先确定答案区间，再判断 mid 是否满足条件。`,
      steps: [
        "定义搜索区间和循环不变量。",
        "写出 check(mid) 的含义，判断 true / false 会保留哪半边。",
        "用最小样例检查边界：找不到、刚好等于、全部满足。"
      ],
      chinese_comments: [
        "中文注释：二分题先写判定函数，再写区间更新。",
        "中文注释：第一个大于等于通常使用左闭右开区间更稳定。"
      ]
    };
  }

  if (domain === "recursion" || domain === "divide_conquer") {
    return {
      summary: `把“${title}”分成递归入口、终止条件和合并过程，判断复杂度或结果。`,
      steps: [
        "找出子问题规模如何缩小。",
        "确认递归出口是否覆盖最小规模。",
        "把每层额外工作量和递归层数合并估算。"
      ],
      chinese_comments: [
        "中文注释：递归题要先看终止条件，再看每层做了什么。",
        "中文注释：分治题的答案通常来自左右子问题和跨区间合并。"
      ]
    };
  }

  if (domain === "sort_simulation" || domain === "greedy") {
    return {
      summary: `把“${title}”中的比较规则写清楚，再按排序过程或贪心选择逐步模拟。`,
      steps: [
        "明确排序关键字和相同关键字时的处理规则。",
        "如果是过程题，逐轮记录 pivot、交换或合并结果。",
        "如果是性质题，优先检查稳定性、复杂度和边界反例。"
      ],
      chinese_comments: [
        "中文注释：排序题要区分“结果正确”和“过程稳定”。",
        "中文注释：贪心题要说明当前选择为什么不会破坏后续最优。"
      ]
    };
  }

  if (domain === "high_precision") {
    return {
      summary: `把“${title}”按竖式运算理解，逐位维护进位、借位或余数。`,
      steps: [
        "确定数字是高位到低位还是低位到高位处理。",
        "每处理一位都更新当前余数或进位。",
        "最后处理前导零和除不尽的边界。"
      ],
      chinese_comments: [
        "中文注释：高精度题的变量含义必须逐位保持一致。",
        "中文注释：除法模拟时 rem 表示当前还没有被除尽的部分。"
      ]
    };
  }

  return {
    summary: `把“${title}”先定位到题型和知识点，再用小样例验证结论。`,
    steps: [
      questionType === "programming" ? "先写输入输出和核心状态变量。" : "先判断题干考查的是概念、过程还是代码结果。",
      "列出题目中的关键条件。",
      "构造一个最小样例，检查答案是否符合条件。"
    ],
    chinese_comments: [
      "中文注释：未分类题先保留复核状态，避免误贴算法标签。",
      "中文注释：先用样例理解题意，再补充正式分类。"
    ]
  };
}

function understandingExample(record) {
  const template = templateByDomain(record);
  const types = typeLabels(record);
  const knowledge = knowledgeLabels(record);
  return {
    language: "zh-CN",
    summary: template.summary,
    algorithm_domains: domainLabels(record),
    problem_types: types.length > 0 ? types : ["待抽取题型"],
    knowledge_points: knowledge.length > 0 ? knowledge : ["待补知识点"],
    steps: template.steps,
    chinese_comments: template.chinese_comments,
    example_hint: knowledge.length > 0
      ? `可围绕“${knowledge.slice(0, 2).join("、")}”构造一个小样例手算。`
      : "当前知识点证据不足，建议先人工复核后再补充更具体的小样例。"
  };
}

function reviewNotes(answer) {
  if (answer.status === "confirmed") {
    return ["官方答案表已提取，仍建议后续与题面选项做一次人工抽检。"];
  }
  if (answer.status === "reference_link") {
    return ["编程题需要后续补充可运行 C++ 参考程序；当前先展示解题思路和参考入口。"];
  }
  return ["未提取到稳定参考答案，必须进入复核队列或补充更强 PDF / OJ 解析。"];
}

async function main() {
  const [model, canonicalAlignment, officialPdfProblems] = await Promise.all([
    readJson(conflictModelPath),
    readJson(canonicalAlignmentPath),
    readJson(officialPdfProblemsPath)
  ]);
  const { officialById, selectionAnswerByDocumentKey } = officialProblemLookup(officialPdfProblems);
  const canonicalById = canonicalLookup(canonicalAlignment);
  const records = model.records.map((record) => {
    const officialProblem = officialById.get(record.official_problem_id);
    const canonicalProblem = canonicalById.get(record.canonical_problem_id);
    const answerTable = selectionAnswerByDocumentKey.get(officialProblem?.document_key) || new Map();
    const answer = referenceAnswer(record, officialProblem, canonicalProblem, answerTable);
    return {
      canonical_problem_id: record.canonical_problem_id,
      official_problem_id: record.official_problem_id,
      session: record.session,
      language: record.language,
      level: record.level,
      question_type: record.question_type,
      question_number: record.question_number,
      title: record.title,
      reference_answer: answer,
      understanding_example: understandingExample(record),
      reference_links: sourceLinks(canonicalProblem),
      review_notes: reviewNotes(answer)
    };
  });

  const summary = {
    record_count: records.length,
    confirmed_answer_count: records.filter((record) => record.reference_answer.status === "confirmed").length,
    reference_link_answer_count: records.filter((record) => record.reference_answer.status === "reference_link").length,
    needs_review_answer_count: records.filter((record) => record.reference_answer.status === "needs_review").length,
    cxx_level5_record_count: records.filter((record) => record.level === 5).length,
    cxx_level5_confirmed_answer_count: records.filter((record) => record.level === 5 && record.reference_answer.status === "confirmed").length
  };

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator,
    inputs: {
      conflict_confidence_model: conflictModelPath,
      canonical_alignment: canonicalAlignmentPath,
      official_pdf_problems: officialPdfProblemsPath
    },
    policy: {
      no_full_solution_storage: true,
      no_unverified_answer_as_confirmed: true,
      programming_answer_policy: "编程题先展示参考入口和中文解题思路，不臆造完整代码答案。",
      chinese_comment_required: true
    },
    summary,
    records
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`answer guidance record count: ${summary.record_count}`);
  console.log(`confirmed answer count: ${summary.confirmed_answer_count}`);
  console.log(`reference-link answer count: ${summary.reference_link_answer_count}`);
  console.log(`needs-review answer count: ${summary.needs_review_answer_count}`);
  console.log(`C++ level 5 confirmed answer count: ${summary.cxx_level5_confirmed_answer_count}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`Answer guidance build failed: ${error.message}`);
  process.exitCode = 1;
});
