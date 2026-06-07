import { readFile, writeFile } from "node:fs/promises";

const DATA_PATH = "data/atcoder/luogu-atcoder-problem-bank.json";

const PHRASE_TRANSLATIONS = new Map([
  ["atcoder programming lecture", "AtCoder 编程讲座"],
  ["atcoder company winter", "AtCoder 公司的冬天"],
  ["katana thrower", "投掷武士刀的人"],
  ["islands war", "岛屿战争"],
  ["integer cards", "整数卡片"],
  ["transformable teacher", "可变换的老师"],
  ["bread", "面包"],
  ["invisible hand", "看不见的手"],
  ["approximate equalization 2", "近似均衡 2"],
  ["merge slimes", "合并史莱姆"],
  ["printing machine", "打印机"],
  ["takahashi quest", "高桥的任务"],
  ["socks 2", "袜子 2"],
  ["ideal holidays", "理想假期"],
  ["popcount and xor", "二进制位数与异或"],
  ["divide interval", "划分区间"],
  ["tree and hamilton path 2", "树与哈密顿路径 2"],
  ["max × sum", "最大值乘以总和"],
  ["sowing stones", "播撒石子"],
  ["swap to gather", "交换并聚集"],
  ["strange bank", "奇怪的银行"],
  ["simple calculator", "简单计算器"],
  ["multiple array", "倍数数组"],
  ["airport bus", "机场巴士"],
  ["sorted arrays", "已排序数组"],
  ["limited insertion", "受限插入"],
  ["make it zigzag", "变成锯齿形"],
  ["right side character", "右侧字符"],
  ["new place", "新位置"],
  ["favorite game", "喜欢的游戏"],
  ["replace c or swap ab", "替换 C 或交换 AB"],
  ["parenthesis arrangement", "括号排列"],
  ["strange bank", "奇怪的银行"],
  ["sequence matching", "序列匹配"],
  ["vacation", "假期"],
  ["knapsack", "背包"],
  ["longest path", "最长路径"],
  ["stones", "石子游戏"],
  ["deque", "双端队列"],
  ["slimes", "史莱姆"],
  ["lcs", "最长公共子序列"],
  ["string", "字符串"],
  ["strings", "字符串"],
  ["count", "计数"],
  ["counting", "计数"],
  ["tree", "树"],
  ["graph", "图"],
  ["path", "路径"],
  ["game", "游戏"],
  ["grid", "网格"],
  ["matching", "匹配"],
  ["distance", "距离"],
  ["sum", "求和"],
  ["product", "乘积"],
  ["maximum", "最大值"],
  ["minimum", "最小值"],
  ["sort", "排序"],
  ["sorting", "排序"],
  ["query", "查询"],
  ["queries", "查询"],
  ["operation", "操作"],
  ["operations", "操作"],
  ["number", "数字"],
  ["numbers", "数字"],
  ["array", "数组"],
  ["subarray", "子数组"],
  ["subsequence", "子序列"],
  ["permutation", "排列"],
  ["probability", "概率"],
  ["expectation", "期望"],
  ["coloring", "染色"],
  ["connect", "连通"],
  ["connected", "连通"],
  ["shortest", "最短"],
  ["palindrome", "回文"],
  ["bracket", "括号"],
  ["brackets", "括号"],
  ["cards", "卡片"],
  ["card", "卡片"],
  ["teacher", "老师"],
  ["machine", "机器"],
  ["interval", "区间"],
  ["divide", "划分"],
  ["swap", "交换"],
  ["gather", "聚集"],
  ["quest", "任务"],
  ["holiday", "假期"],
  ["holidays", "假期"],
  ["slime", "史莱姆"],
  ["slimes", "史莱姆"],
  ["island", "岛屿"],
  ["islands", "岛屿"],
  ["war", "战争"],
  ["hand", "手"],
  ["equalization", "均衡"],
  ["approximate", "近似"],
  ["popcount", "二进制位数"],
  ["xor", "异或"],
  ["or", "或"],
  ["and", "和"],
  ["line", "直线"],
  ["domino", "多米诺"],
  ["dominoes", "多米诺"],
  ["minimum", "最小值"],
  ["maximum", "最大值"],
  ["minimize", "最小化"],
  ["maximize", "最大化"],
  ["range", "范围"],
  ["reverse", "反转"],
  ["filling", "填充"],
  ["logical", "逻辑"],
  ["path", "路径"],
  ["dictionary", "字典"],
  ["graph", "图"],
  ["separation", "分离"],
  ["diagonal", "对角线"],
  ["calculator", "计算器"],
  ["bus", "巴士"],
  ["airport", "机场"],
  ["place", "位置"],
  ["parenthesis", "括号"],
  ["arrangement", "排列"],
  ["similarity", "相似度"],
  ["receipt", "收据"],
  ["summer", "夏天"],
  ["winter", "冬天"]
]);

