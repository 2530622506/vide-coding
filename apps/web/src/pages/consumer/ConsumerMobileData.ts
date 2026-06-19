export type ConsumerView = "home" | "catalog" | "atcoder" | "problem" | "code" | "evidence" | "progress" | "profile";

export type Tone = "good" | "normal" | "weak";

export type Domain = {
  id: string;
  name: string;
  description: string;
  count: number;
  progress: number;
  tone: Tone;
};

export type LevelSummary = {
  level: number;
  label: string;
  title: string;
  description: string;
  count: number;
  progress: number;
  tone: Tone;
};

export type ProblemType = {
  id: string;
  count: number;
  name: string;
  description: string;
  level: string;
  source: "GESP";
  progress: number;
};

export type AtCoderTrack = {
  count: number;
  difficulty: string;
  name: string;
  description: string;
  tags: string[];
};

export type ConsumerProblem = {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  question_type: string;
  domain: string;
  problem_type: string;
  knowledge_points: string[];
  statement: string;
  answer_status: string;
  confidence: number | null;
  code: string | null;
  code_filename: string;
  algorithm: string | null;
  complexity: string | null;
  steps: string[];
  source_links: Array<{ title: string; url: string | null; tag: string; tone: Tone }>;
};

export type ConsumerMobileContent = {
  generated_at: string;
  data_source: {
    gesp: string;
    atcoder: unknown;
  };
  learning: {
    viewed_count: number;
    saved_code_count: number;
    reviewed_count: number;
    progress_pct: number;
    weak_points: string[];
    recommendation: string;
  };
  gesp: {
    total_count: number;
    levels: LevelSummary[];
    domains: Domain[];
    problem_types: ProblemType[];
    featured_problem: ConsumerProblem | null;
  };
  atcoder: {
    total_count: number;
    tag_count: number;
    statement_count: number;
    tracks: AtCoderTrack[];
    featured_problem: ConsumerProblem | null;
  };
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
