import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const ingestionPath = "data/wanjuanwang-ingestion/wanjuanwang-gesp-cpp-exams.json";
const catalogPath = "data/classification/wanjuanwang-gesp-cpp-problems.json";
const outputPath = "data/exports/wanjuanwang-gesp-cpp-answer-backlog.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function classifyBacklogTheme(question) {
  const text = String(question.stem_text || "");
  if (question.question_type === "programming") {
    if (/图|树|最短路|生成树|DFS|BFS|哈希/.test(text)) {
      return "programming_graph_or_tree";
    }
    if (/动态规划|背包|LIS|最大值|最少/.test(text)) {
      return "programming_dynamic_programming";
    }
    if (/质数|最大公因数|最小公倍数|整除|因数/.test(text)) {
      return "programming_number_theory";
    }
    return "programming_other";
  }
  if (/https?:\/\//.test(JSON.stringify(question.choice_options || []))) {
    return "image_option_selection";
  }
  if (/图|树|最短路|生成树|DFS|BFS|哈夫曼/.test(text)) {
    return "selection_graph_or_tree";
  }
  if (/概率|方案|排列|组合|硬币|孩子|拍照/.test(text)) {
    return "selection_counting";
  }
  if (/时间复杂度|空间复杂度/.test(text)) {
    return "selection_complexity";
  }
  if (/动态规划|贪心|分治|递归/.test(text)) {
    return "selection_algorithm_concept";
  }
  if (/构造函数|析构函数|继承|派生类|基类|类和对象/.test(text)) {
    return "selection_oop";
  }
  if (/质数|最大公因数|最小公倍数|整除|因数|筛法/.test(text)) {
    return "selection_number_theory";
  }
  return `${question.question_type}_other`;
}

async function main() {
  const [ingestion, catalog] = await Promise.all([
    readJson(ingestionPath),
    readJson(catalogPath)
  ]);
  const detailById = new Map(catalog.problem_details.map((record) => [record.canonical_problem_id, record]));
  const guidanceById = new Map(catalog.answer_guidance.map((record) => [record.canonical_problem_id, record]));
  const allQuestions = ingestion.pages.flatMap((page) => page.questions);
  const unresolved = allQuestions.filter((question) => {
    const guidance = guidanceById.get(question.id);
    const detail = detailById.get(question.id);
    const hasGeneratedChoiceOrJudgmentAnswer = question.question_type !== "programming"
      && guidance?.reference_answer?.source === "generated_local_cpp"
      && typeof guidance?.reference_answer?.answer === "string"
      && guidance.reference_answer.answer.trim().length > 0;
    const hasProgrammingSolution = question.question_type === "programming"
      && typeof detail?.programming_solution?.code === "string"
      && detail.programming_solution.code.trim().length > 0;
    return !hasGeneratedChoiceOrJudgmentAnswer && !hasProgrammingSolution;
  });

  const byType = {
    selection: 0,
    judgment: 0,
    programming: 0
  };
  const byTheme = {};
  const samplesByTheme = {};

  for (const question of unresolved) {
    byType[question.question_type] += 1;
    const theme = classifyBacklogTheme(question);
    byTheme[theme] = (byTheme[theme] || 0) + 1;
    if (!samplesByTheme[theme]) {
      samplesByTheme[theme] = [];
    }
    if (samplesByTheme[theme].length < 8) {
      samplesByTheme[theme].push({
        id: question.id,
        level: question.level,
        title: question.stem_text || question.page_title
      });
    }
  }

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/export-wanjuanwang-gesp-cpp-answer-backlog.mjs",
    inputs: {
      ingestion: ingestionPath,
      catalog: catalogPath
    },
    summary: {
      total_unresolved: unresolved.length,
      by_question_type: byType,
      by_theme: byTheme
    },
    samples_by_theme: samplesByTheme
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wanjuanwang answer backlog unresolved: ${output.summary.total_unresolved}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`WanJuanWang answer backlog export failed: ${error.message}`);
  process.exitCode = 1;
});