const JAPANESE_REPLACEMENTS = [
  ["AtCoderプログラミング講座", "AtCoder 编程讲座"],
  ["AtCoder社の冬", "AtCoder 公司的冬天"],
  ["辞書式順序ふたたび", "再探字典序"],
  ["バスと避けられない運命", "巴士与无法逃避的命运"],
  ["高橋くんのバグ探し", "高桥君寻找 Bug"],
  ["鍵と宝箱", "钥匙和宝箱"],
  ["温度調整の最小コスト", "温度调整的最小成本"],
  ["究極の団子職人", "终极团子匠人"],
  ["夏休み", "暑假"],
  ["レシート", "收据"],
  ["デクレッシェンド", "渐弱"],
  ["プログラミング", "编程"],
  ["講座", "讲座"],
  ["辞書式順序", "字典序"],
  ["ふたたび", "再一次"],
  ["高橋", "高桥"],
  ["青木", "青木"],
  ["太郎", "太郎"],
  ["くん", "君"],
  ["バグ", "Bug"],
  ["探し", "寻找"],
  ["社", "公司"],
  ["冬", "冬天"],
  ["夏", "夏天"],
  ["休み", "休假"],
  ["鍵", "钥匙"],
  ["宝箱", "宝箱"],
  ["温度", "温度"],
  ["調整", "调整"],
  ["最小", "最小"],
  ["コスト", "成本"],
  ["団子", "团子"],
  ["職人", "匠人"],
  ["究極", "终极"],
  ["運命", "命运"],
  ["避けられない", "无法避免"],
  ["バス", "巴士"]
];

const DOMAIN_ANSWERS = {
  "动态规划": {
    idea: "定义状态表示处理到某个位置、集合或容量时的最优值/方案数，明确初始状态后按依赖顺序转移。",
    steps: ["确定状态含义", "写出转移方程", "设置边界条件", "按拓扑或下标顺序计算答案"]
  },
  "贪心": {
    idea: "找到局部选择规则，并用交换论证或反证说明每一步选择不会让最终答案变差。",
    steps: ["抽取排序或扫描关键字", "维护当前可行状态", "每次做局部最优选择", "证明选择可交换到某个最优解中"]
  },
  "字符串": {
    idea: "围绕字符位置、前后缀、匹配关系或字典序建模，避免重复扫描导致复杂度过高。",
    steps: ["分析字符关系", "选择哈希/KMP/Trie/DP/双指针等工具", "维护匹配或计数状态", "处理边界和空串情况"]
  },
  "图论": {
    idea: "把对象关系转成点和边，再根据路径、连通性、拓扑或最短路目标选择图算法。",
    steps: ["定义图中的点和边", "判断边权和方向", "选择 BFS/DFS/Dijkstra/拓扑等算法", "从目标节点或源点统计答案"]
  },
  "数据结构": {
    idea: "把动态查询或修改抽象成区间、集合、栈队列、堆、树状数组或线段树维护问题。",
    steps: ["明确需要维护的量", "选择支持对应操作的数据结构", "处理更新与查询顺序", "检查复杂度是否满足约束"]
  },
  "数学": {
    idea: "把题意转化为公式、同余、组合计数或数论性质，先化简再实现。",
    steps: ["列出关键等式/不等式", "化简计数或取模条件", "处理边界和整除情况", "用预处理降低复杂度"]
  },
  "搜索": {
    idea: "设计搜索状态和转移，结合剪枝、访问标记或 BFS 层序控制状态规模。",
    steps: ["定义状态和合法转移", "选择 DFS/BFS/记忆化搜索", "加入 visited 或剪枝", "从终止状态回收答案"]
  },
  "排序": {
    idea: "选择能暴露结构的排序关键字，排序后通过相邻比较、扫描统计或贪心选择得到答案。",
    steps: ["确定排序关键字", "排序后线性扫描", "维护前缀/窗口/当前最优", "处理相等元素和边界"]
  },
  "待分类": {
    idea: "先从题面约束和样例反推模型，再选择合适算法；当前洛谷标签不足，需要人工复核。",
    steps: ["阅读题面约束", "从样例推导规律", "判断是否是模拟/贪心/DP/图论", "补充人工分类后再优化答案"]
  }
};

function normalizeTitle(title) {
  return title.replace(/^\[[^\]]+\]\s*/, "").trim();
}

function generateChineseTitle(title) {
  const raw = normalizeTitle(title);
  const exact = PHRASE_TRANSLATIONS.get(raw.toLowerCase());
  if (exact) {
    return exact;
  }

  let japaneseTranslated = raw;
  for (const [source, target] of JAPANESE_REPLACEMENTS) {
    japaneseTranslated = japaneseTranslated.replaceAll(source, target);
  }
  japaneseTranslated = japaneseTranslated
    .replaceAll("の", "的")
    .replaceAll("と", "和")
    .replaceAll("を", "")
    .replaceAll("に", "到")
    .replaceAll("へ", "到");
  if (japaneseTranslated !== raw && /[\u4e00-\u9fff]/.test(japaneseTranslated)) {
    return japaneseTranslated;
  }

  const lower = raw.toLowerCase();
  if (PHRASE_TRANSLATIONS.has(lower)) {
    return PHRASE_TRANSLATIONS.get(lower);
  }
  const words = raw.split(/[\s_-]+/).filter(Boolean);
  const translated = words.map((word) => {
    const cleaned = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    return PHRASE_TRANSLATIONS.get(cleaned) || word;
  });
  const wordTranslated = translated.join(" ");
  if (/[\u4e00-\u9fff]/.test(wordTranslated)) {
    return wordTranslated;
  }
  return `${raw}（中文名待校对）`;
}

