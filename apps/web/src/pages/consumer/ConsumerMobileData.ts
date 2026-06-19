export type ConsumerView = "home" | "catalog" | "atcoder" | "problem" | "code" | "progress" | "profile";

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
  source: "gesp" | "atcoder";
  title: string;
  subtitle: string;
  level: string;
  question_type: string;
  domain: string;
  problem_type: string;
  knowledge_points: string[];
  statement: string;
  statement_sections: Array<{ id: string; title: string; markdown: string }>;
  sample_cases: Array<{ input: string; output: string }>;
  answer_status: string;
  confidence: number | null;
  code: string | null;
  code_filename: string;
  algorithm: string | null;
  complexity: string | null;
  steps: string[];
  source_links: Array<{ title: string; url: string | null; tag: string; tone: Tone }>;
};

export type MobileProblemListItem = {
  id: string;
  title: string;
  subtitle: string;
  level: string;
  domain: string;
  problem_type: string;
  knowledge_points: string[];
  answer_status: string;
  has_code: boolean;
};

export type MobileGespCatalog = {
  selected_level: number;
  selected_domain_id: string | null;
  selected_problem_type_id: string | null;
  levels: LevelSummary[];
  domains: Domain[];
  problem_types: ProblemType[];
  problems: MobileProblemListItem[];
};

export type MobileAtCoderCatalog = {
  selected_difficulty: string;
  tracks: AtCoderTrack[];
  problems: MobileProblemListItem[];
};

export type MobileProgressEvent = {
  problemId: string;
  recordedAt?: string;
  source?: "gesp" | "atcoder";
  title?: string;
  type: "view" | "favorite" | "review";
};

export type MobileProgress = {
  data_source: "mysql" | "memory";
  user_key: string;
  activity_count: number;
  progress_pct: number;
  viewed_count: number;
  favorite_count: number;
  reviewed_count: number;
  weekly_viewed_count: number;
  weekly_favorite_count: number;
  weekly_reviewed_count: number;
  viewed: MobileProgressEvent[];
  favorites: MobileProgressEvent[];
  reviewed: MobileProgressEvent[];
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
    eyebrow: "",
    title: "参考代码",
    description: ""
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
