import { Inject, Injectable } from "@nestjs/common";
import { AtCoderCatalogService, type AtCoderProblem, type AtCoderProblemSummary } from "./atcoder-catalog.service.js";
import { CatalogService } from "./catalog.service.js";

type Tone = "good" | "normal" | "weak";
type LevelCatalog = NonNullable<Awaited<ReturnType<CatalogService["getLevelCatalog"]>>>;
type LevelResponse = Awaited<ReturnType<CatalogService["getLevels"]>>;
type GespProblem = NonNullable<Awaited<ReturnType<CatalogService["getProblem"]>>>;
type AtCoderCatalog = Awaited<ReturnType<AtCoderCatalogService["getCatalog"]>>;

type MobileLevel = {
  level: number;
  label: string;
  title: string;
  description: string;
  count: number;
  progress: number;
  tone: Tone;
};

type MobileDomain = {
  id: string;
  name: string;
  description: string;
  count: number;
  progress: number;
  tone: Tone;
};

type MobileProblemType = {
  id: string;
  count: number;
  name: string;
  description: string;
  level: string;
  source: "GESP";
  progress: number;
};

type MobileProblem = {
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

type MobileAtCoderTrack = {
  count: number;
  difficulty: string;
  name: string;
  description: string;
  tags: string[];
};

@Injectable()
export class ConsumerMobileService {
  constructor(
    @Inject(CatalogService) private readonly catalogService: CatalogService,
    @Inject(AtCoderCatalogService) private readonly atCoderCatalogService: AtCoderCatalogService
  ) {}

  async getMobileContent() {
    const [levelsResponse, atCoderCatalog] = await Promise.all([
      this.catalogService.getLevels(),
      this.atCoderCatalogService.getCatalog()
    ]);
    const catalogs = (await Promise.all(
      levelsResponse.levels.map((level) => this.catalogService.getLevelCatalog(level.level))
    )).filter((catalog): catalog is LevelCatalog => Boolean(catalog));
    const featuredSummary = this.pickFeaturedGespProblem(catalogs);
    const featuredProblem = featuredSummary ? await this.catalogService.getProblem(featuredSummary.id) : null;
    const atCoderFeaturedSummary = this.flattenAtCoderProblems(atCoderCatalog)[0]?.problem || null;
    const atCoderFeatured = atCoderFeaturedSummary ? await this.atCoderCatalogService.getProblem(atCoderFeaturedSummary.id) : null;

    const levels = this.buildLevels(levelsResponse, catalogs);
    const domains = this.buildDomains(catalogs);
    const problemTypes = this.buildProblemTypes(catalogs);
    const progress = this.average(levels.map((level) => level.progress));
    const weakPoints = domains.filter((domain) => domain.tone !== "good").slice(0, 3).map((domain) => domain.name);

    return {
      generated_at: new Date().toISOString(),
      data_source: {
        gesp: levelsResponse.data_source,
        atcoder: atCoderCatalog.source
      },
      learning: {
        viewed_count: this.sum(levels.map((level) => level.count)),
        saved_code_count: problemTypes.filter((type) => type.progress >= 60).length,
        reviewed_count: problemTypes.filter((type) => type.progress >= 70).length,
        progress_pct: progress,
        weak_points: weakPoints,
        recommendation: this.buildRecommendation(problemTypes, atCoderCatalog)
      },
      gesp: {
        total_count: this.sum(levels.map((level) => level.count)),
        levels,
        domains,
        problem_types: problemTypes,
        featured_problem: featuredProblem ? this.buildGespFeaturedProblem(featuredProblem) : null
      },
      atcoder: {
        total_count: atCoderCatalog.summary.problem_count,
        tag_count: atCoderCatalog.summary.knowledge_point_count,
        statement_count: atCoderCatalog.summary.source_extracted_statement_count ?? 0,
        tracks: this.buildAtCoderTracks(atCoderCatalog),
        featured_problem: atCoderFeatured ? this.buildAtCoderFeaturedProblem(atCoderFeatured) : null
      }
    };
  }

  private buildLevels(levelsResponse: LevelResponse, catalogs: LevelCatalog[]): MobileLevel[] {
    const catalogByLevel = new Map(catalogs.map((catalog) => [catalog.level, catalog]));
    return levelsResponse.levels.map((level) => {
      const catalog = catalogByLevel.get(level.level);
      const progress = this.statusProgress(level.status_counts.confirmed + level.status_counts.candidate, level.problem_count);
      const topDomains = (catalog?.domains || []).slice(0, 2).map((domain) => domain.domain_label);
      return {
        level: level.level,
        label: `${level.level} 级`,
        title: topDomains.length ? topDomains.join(" / ") : "待分类题型",
        description: topDomains.length ? `${topDomains.join("、")} 等 ${level.domain_count} 个算法范畴` : "后端暂未归类算法范畴",
        count: level.problem_count,
        progress,
        tone: this.toneFromProgress(progress)
      };
    });
  }

  private buildDomains(catalogs: LevelCatalog[]): MobileDomain[] {
    const domainMap = new Map<string, { id: string; name: string; count: number; ready: number; knowledge: Set<string> }>();
    for (const catalog of catalogs) {
      for (const domain of catalog.domains) {
        const bucket = domainMap.get(domain.domain_id) || {
          id: domain.domain_id,
          name: domain.domain_label,
          count: 0,
          ready: 0,
          knowledge: new Set<string>()
        };
        bucket.count += domain.problem_count;
        bucket.ready += domain.status_counts.confirmed + domain.status_counts.candidate;
        for (const problemType of domain.problem_types) {
          for (const point of problemType.knowledge_points) {
            bucket.knowledge.add(point.label);
          }
        }
        domainMap.set(domain.domain_id, bucket);
      }
    }
    return [...domainMap.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8)
      .map((domain) => {
        const progress = this.statusProgress(domain.ready, domain.count);
        return {
          id: domain.id,
          name: domain.name,
          description: [...domain.knowledge].slice(0, 3).join("、") || `${domain.count} 道题`,
          count: domain.count,
          progress,
          tone: this.toneFromProgress(progress)
        };
      });
  }

  private buildProblemTypes(catalogs: LevelCatalog[]): MobileProblemType[] {
    const types = catalogs.flatMap((catalog) => (
      catalog.domains.flatMap((domain) => (
        domain.problem_types.map((problemType) => ({
          id: `${catalog.level}:${domain.domain_id}:${problemType.problem_type_id}`,
          count: problemType.problem_count,
          name: problemType.problem_type_label,
          description: problemType.knowledge_points.slice(0, 3).map((point) => point.label).join("、") || domain.domain_label,
          level: `${catalog.level} 级`,
          source: "GESP" as const,
          progress: this.statusProgress(domain.status_counts.confirmed + domain.status_counts.candidate, domain.problem_count)
        }))
      ))
    ));
    return types
      .sort((a, b) => b.count - a.count || a.level.localeCompare(b.level))
      .slice(0, 12);
  }

  private buildAtCoderTracks(catalog: AtCoderCatalog): MobileAtCoderTrack[] {
    const flatProblems = this.flattenAtCoderProblems(catalog);
    const buckets = new Map<number, { count: number; tags: Map<string, number> }>();
    for (const item of flatProblems) {
      const bucket = buckets.get(item.problem.difficulty) || { count: 0, tags: new Map<string, number>() };
      bucket.count += 1;
      for (const point of item.problem.knowledge_points) {
        bucket.tags.set(point.label, (bucket.tags.get(point.label) || 0) + 1);
      }
      buckets.set(item.problem.difficulty, bucket);
    }
    return [2, 3, 4, 5].map((difficulty) => {
      const bucket = buckets.get(difficulty) || { count: 0, tags: new Map<string, number>() };
      const meta = this.atCoderDifficultyMeta(difficulty);
      return {
        count: bucket.count,
        difficulty: meta.shortLabel,
        name: meta.name,
        description: meta.description,
        tags: [...bucket.tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([tag]) => tag)
      };
    }).filter((track) => track.count > 0);
  }

  private pickFeaturedGespProblem(catalogs: LevelCatalog[]) {
    return catalogs
      .flatMap((catalog) => catalog.domains.flatMap((domain) => domain.problem_types.flatMap((type) => type.problems)))
      .find((problem) => problem.detail_completeness?.has_reference_answer || problem.answer_guidance?.understanding_example.steps.length)
      || catalogs[0]?.domains[0]?.problem_types[0]?.problems[0]
      || null;
  }

  private buildGespFeaturedProblem(problem: GespProblem): MobileProblem {
    const domain = problem.resolved_algorithm_domains[0]?.label || "未分类";
    const problemType = problem.resolved_problem_type_tags[0]?.label || "待抽取题型";
    const knowledgePoints = problem.resolved_knowledge_point_tags.map((tag) => tag.label);
    const statement = problem.detail?.statement.stem || problem.answer_guidance?.understanding_example.summary || "后端暂未收录完整题面，仅展示分类与来源信息。";
    const sourceLinks = this.dedupeSourceLinks([
      ...(problem.detail?.source_links || []),
      ...(problem.answer_guidance?.reference_links || [])
    ]).slice(0, 4);
    return {
      id: problem.id,
      title: problem.title,
      subtitle: `${problem.session} · C++ ${problem.level} 级 · ${this.questionTypeLabel(problem.question_type)}`,
      level: `${problem.level} 级`,
      question_type: this.questionTypeLabel(problem.question_type),
      domain,
      problem_type: problemType,
      knowledge_points: knowledgePoints,
      statement,
      answer_status: problem.answer_guidance?.reference_answer.status || problem.detail?.programming_solution.status || "needs_review",
      confidence: problem.answer_guidance?.reference_answer.confidence ?? null,
      code: problem.detail?.programming_solution.code || null,
      code_filename: `${problem.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.cpp`,
      algorithm: problem.detail?.programming_solution.algorithm || null,
      complexity: problem.detail?.programming_solution.complexity || null,
      steps: problem.answer_guidance?.understanding_example.steps || problem.detail?.programming_solution.notes || [],
      source_links: sourceLinks.map((link, index) => ({
        title: this.asString(link.title) || this.asString(link.role) || this.asString(link.source_kind) || `来源 ${index + 1}`,
        url: this.asString(link.url) || this.asString(link.source_url) || null,
        tag: this.asString(link.trust_level) || this.asString(link.reference_kind) || this.asString(link.source_kind) || "source",
        tone: index === 0 ? "good" : "normal"
      }))
    };
  }

  private buildAtCoderFeaturedProblem(problem: AtCoderProblem): MobileProblem {
    return {
      id: problem.id,
      title: problem.title_zh || problem.title,
      subtitle: `AtCoder · ${problem.difficulty_label} · ${problem.pid}`,
      level: problem.difficulty_label,
      question_type: "programming",
      domain: problem.algorithm_domains[0]?.label || "AtCoder",
      problem_type: problem.problem_type_tags[0]?.label || "算法题",
      knowledge_points: problem.knowledge_points.map((point) => point.label),
      statement: problem.statement.sections[0]?.markdown || "后端暂未收录题面段落。",
      answer_status: problem.programming_solution.status,
      confidence: problem.acceptance_rate,
      code: problem.programming_solution.code,
      code_filename: `${problem.pid}.cpp`,
      algorithm: problem.programming_solution.algorithm,
      complexity: problem.programming_solution.complexity,
      steps: problem.programming_solution.notes,
      source_links: [{
        title: "AtCoder / 洛谷公开题面",
        url: problem.statement.source_url || problem.source_url,
        tag: problem.statement.status,
        tone: "good"
      }]
    };
  }

  private flattenAtCoderProblems(catalog: AtCoderCatalog) {
    const problemById = new Map<string, { problem: AtCoderProblemSummary }>();
    for (const domain of catalog.domains) {
      for (const problemType of domain.problem_types) {
        for (const problem of problemType.problems) {
          if (!problemById.has(problem.id)) {
            problemById.set(problem.id, { problem });
          }
        }
      }
    }
    return [...problemById.values()];
  }

  private buildRecommendation(problemTypes: MobileProblemType[], atCoderCatalog: AtCoderCatalog) {
    const weakType = [...problemTypes].sort((a, b) => a.progress - b.progress)[0];
    const atCoderCount = atCoderCatalog.summary.problem_count;
    if (!weakType) {
      return `GESP 目录已接入后端，可从 AtCoder ${atCoderCount} 道题中补充算法训练。`;
    }
    return `优先补 ${weakType.level}「${weakType.name}」，再从 AtCoder ${atCoderCount} 道题中筛选同类算法训练。`;
  }

  private atCoderDifficultyMeta(difficulty: number) {
    const map: Record<number, { shortLabel: string; name: string; description: string }> = {
      2: { shortLabel: "A-B", name: "入门实现", description: "条件、循环、数学小结论，适合一级到三级补速度。" },
      3: { shortLabel: "C", name: "基础算法", description: "枚举、贪心、二分、前缀和，适合四级到五级巩固。" },
      4: { shortLabel: "D", name: "DP / 图论", description: "状态转移、最短路、树和并查集，衔接六级以上。" },
      5: { shortLabel: "E+", name: "挑战训练", description: "组合优化和复杂数据结构，作为拔高题库入口。" }
    };
    return map[difficulty] || { shortLabel: String(difficulty), name: "其他难度", description: "按后端题库难度聚合。" };
  }

  private questionTypeLabel(type: string) {
    const map: Record<string, string> = {
      judgment: "判断题",
      programming: "编程题",
      selection: "选择题"
    };
    return map[type] || type;
  }

  private statusProgress(confirmed: number, total: number) {
    if (!total) {
      return 0;
    }
    return Math.round((confirmed / total) * 100);
  }

  private toneFromProgress(progress: number): Tone {
    if (progress >= 75) {
      return "good";
    }
    if (progress >= 45) {
      return "normal";
    }
    return "weak";
  }

  private average(values: number[]) {
    if (!values.length) {
      return 0;
    }
    return Math.round(this.sum(values) / values.length);
  }

  private sum(values: number[]) {
    return values.reduce((total, value) => total + value, 0);
  }

  private asString(value: unknown) {
    return typeof value === "string" ? value : "";
  }

  private dedupeSourceLinks<T extends Record<string, unknown>>(links: T[]) {
    const seen = new Set<string>();
    return links.filter((link) => {
      const key = [
        this.asString(link.title) || this.asString(link.role) || this.asString(link.source_kind),
        this.asString(link.url) || this.asString(link.source_url)
      ].join("::");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
