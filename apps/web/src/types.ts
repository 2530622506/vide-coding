export type EffectiveStatus = "confirmed" | "candidate" | "needs_review" | "conflict";

export type StatusCounts = Record<EffectiveStatus, number>;

export type ResolvedTag = {
  kind: string;
  value: string;
  label: string;
  final_confidence: number;
  effective_review_status: EffectiveStatus;
};

export type AnswerGuidance = {
  content_origin?: "official_extracted" | "ai_generated_learning_aid" | string;
  ai_generation_notice?: string;
  reference_answer: {
    status: "confirmed" | "reference_link" | "needs_review";
    answer: string | null;
    answer_format: string;
    source: string;
    source_url: string;
    evidence: string;
    confidence: number;
    review_status: string;
  };
  understanding_example: {
    language: "zh-CN";
    summary: string;
    algorithm_domains: string[];
    problem_types: string[];
    knowledge_points: string[];
    steps: string[];
    chinese_comments: string[];
    example_hint: string;
  };
  reference_links: Array<{
    role?: string;
    source_kind?: string;
    reference_kind?: string | null;
    title?: string;
    url?: string;
    source_url?: string;
    trust_level?: string;
  }>;
  review_notes: string[];
};

export type ProblemDetail = {
  canonical_problem_id: string;
  content_origin?: string;
  ai_generation_notice?: string;
  statement: {
    status: "partial" | "pending_collection" | "source_extracted";
    stem: string;
    evidence_snippet: string | null;
    source_url: string | null;
    source_page: number | null;
    source_terms_status?: "needs_review" | string;
    sections?: Array<{ id: string; title: string; markdown: string }>;
    notes: string[];
  };
  choice_options: {
    status: "pending_collection" | "source_extracted" | "needs_review" | "standard_binary" | "not_applicable";
    options: Array<{ key: string; text: string; source_status: string }>;
    extraction_method?: string;
    notes: string[];
  };
  visual_assets: {
    status: "pending_collection" | "ready" | "not_applicable" | "source_extracted" | "none_found";
    assets: Array<{
      id: string;
      asset_url: string;
      alt_text: string;
      source_url: string | null;
      source_page: number | null;
    }>;
    source_hint: {
      source_url: string | null;
      source_page: number | null;
    };
    notes: string[];
  };
  programming_solution: {
    status: "confirmed" | "reference_link" | "needs_review" | "not_applicable";
    language: "C++";
    code: string | null;
    content_origin?: "ai_generated_sample_verified" | string;
    ai_generation_notice?: string;
    algorithm?: string;
    complexity?: string;
    verification?: {
      status: "sample_passed" | string;
      sample_count: number;
      verified_at: string;
    };
    reference_answer?: string | null;
    notes: string[];
  };
  sample_cases: {
    status: "pending_collection" | "not_applicable" | "source_extracted" | "none_found";
    cases: Array<{ input: string; output: string }>;
    notes: string[];
  };
  source_links: Array<{
    role?: string | null;
    source_kind?: string | null;
    title?: string | null;
    url?: string | null;
    source_url?: string | null;
    trust_level?: string | null;
    reference_kind?: string | null;
  }>;
  completeness: {
    has_statement_stem: boolean;
    has_choice_options: boolean;
    has_visual_assets: boolean;
    has_reference_answer: boolean;
    needs_option_collection: boolean;
    needs_visual_asset_collection: boolean;
    needs_programming_solution: boolean;
    needs_source_enrichment: boolean;
    needs_solution_review?: boolean;
  };
};

export type LevelSummary = {
  level: number;
  problem_count: number;
  domain_count: number;
  status_counts: StatusCounts;
  domain_ids: string[];
};

export type ProblemSummary = {
  id: string;
  official_problem_id: string;
  session: string;
  title: string;
  question_type: "selection" | "judgment" | "programming";
  question_number: number;
  status: EffectiveStatus;
  review_queue_count: number;
  source_conflict_count: number;
  problem_type_tags: ResolvedTag[];
  knowledge_point_tags: ResolvedTag[];
  answer_guidance: AnswerGuidance | null;
  detail_completeness: ProblemDetail["completeness"] | null;
};

export type ProblemDetailResponse = ProblemSummary & {
  data_source: "mysql" | "json";
  level: number;
  language: "C++";
  resolved_algorithm_domains: ResolvedTag[];
  resolved_problem_type_tags: ResolvedTag[];
  resolved_knowledge_point_tags: ResolvedTag[];
  answer_guidance: AnswerGuidance | null;
  detail: ProblemDetail | null;
  source_versions: Array<Record<string, unknown>>;
  review_items: Array<Record<string, unknown>>;
};

export type ProblemTypeGroup = {
  problem_type_id: string;
  problem_type_label: string;
  problem_count: number;
  knowledge_points: Array<{ id: string; label: string }>;
  problems: ProblemSummary[];
};

export type DomainGroup = {
  domain_id: string;
  domain_label: string;
  problem_count: number;
  status_counts: StatusCounts;
  problem_types: ProblemTypeGroup[];
};

export type LevelCatalog = {
  generated_at: string;
  level: number;
  language: "C++";
  summary: {
    problem_count: number;
    status_counts: StatusCounts;
    problem_type_count: number;
    knowledge_point_count: number;
  };
  domains: DomainGroup[];
};

export type ReviewQueueSummary = {
  summary: {
    total_count: number;
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  };
  high_priority: Array<{
    id: string;
    type: string;
    title: string;
    reason: string;
    canonical_problem_id: string | null;
  }>;
  medium_priority_count: number;
  low_priority_count: number;
};
