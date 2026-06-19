export type ConsumerView = "home" | "catalog" | "problem" | "code" | "evidence" | "progress" | "profile";

export type Domain = {
  name: string;
  description: string;
  progress: number;
  tone: "good" | "normal" | "weak";
};

export const consumerHeaders: Record<ConsumerView, { eyebrow: string; title: string; description: string }> = {
  home: {
    eyebrow: "C++ 五级",
    title: "今天先把数论补齐",
    description: "继续上次的题型目录，优先看质因数、gcd 和有限小数。"
  },
  catalog: {
    eyebrow: "分类目录",
    title: "从等级到题型",
    description: "按等级、算法范畴和题型模板浏览，不把搜索作为唯一入口。"
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

export const consumerDomains: Domain[] = [
  { name: "数论", description: "质因数、gcd、筛法", progress: 84, tone: "good" },
  { name: "二分", description: "lower_bound、单调性、边界", progress: 72, tone: "normal" },
  { name: "链表", description: "指针重连、模拟", progress: 64, tone: "weak" },
  { name: "高精度", description: "大整数、进位、字符串模拟", progress: 39, tone: "weak" }
];

export const consumerProblemTypes = [
  { count: 12, name: "质因数分解型", description: "有限小数、约数拆分、复杂度估计", progress: 84 },
  { count: 8, name: "gcd / lcm 变形", description: "欧几里得、循环过程、边界值", progress: 72 },
  { count: 5, name: "筛法判断", description: "埃氏筛、质数表、标记过程", progress: 45 }
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
