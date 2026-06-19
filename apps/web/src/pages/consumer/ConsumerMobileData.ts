export type ConsumerView = "home" | "catalog" | "atcoder" | "problem" | "code" | "evidence" | "progress" | "profile";

export type Domain = {
  name: string;
  description: string;
  progress: number;
  tone: "good" | "normal" | "weak";
};

export type LevelSummary = {
  level: string;
  title: string;
  description: string;
  count: number;
  progress: number;
  tone: "good" | "normal" | "weak";
};

export type ProblemType = {
  count: number;
  name: string;
  description: string;
  level: string;
  source: "GESP" | "AtCoder";
  progress: number;
};

export type AtCoderTrack = {
  count: number;
  difficulty: string;
  name: string;
  description: string;
  tags: string[];
};

export const consumerHeaders: Record<ConsumerView, { eyebrow: string; title: string; description: string }> = {
  home: {
    eyebrow: "C++ 学习",
    title: "先选题库，再看题型",
    description: "GESP 全等级和 AtCoder 算法题库并列展示，移动端以查看、收藏和复习为主。"
  },
  catalog: {
    eyebrow: "GESP 分类",
    title: "全等级题型目录",
    description: "从一级到八级按算法范畴、题型模板和知识点浏览，不只停留在五级。"
  },
  atcoder: {
    eyebrow: "AtCoder",
    title: "算法题库专区",
    description: "按 AtCoder 难度、算法标签和样例完整度组织，和 GESP 等级体系分开展示。"
  },
  problem: {
    eyebrow: "2026-03 · C++ 五级",
    title: "有限小数判断",
    description: "选择题 · 质因数分解型 · 官方题源对齐。"
  },
  code: {
    eyebrow: "Read only",
    title: "只读代码讲解",
    description: "移动端只做查看、复制和标注，不提供在线编辑器。"
  },
  evidence: {
    eyebrow: "证据链",
    title: "为什么它属于五级数论",
    description: "展示官方来源、镜像入口和分类证据，避免把非官方标签当结论。"
  },
  progress: {
    eyebrow: "学习进度",
    title: "知识点覆盖",
    description: "按题型和知识点查看掌握度，优先补短板。"
  },
  profile: {
    eyebrow: "学习档案",
    title: "收藏夹与弱项",
    description: "把看过的题目、代码和知识点沉淀成复习入口。"
  }
};

export const consumerLevels: LevelSummary[] = [
  { level: "一级", title: "语法与输入输出", description: "变量、分支、循环、基础模拟", count: 34, progress: 92, tone: "good" },
  { level: "二级", title: "数组与字符串", description: "一维数组、字符处理、枚举", count: 42, progress: 86, tone: "good" },
  { level: "三级", title: "函数与结构化", description: "函数拆分、递推、简单排序", count: 48, progress: 78, tone: "normal" },
  { level: "四级", title: "基础算法综合", description: "搜索、排序、贪心、递归", count: 51, progress: 70, tone: "normal" },
  { level: "五级", title: "数论与二分强化", description: "质因数、gcd、二分、链表", count: 58, progress: 68, tone: "normal" },
  { level: "六级", title: "动态规划入门", description: "线性 DP、背包、状态转移", count: 45, progress: 43, tone: "weak" },
  { level: "七级", title: "图论与复杂结构", description: "最短路、并查集、树结构", count: 39, progress: 31, tone: "weak" },
  { level: "八级", title: "综合应用压轴", description: "多算法组合、建模和优化", count: 28, progress: 18, tone: "weak" }
];

export const consumerDomains: Domain[] = [
  { name: "数论", description: "质因数、gcd、筛法", progress: 84, tone: "good" },
  { name: "二分", description: "lower_bound、单调性、边界", progress: 72, tone: "normal" },
  { name: "链表", description: "指针重连、模拟", progress: 64, tone: "weak" },
  { name: "搜索", description: "DFS、BFS、状态剪枝", progress: 58, tone: "weak" },
  { name: "动态规划", description: "转移方程、背包、路径计数", progress: 43, tone: "weak" },
  { name: "高精度", description: "大整数、进位、字符串模拟", progress: 39, tone: "weak" }
];

export const consumerProblemTypes: ProblemType[] = [
  { count: 34, level: "一级", name: "基础输入输出型", description: "格式化输出、简单计算、分支判断", progress: 92, source: "GESP" },
  { count: 42, level: "二级", name: "数组枚举型", description: "最大最小值、计数、简单统计", progress: 86, source: "GESP" },
  { count: 31, level: "三级", name: "字符串处理型", description: "字符遍历、子串、大小写转换", progress: 78, source: "GESP" },
  { count: 28, level: "四级", name: "搜索与递归型", description: "DFS、回溯、路径枚举", progress: 70, source: "GESP" },
  { count: 12, level: "五级", name: "质因数分解型", description: "有限小数、约数拆分、复杂度估计", progress: 84, source: "GESP" },
  { count: 8, level: "五级", name: "gcd / lcm 变形", description: "欧几里得、循环过程、边界值", progress: 72, source: "GESP" },
  { count: 16, level: "六级", name: "线性 DP 型", description: "状态定义、转移、滚动数组", progress: 43, source: "GESP" },
  { count: 14, level: "七级", name: "图论路径型", description: "BFS、最短路、连通性", progress: 31, source: "GESP" },
  { count: 9, level: "八级", name: "综合建模型", description: "多算法组合、边界优化", progress: 18, source: "GESP" }
];

export const atCoderTracks: AtCoderTrack[] = [
  { count: 68, difficulty: "A-B", name: "入门实现", description: "条件、循环、数学小结论，适合一级到三级补速度。", tags: ["implementation", "math"] },
  { count: 74, difficulty: "C", name: "基础算法", description: "枚举、贪心、二分、前缀和，适合四级到五级巩固。", tags: ["binary search", "greedy"] },
  { count: 62, difficulty: "D", name: "DP / 图论", description: "状态转移、最短路、树和并查集，衔接六级以上。", tags: ["dp", "graph"] },
  { count: 36, difficulty: "E+", name: "挑战训练", description: "组合优化和复杂数据结构，只作为拔高题库入口。", tags: ["advanced", "data structure"] }
];

export const finiteDecimalCode = `int gcd(int a, int b) {
  while (b) {
    int t = a % b;
    a = b;
    b = t;
  }
  return a;
}

bool finiteDecimal(int p, int q) {
  int g = gcd(p, q);
  q /= g;
  while (q % 2 == 0) q /= 2;
  while (q % 5 == 0) q /= 5;
  return q == 1;
}`;
