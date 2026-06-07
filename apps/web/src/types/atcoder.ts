export type AtCoderLabel = {
  id: string;
  label: string;
};

export type AtCoderAnswerGuidance = {
  status: "reference_link";
  answer: string;
  source: "luogu_problem_page";
  source_url: string;
  solution_outline: string;
  knowledge_points: string[];
  review_note: string;
};

export type AtCoderStatementSection = {
  id: string;
  title: string;
  markdown: string;
};

export type AtCoderSampleCase = {
  id: string;
  input: string;
  output: string;
};

export type AtCoderVisualAsset = {
  id: string;
  section_id: string;
  source_url: string;
  alt_text: string;
  status: "downloaded" | "download_failed";
  local_path: string | null;
  asset_url: string;
  content_type?: string | null;
  size_bytes?: number;
  error?: string;
};

export type AtCoderStatement = {
  status: "source_extracted" | "pending_collection";
  locale: string;
  source_terms_status: "needs_review";
  source_url: string;
  atcoder_url: string | null;
  sections: AtCoderStatementSection[];
  samples: AtCoderSampleCase[];
  limits: {
    time_ms: number | null;
    memory_kb: number | null;
  };
  notes: string[];
};

export type AtCoderProgrammingSolution = {
  status: "pending_ai_generation" | "needs_review";
  language: "C++17";
  code: string | null;
  content_origin:
    | "pending_ai_generation"
    | "ai_generated_sample_verified"
    | "ai_generated_compile_verified"
    | "local_ai_generated_reference"
    | "ai_generated_unverified_reference"
    | "subagent_ai_generated_reference";
  ai_generation_notice: string;
  reference_answer: string;
  algorithm: string;
  complexity: string;
  verification: null | {
    status: "sample_passed" | "compiled_no_samples" | "not_verified_by_request";
    verifier: string;
    verified_at?: string;
    checked_at?: string;
    sample_count?: number;
    sample_results?: Array<{
      index: number;
      expected: string;
      actual: string;
      passed: boolean;
    }>;
    sample_passed?: boolean | null;
    compile_passed?: boolean | null;
  };
  notes: string[];
};

export type AtCoderProblemSummary = {
  id: string;
  pid: string;
  title: string;
  title_zh: string;
  title_zh_source?: string;
  difficulty: 3 | 4 | 5;
  difficulty_label: "普及/提高-" | "普及+/提高" | "提高+/省选-";
  total_submit: number;
  total_accepted: number;
  acceptance_rate: number | null;
  knowledge_points: AtCoderLabel[];
};

export type AtCoderTag = {
  id: number;
  name: string;
  type: number;
  parent: number | null;
};

export type AtCoderProblem = AtCoderProblemSummary & {
  source_url: string;
  algorithm_domains: AtCoderLabel[];
  problem_type_tags: AtCoderLabel[];
  answer_guidance: AtCoderAnswerGuidance;
  tags: AtCoderTag[];
  statement: AtCoderStatement;
  visual_assets: {
    status: "source_extracted" | "none_found" | "pending_collection";
    assets: AtCoderVisualAsset[];
    notes: string[];
  };
  programming_solution: AtCoderProgrammingSolution;
  list_order: number;
};

export type AtCoderProblemTypeGroup = {
  problem_type_id: string;
  problem_type_label: string;
  problem_count: number;
  knowledge_points: AtCoderLabel[];
  problems: AtCoderProblemSummary[];
};

export type AtCoderDomainGroup = {
  domain_id: string;
  domain_label: string;
  problem_count: number;
  difficulty_counts: Record<string, number>;
  problem_types: AtCoderProblemTypeGroup[];
};

export type AtCoderCatalog = {
  generated_at: string;
  source: {
    list_url: string;
    tag_url: string;
    total_source_problem_count: number;
    pages_crawled: number;
    crawl_delay_ms: number;
    difficulty_filter: Array<{ difficulty: number; label: string }>;
    notes: string[];
  };
  summary: {
    problem_count: number;
    difficulty_counts: Record<string, number>;
    domain_count: number;
    knowledge_point_count: number;
    local_ai_answer_count?: number;
    title_zh_count?: number;
    source_extracted_statement_count?: number;
    pending_statement_count?: number;
    ai_sample_verified_solution_count?: number;
    pending_ai_generation_count?: number;
  };
  domains: AtCoderDomainGroup[];
};
