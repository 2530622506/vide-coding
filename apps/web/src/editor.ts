import type { ProblemDetailResponse, ProblemMutationPayload } from "./types";

export type EditorMode = "create" | "edit";

export type ProblemEditorForm = {
  canonical_problem_id: string;
  title: string;
  session: string;
  level: string;
  question_type: ProblemMutationPayload["question_type"];
  question_number: string;
  algorithm_domains: string;
  problem_types: string;
  knowledge_points: string;
  statement: string;
  answer: string;
  explanation: string;
  solution_code: string;
  choice_options: string;
  sample_cases: string;
  visual_assets: string;
  source_url: string;
  source_title: string;
};

export function emptyEditorForm(level: number): ProblemEditorForm {
  return {
    canonical_problem_id: "",
    title: "",
    session: "user",
    level: String(level),
    question_type: "programming",
    question_number: "",
    algorithm_domains: "基础程序设计",
    problem_types: "",
    knowledge_points: "",
    statement: "",
    answer: "",
    explanation: "",
    solution_code: "",
    choice_options: "",
    sample_cases: "",
    visual_assets: "",
    source_url: "",
    source_title: ""
  };
}

export function formFromProblem(problem: ProblemDetailResponse): ProblemEditorForm {
  const statement = problem.detail?.statement.sections?.map((section) => section.markdown).join("\n\n")
    || problem.detail?.statement.stem
    || "";
  const sourceLink = problem.detail?.source_links.find((source) => source.url || source.source_url);

  return {
    canonical_problem_id: problem.id,
    title: problem.title,
    session: problem.session,
    level: String(problem.level),
    question_type: problem.question_type,
    question_number: String(problem.question_number),
    algorithm_domains: problem.resolved_algorithm_domains.map((tag) => tag.label).join(", "),
    problem_types: problem.resolved_problem_type_tags.map((tag) => tag.label).join(", "),
    knowledge_points: problem.resolved_knowledge_point_tags.map((tag) => tag.label).join(", "),
    statement,
    answer: problem.answer_guidance?.reference_answer.answer || "",
    explanation: problem.answer_guidance?.understanding_example.summary || "",
    solution_code: problem.detail?.programming_solution.code || "",
    choice_options: problem.detail?.choice_options.options.map((option) => `${option.key}. ${option.text}`).join("\n") || "",
    sample_cases: problem.detail?.sample_cases.cases.map((sample) => `${sample.input} => ${sample.output}`).join("\n") || "",
    visual_assets: problem.detail?.visual_assets.assets.map((asset) => `${asset.asset_url} | ${asset.alt_text}`).join("\n") || "",
    source_url: sourceLink?.url || sourceLink?.source_url || "",
    source_title: sourceLink?.title || ""
  };
}

function splitList(value: string) {
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}

function parseChoiceOptions(value: string): ProblemMutationPayload["choice_options"] {
  const lines = value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return undefined;
  }
  return lines.map((line, index) => {
    const matched = line.match(/^([A-Za-z0-9])[\s.．、:：-]+(.+)$/);
    return {
      key: matched?.[1]?.toUpperCase() || String.fromCharCode(65 + index),
      text: (matched?.[2] || line).trim()
    };
  });
}

function parseSampleCases(value: string): ProblemMutationPayload["sample_cases"] {
  const lines = value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return undefined;
  }
  return lines.map((line) => {
    const [input = "", output = ""] = line.split(/\s*=>\s*/);
    return { input: input.trim(), output: output.trim() };
  }).filter((sample) => sample.input || sample.output);
}

function parseVisualAssets(value: string): ProblemMutationPayload["visual_assets"] {
  const lines = value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return undefined;
  }
  return lines.map((line) => {
    const [assetUrl = "", altText = "用户维护的题目图片"] = line.split(/\s*\|\s*/);
    return {
      asset_url: assetUrl.trim(),
      alt_text: altText.trim() || "用户维护的题目图片"
    };
  }).filter((asset) => asset.asset_url);
}

export function formToPayload(form: ProblemEditorForm): ProblemMutationPayload {
  return {
    canonical_problem_id: form.canonical_problem_id || undefined,
    title: form.title,
    session: form.session || undefined,
    level: Number(form.level),
    question_type: form.question_type,
    question_number: form.question_number ? Number(form.question_number) : undefined,
    algorithm_domains: splitList(form.algorithm_domains),
    problem_types: splitList(form.problem_types),
    knowledge_points: splitList(form.knowledge_points),
    statement: form.statement || undefined,
    answer: form.answer || undefined,
    explanation: form.explanation || undefined,
    solution_code: form.solution_code || undefined,
    choice_options: parseChoiceOptions(form.choice_options),
    sample_cases: parseSampleCases(form.sample_cases),
    visual_assets: parseVisualAssets(form.visual_assets),
    source_url: form.source_url || undefined,
    source_title: form.source_title || undefined
  };
}