function generatedAnswer(problem) {
  const primaryDomain = problem.algorithm_domains[0]?.label || "待分类";
  const template = DOMAIN_ANSWERS[primaryDomain] || DOMAIN_ANSWERS["待分类"];
  const sampleCount = problem.statement?.samples?.length || 0;
  const knowledge = problem.knowledge_points.slice(0, 6).map((point) => point.label).join("、");
  return {
    answer: `当前答案是 AI 生成，仅供参考。建议从「${primaryDomain}」角度建模：${template.idea}`,
    solution_outline: [
      `算法范畴：${primaryDomain}。`,
      `关键知识点：${knowledge || "需结合题面补充"}。`,
      `参考步骤：${template.steps.map((step, index) => `${index + 1}. ${step}`).join("；")}。`,
      sampleCount ? `当前已抓取 ${sampleCount} 组公开样例，可用来检查实现。` : "当前未发现公开样例，需要额外构造测试。"
    ].join("\n"),
    review_note: "当前答案是 AI 生成，仅供参考；不是官方题解，正式提交前请结合题面约束、样例和 OJ 评测复核。"
  };
}

async function main() {
  const catalog = JSON.parse(await readFile(DATA_PATH, "utf8"));
  let updatedCount = 0;
  catalog.problems = catalog.problems.map((problem) => {
    const needsTitle = !problem.title_zh || !/[\u4e00-\u9fff]/.test(problem.title_zh);
    const needsAnswer = !/AI 生成，仅供参考/.test(problem.answer_guidance?.answer || "");
    const needsSolutionNotice = !problem.programming_solution?.code && !/AI 生成，仅供参考/.test(problem.programming_solution?.ai_generation_notice || "");
    if (!needsTitle && !needsAnswer && !needsSolutionNotice) {
      return problem;
    }
    const generated = generatedAnswer(problem);
    const titleZh = needsTitle ? generateChineseTitle(problem.title) : problem.title_zh;
    updatedCount += 1;
    const shouldFillProgrammingSolution = (needsAnswer || needsSolutionNotice) && !problem.programming_solution?.code;
    return {
      ...problem,
      title_zh: titleZh,
      title_zh_source: needsTitle ? "local_ai_generated_review_required" : problem.title_zh_source,
      answer_guidance: {
        ...problem.answer_guidance,
        content_origin: "local_ai_generated_reference",
        answer: generated.answer,
        solution_outline: generated.solution_outline,
        review_note: generated.review_note
      },
      programming_solution: shouldFillProgrammingSolution
        ? {
          ...problem.programming_solution,
          status: "needs_review",
          content_origin: "local_ai_generated_reference",
          ai_generation_notice: "当前答案是 AI 生成，仅供参考；不是官方题解，正式提交前请人工复核或通过 OJ 评测。",
          reference_answer: generated.answer,
          algorithm: generated.solution_outline,
          notes: [
            "当前为本地 AI 生成的参考思路，不是官方答案。",
            "尚未生成逐题 C++ 完整代码；如需代码，应基于题面继续补充并做样例验证。"
          ]
        }
        : problem.programming_solution
    };
  });
  const problemById = new Map(catalog.problems.map((problem) => [problem.id, problem]));
  catalog.domains = catalog.domains.map((domain) => ({
    ...domain,
    problem_types: domain.problem_types.map((problemType) => ({
      ...problemType,
      problems: problemType.problems.map((problem) => problemById.get(problem.id) || problem)
    }))
  }));
  catalog.summary.local_ai_answer_count = catalog.problems.length;
  catalog.summary.title_zh_count = catalog.problems.filter((problem) => problem.title_zh).length;
  catalog.summary.pending_ai_generation_count = catalog.problems.filter((problem) => problem.programming_solution?.status === "pending_ai_generation").length;
  catalog.summary.ai_sample_verified_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.verification?.status === "sample_passed").length;
  catalog.summary.ai_compile_verified_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.verification?.status === "compiled_no_samples").length;
  catalog.summary.ai_not_verified_by_request_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.verification?.status === "not_verified_by_request").length;
  catalog.summary.ai_unverified_reference_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.content_origin === "ai_generated_unverified_reference").length;
  catalog.summary.subagent_ai_reference_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.content_origin === "subagent_ai_generated_reference").length;
  catalog.generated_at = new Date().toISOString();
  await writeFile(DATA_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`local AI answer fields updated: ${updatedCount}`);
  console.log(`local AI answer fields generated: ${catalog.summary.local_ai_answer_count}`);
  console.log(`Chinese title fields generated: ${catalog.summary.title_zh_count}`);
}

main().catch((error) => {
  console.error(`AtCoder local AI field generation failed: ${error.message}`);
  process.exitCode = 1;
});
