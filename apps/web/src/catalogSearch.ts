import type { DomainGroup, EffectiveStatus, LevelCatalog, ProblemSummary, StatusCounts } from "./types";
import type { AtCoderDomainGroup, AtCoderProblemSummary } from "./types/atcoder";

function queryTokens(query: string) {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function matchesQuery(tokens: string[], fields: Array<string | number | null | undefined>) {
  if (tokens.length === 0) {
    return true;
  }
  const text = fields
    .filter((field) => field !== null && field !== undefined)
    .map((field) => String(field).toLowerCase())
    .join(" ");
  return tokens.every((token) => text.includes(token));
}

export function filterLevelCatalogByQuery(catalog: LevelCatalog | null, query: string): LevelCatalog | null {
  if (!catalog) {
    return null;
  }
  const tokens = queryTokens(query);
  if (tokens.length === 0) {
    return catalog;
  }
  const domains = catalog.domains
    .map((domain) => filterGespDomain(domain, tokens))
    .filter((domain): domain is DomainGroup => Boolean(domain));
  return {
    ...catalog,
    summary: {
      ...catalog.summary,
      problem_count: domains.reduce((sum, domain) => sum + domain.problem_count, 0),
      problem_type_count: domains.reduce((sum, domain) => sum + domain.problem_types.length, 0),
      knowledge_point_count: countGespKnowledgePoints(domains),
      status_counts: countGespStatuses(domains)
    },
    domains
  };
}

export function filterAtCoderDomainsByQuery(domains: AtCoderDomainGroup[], query: string) {
  const tokens = queryTokens(query);
  if (tokens.length === 0) {
    return domains;
  }
  return domains
    .map((domain) => filterAtCoderDomain(domain, tokens))
    .filter((domain): domain is AtCoderDomainGroup => Boolean(domain));
}

function filterGespDomain(domain: DomainGroup, tokens: string[]) {
  const domainMatches = matchesQuery(tokens, [domain.domain_id, domain.domain_label]);
  const problemTypes = domain.problem_types
    .map((type) => {
      const typeMatches = domainMatches || matchesQuery(tokens, [
        type.problem_type_id,
        type.problem_type_label,
        ...type.knowledge_points.flatMap((point) => [point.id, point.label])
      ]);
      const problems = typeMatches
        ? type.problems
        : type.problems.filter((problem) => matchesGespProblem(problem, tokens));
      return {
        ...type,
        problem_count: problems.length,
        problems
      };
    })
    .filter((type) => type.problem_count > 0);
  if (problemTypes.length === 0) {
    return null;
  }
  return {
    ...domain,
    problem_count: problemTypes.reduce((sum, type) => sum + type.problem_count, 0),
    status_counts: countGespDomainStatuses(problemTypes.flatMap((type) => type.problems)),
    problem_types: problemTypes
  };
}

function filterAtCoderDomain(domain: AtCoderDomainGroup, tokens: string[]) {
  const domainMatches = matchesQuery(tokens, [domain.domain_id, domain.domain_label]);
  const problemTypes = domain.problem_types
    .map((type) => {
      const typeMatches = domainMatches || matchesQuery(tokens, [
        type.problem_type_id,
        type.problem_type_label,
        ...type.knowledge_points.flatMap((point) => [point.id, point.label])
      ]);
      const problems = typeMatches
        ? type.problems
        : type.problems.filter((problem) => matchesAtCoderProblem(problem, tokens));
      return {
        ...type,
        problem_count: problems.length,
        problems
      };
    })
    .filter((type) => type.problem_count > 0);
  if (problemTypes.length === 0) {
    return null;
  }
  const problemCount = problemTypes.reduce((sum, type) => sum + type.problem_count, 0);
  return {
    ...domain,
    problem_count: problemCount,
    difficulty_counts: { ...domain.difficulty_counts },
    problem_types: problemTypes
  };
}

function matchesGespProblem(problem: ProblemSummary, tokens: string[]) {
  return matchesQuery(tokens, [
    problem.id,
    problem.official_problem_id,
    problem.session,
    problem.title,
    problem.question_type,
    problem.question_number,
    problem.answer_guidance?.reference_answer.answer,
    ...problem.problem_type_tags.flatMap((tag) => [tag.value, tag.label]),
    ...problem.knowledge_point_tags.flatMap((tag) => [tag.value, tag.label])
  ]);
}

function matchesAtCoderProblem(problem: AtCoderProblemSummary, tokens: string[]) {
  return matchesQuery(tokens, [
    problem.id,
    problem.pid,
    problem.title,
    problem.title_zh,
    problem.difficulty,
    problem.difficulty_label,
    problem.acceptance_rate === null ? null : `${(problem.acceptance_rate * 100).toFixed(1)}%`,
    ...problem.knowledge_points.flatMap((point) => [point.id, point.label])
  ]);
}

function countGespKnowledgePoints(domains: DomainGroup[]) {
  const points = new Set<string>();
  for (const type of domains.flatMap((domain) => domain.problem_types)) {
    for (const point of type.knowledge_points) {
      points.add(point.id || point.label);
    }
  }
  return points.size;
}

function countGespStatuses(domains: DomainGroup[]): StatusCounts {
  return countGespDomainStatuses(domains.flatMap((domain) => domain.problem_types.flatMap((type) => type.problems)));
}

function countGespDomainStatuses(problems: ProblemSummary[]): StatusCounts {
  const counts: StatusCounts = {
    confirmed: 0,
    candidate: 0,
    needs_review: 0,
    conflict: 0
  };
  for (const problem of problems) {
    counts[problem.status as EffectiveStatus] += 1;
  }
  return counts;
}
