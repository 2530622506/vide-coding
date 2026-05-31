import {
  AlertTriangle,
  Binary,
  BookOpenCheck,
  CheckCircle2,
  Code2,
  Database,
  ExternalLink,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Layers3,
  ListChecks,
  RefreshCw,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DomainGroup, EffectiveStatus, LevelCatalog, LevelSummary, ProblemDetailResponse, ProblemSummary, ReviewQueueSummary } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const statusLabel: Record<EffectiveStatus, string> = {
  confirmed: "已确认",
  candidate: "候选",
  needs_review: "待复核",
  conflict: "冲突"
};

const typeLabel: Record<string, string> = {
  selection: "选择",
  judgment: "判断",
  programming: "编程"
};

const answerStatusLabel: Record<string, string> = {
  confirmed: "官方答案",
  reference_link: "参考入口",
  needs_review: "答案待复核"
};

function formatConfidence(value?: number) {
  if (typeof value !== "number") {
    return "";
  }
  return `${Math.round(value * 100)}%`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export default function App() {
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(5);
  const [catalog, setCatalog] = useState<LevelCatalog | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewQueueSummary | null>(null);
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchJson<{ levels: LevelSummary[] }>("/catalog/levels"),
      fetchJson<ReviewQueueSummary>("/catalog/review-queue/summary")
    ])
      .then(([levelResponse, reviewResponse]) => {
        setLevels(levelResponse.levels);
        setReviewSummary(reviewResponse);
      })
      .catch((currentError: unknown) => {
        setError(currentError instanceof Error ? currentError.message : "API 请求失败");
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchJson<LevelCatalog>(`/catalog/levels/${selectedLevel}`)
      .then((nextCatalog) => {
        setCatalog(nextCatalog);
        setActiveDomainId(nextCatalog.domains[0]?.domain_id || null);
        setSelectedProblemId(null);
        setSelectedProblem(null);
      })
      .catch((currentError: unknown) => {
        setCatalog(null);
        setError(currentError instanceof Error ? currentError.message : "目录加载失败");
      })
      .finally(() => setLoading(false));
  }, [selectedLevel]);

  const activeDomain = useMemo(() => {
    if (!catalog) {
      return null;
    }
    return catalog.domains.find((domain) => domain.domain_id === activeDomainId) || catalog.domains[0] || null;
  }, [activeDomainId, catalog]);

  function openProblem(problemId: string) {
    setSelectedProblemId(problemId);
    setDetailLoading(true);
    fetchJson<ProblemDetailResponse>(`/catalog/problems/${encodeURIComponent(problemId)}`)
      .then((problem) => {
        setSelectedProblem(problem);
      })
      .catch((currentError: unknown) => {
        setError(currentError instanceof Error ? currentError.message : "题目详情加载失败");
      })
      .finally(() => setDetailLoading(false));
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow"><Database size={16} /> C++ 官方真题分类数据</div>
          <h1>GESP C++ 题型分类目录</h1>
        </div>
        <button className="iconButton" type="button" title="刷新目录" onClick={() => window.location.reload()}>
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="levelRail" aria-label="等级">
        {levels.map((level) => (
          <button
            className={level.level === selectedLevel ? "levelButton active" : "levelButton"}
            key={level.level}
            type="button"
            onClick={() => setSelectedLevel(level.level)}
          >
            <span>{level.level} 级</span>
            <strong>{level.problem_count}</strong>
          </button>
        ))}
      </section>

      {error ? <div className="notice"><AlertTriangle size={18} /> {error}</div> : null}

      <section className="metricGrid">
        <Metric icon={<Layers3 size={18} />} label="题目" value={catalog?.summary.problem_count ?? 0} />
        <Metric icon={<GitBranch size={18} />} label="算法范畴" value={catalog?.domains.length ?? 0} />
        <Metric icon={<Binary size={18} />} label="题型" value={catalog?.summary.problem_type_count ?? 0} />
        <Metric icon={<ListChecks size={18} />} label="知识点" value={catalog?.summary.knowledge_point_count ?? 0} />
        <Metric icon={<AlertTriangle size={18} />} label="复核项" value={reviewSummary?.summary.total_count ?? 0} tone="warn" />
      </section>

      <section className="workspace">
        <aside className="domainNav">
          <div className="paneTitle">算法范畴</div>
          {catalog?.domains.map((domain) => (
            <button
              key={domain.domain_id}
              type="button"
              className={domain.domain_id === activeDomain?.domain_id ? "domainButton active" : "domainButton"}
              onClick={() => setActiveDomainId(domain.domain_id)}
            >
              <span>{domain.domain_label}</span>
              <strong>{domain.problem_count}</strong>
            </button>
          ))}
        </aside>

        <section className="catalogPane">
          {loading ? <div className="empty">加载中</div> : null}
          {!loading && activeDomain ? <DomainPanel domain={activeDomain} selectedProblemId={selectedProblemId} onProblemSelect={openProblem} /> : null}
        </section>

        <aside className="sidePane">
          <section className="detailPane">
            <div className="paneTitle">题目详情</div>
            <ProblemDetailPanel
              loading={detailLoading}
              problem={selectedProblem}
              onClose={() => {
                setSelectedProblemId(null);
                setSelectedProblem(null);
              }}
            />
          </section>

          <section className="reviewPane">
            <div className="paneTitle">复核队列</div>
            <div className="reviewStats">
              <span>High {reviewSummary?.summary.by_priority.high ?? 0}</span>
              <span>Medium {reviewSummary?.summary.by_priority.medium ?? 0}</span>
              <span>Low {reviewSummary?.summary.by_priority.low ?? 0}</span>
            </div>
            <div className="queueList">
              {reviewSummary?.high_priority.map((item) => (
                <div className="queueItem" key={item.id}>
                  <AlertTriangle size={16} />
                  <div>
                    <strong>{item.type}</strong>
                    <span>{item.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "warn" }) {
  return (
    <div className={tone === "warn" ? "metric warn" : "metric"}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DomainPanel({ domain, selectedProblemId, onProblemSelect }: {
  domain: DomainGroup;
  selectedProblemId: string | null;
  onProblemSelect: (problemId: string) => void;
}) {
  return (
    <div>
      <div className="domainHeader">
        <div>
          <div className="eyebrow"><GitBranch size={16} /> {domain.domain_id}</div>
          <h2>{domain.domain_label}</h2>
        </div>
        <StatusStrip counts={domain.status_counts} />
      </div>

      <div className="typeStack">
        {domain.problem_types.map((type) => (
          <section className="typeSection" key={type.problem_type_id}>
            <div className="typeHeader">
              <div>
                <div className="eyebrow"><BookOpenCheck size={16} /> {type.problem_type_id}</div>
                <h3>{type.problem_type_label}</h3>
              </div>
              <strong>{type.problem_count}</strong>
            </div>
            <div className="knowledgeRow">
              {type.knowledge_points.length > 0
                ? type.knowledge_points.map((point) => <span className="chip" key={point.id}>{point.label}</span>)
                : <span className="muted">待补知识点</span>}
            </div>
            <div className="problemList">
              {type.problems.map((problem) => (
                <ProblemRow
                  isSelected={selectedProblemId === problem.id}
                  key={`${type.problem_type_id}:${problem.id}`}
                  onSelect={onProblemSelect}
                  problem={problem}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ProblemRow({ problem, isSelected, onSelect }: {
  problem: ProblemSummary;
  isSelected: boolean;
  onSelect: (problemId: string) => void;
}) {
  const primaryType = problem.problem_type_tags[0];
  const needsSource = problem.detail_completeness?.needs_source_enrichment;
  return (
    <button className={isSelected ? "problemRow active" : "problemRow"} type="button" onClick={() => onSelect(problem.id)}>
      <div className="problemIndex">
        <span>{typeLabel[problem.question_type] || problem.question_type}</span>
        <strong>{problem.question_number}</strong>
      </div>
      <div className="problemMain">
        <div className="problemTitle">{problem.title}</div>
        <div className="problemMeta">
          <StatusBadge status={problem.status} />
          {problem.answer_guidance ? <AnswerBadge guidance={problem.answer_guidance} /> : null}
          {primaryType ? <span>{formatConfidence(primaryType.final_confidence)}</span> : null}
          {needsSource ? <span>题面待补</span> : null}
          {problem.review_queue_count > 0 ? <span>{problem.review_queue_count} 复核</span> : null}
        </div>
        {problem.answer_guidance ? <UnderstandingBlock problem={problem} /> : null}
      </div>
      <div className="problemTags">
        {problem.knowledge_point_tags.slice(0, 3).map((tag) => <span className="tag" key={tag.value}>{tag.label}</span>)}
      </div>
    </button>
  );
}

function ProblemDetailPanel({ loading, problem, onClose }: {
  loading: boolean;
  problem: ProblemDetailResponse | null;
  onClose: () => void;
}) {
  if (loading) {
    return <div className="detailEmpty">加载中</div>;
  }

  if (!problem) {
    return (
      <div className="detailEmpty">
        <FileText size={22} />
        <span>未选择题目</span>
      </div>
    );
  }

  const guidance = problem.answer_guidance;
  const detail = problem.detail;
  const answer = guidance?.reference_answer;
  const example = guidance?.understanding_example;
  const sourceLinks = uniqueSourceLinks(detail?.source_links || guidance?.reference_links || []);

  return (
    <article className="detailCard">
      <div className="detailHeader">
        <div>
          <div className="eyebrow"><FileText size={15} /> {problem.session} / {problem.level} 级 / {typeLabel[problem.question_type]}</div>
          <h2>{problem.title}</h2>
        </div>
        <button className="iconButton small" type="button" title="关闭" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <DetailSection icon={<CheckCircle2 size={16} />} title="参考答案">
        {answer ? <AnswerLine guidance={guidance} /> : <span className="muted">答案待补</span>}
        {guidance?.content_origin === "ai_generated_learning_aid" || detail?.ai_generation_notice ? (
          <div className="aiNotice">{guidance?.ai_generation_notice || detail?.ai_generation_notice}</div>
        ) : null}
      </DetailSection>

      <DetailSection icon={<FileText size={16} />} title="题面">
        {detail ? <StatementBlock detail={detail} /> : <span className="muted">题面待补</span>}
      </DetailSection>

      <DetailSection icon={<ListChecks size={16} />} title="样例">
        {detail ? <SampleCasesBlock detail={detail} /> : <span className="muted">样例待补</span>}
      </DetailSection>

      <DetailSection icon={<BookOpenCheck size={16} />} title="知识点讲解">
        {example ? (
          <div className="explainBlock">
            <p>{example.summary}</p>
            <div className="knowledgeRow tight">
              {example.knowledge_points.map((point) => <span className="chip" key={point}>{point}</span>)}
            </div>
            <ol>
              {example.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="commentLine">
              {example.chinese_comments.map((comment) => <span key={comment}>{comment}</span>)}
            </div>
          </div>
        ) : <span className="muted">讲解待补</span>}
      </DetailSection>

      <DetailSection icon={<ListChecks size={16} />} title="选项">
        {detail?.choice_options.options.length ? (
          <>
            {detail.choice_options.status !== "source_extracted" ? (
              <DataGap status={detail.choice_options.status} notes={detail.choice_options.notes} />
            ) : null}
            <div className="optionList">
              {detail.choice_options.options.map((option) => (
                <div className="optionItem" key={option.key}>
                  <strong>{option.key}</strong>
                  <span>{option.text}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <DataGap status={detail?.choice_options.status || "pending_collection"} notes={detail?.choice_options.notes || []} />
        )}
      </DetailSection>

      <DetailSection icon={<ImageIcon size={16} />} title="图片">
        {detail?.visual_assets.assets.length ? (
          <div className="assetList">
            {detail.visual_assets.assets.map((asset) => (
              <figure className="assetItem" key={asset.id}>
                <img alt={asset.alt_text} src={asset.asset_url} />
                <figcaption>{asset.alt_text}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <DataGap status={detail?.visual_assets.status || "pending_collection"} notes={detail?.visual_assets.notes || []} />
        )}
      </DetailSection>

      {problem.question_type === "programming" ? (
        <DetailSection icon={<Code2 size={16} />} title="C++ 参考解">
          {detail?.programming_solution.code ? (
            <div className="solutionBlock">
              {detail.programming_solution.ai_generation_notice ? (
                <div className="aiNotice">{detail.programming_solution.ai_generation_notice}</div>
              ) : null}
              {detail.programming_solution.algorithm || detail.programming_solution.complexity ? (
                <div className="solutionMeta">
                  {detail.programming_solution.algorithm ? <span>{detail.programming_solution.algorithm}</span> : null}
                  {detail.programming_solution.complexity ? <span>{detail.programming_solution.complexity}</span> : null}
                </div>
              ) : null}
              {detail.programming_solution.verification ? (
                <div className="verificationLine">
                  样例验证：{detail.programming_solution.verification.status} / {detail.programming_solution.verification.sample_count} 组
                </div>
              ) : null}
              <pre className="codeBlock"><code>{detail.programming_solution.code}</code></pre>
            </div>
          ) : (
            <DataGap status={detail?.programming_solution.status || "needs_review"} notes={detail?.programming_solution.notes || []} />
          )}
        </DetailSection>
      ) : null}

      <DetailSection icon={<ExternalLink size={16} />} title="来源">
        <div className="sourceList">
          {sourceLinks.slice(0, 5).map((source) => (
            source.url || source.source_url ? (
              <a href={source.url || source.source_url || ""} key={source.url || source.source_url || source.title || "source"} rel="noreferrer" target="_blank">
                <ExternalLink size={14} />
                <span>{source.title || source.role || source.source_kind || "source"}</span>
              </a>
            ) : null
          ))}
          {detail?.statement.source_page ? <span className="muted">官方 PDF 第 {detail.statement.source_page} 页</span> : null}
        </div>
      </DetailSection>
    </article>
  );
}

function uniqueSourceLinks<T extends { url?: string | null; source_url?: string | null }>(sources: T[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const url = source.url || source.source_url;
    if (!url || seen.has(url)) {
      return false;
    }
    seen.add(url);
    return true;
  });
}

function DetailSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="detailSection">
      <h3>{icon}{title}</h3>
      {children}
    </section>
  );
}

function AnswerLine({ guidance }: { guidance: NonNullable<ProblemDetailResponse["answer_guidance"]> }) {
  const answer = guidance.reference_answer;
  return (
    <div className="answerLine">
      <AnswerBadge guidance={guidance} />
      {answer.evidence ? <span>{answer.evidence}</span> : null}
    </div>
  );
}

function StatementBlock({ detail }: { detail: NonNullable<ProblemDetailResponse["detail"]> }) {
  const sections = detail.statement.sections?.filter((section) => section.markdown.trim()) || [];
  if (sections.length === 0) {
    return <DataGap status={detail.statement.status} notes={detail.statement.notes || []} />;
  }
  return (
    <div className="statementBlock">
      {detail.statement.source_terms_status ? <span className="sourceTerms">来源条款：{detail.statement.source_terms_status}</span> : null}
      {sections.map((section) => (
        <section key={section.id}>
          <h4>{section.title}</h4>
          <MarkdownText value={section.markdown} />
        </section>
      ))}
    </div>
  );
}

function MarkdownText({ value }: { value: string }) {
  const blocks = value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, (_match, altText: string) => {
      const alt = altText.trim();
      return alt ? `（图片：${alt}，见下方图片）` : "";
    })
    .replace(/^:::[^\n]*(?:\n|$)/gm, "")
    .replace(/^:::$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  return (
    <>
      {blocks.map((block) => <p key={block}>{block}</p>)}
    </>
  );
}

function SampleCasesBlock({ detail }: { detail: NonNullable<ProblemDetailResponse["detail"]> }) {
  if (detail.sample_cases.cases.length === 0) {
    return <DataGap status={detail.sample_cases.status} notes={detail.sample_cases.notes || []} />;
  }
  return (
    <div className="sampleList">
      {detail.sample_cases.cases.map((sample, index) => (
        <div className="samplePair" key={`${sample.input}:${sample.output}:${index}`}>
          <div>
            <span>输入 {index + 1}</span>
            <pre>{sample.input || "(空)"}</pre>
          </div>
          <div>
            <span>输出 {index + 1}</span>
            <pre>{sample.output || "(空)"}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataGap({ status, notes }: { status: string; notes: string[] }) {
  const statusText: Record<string, string> = {
    pending_collection: "待采集",
    reference_link: "参考入口",
    needs_review: "待复核",
    not_applicable: "不适用",
    source_extracted: "已抽取",
    none_found: "未发现",
    ready: "已准备"
  };
  return (
    <div className="dataGap">
      <span>{statusText[status] || status}</span>
      {notes.slice(0, 2).map((note) => <p key={note}>{note}</p>)}
    </div>
  );
}

function AnswerBadge({ guidance }: { guidance: NonNullable<ProblemSummary["answer_guidance"]> }) {
  const answer = guidance.reference_answer;
  const label = answerStatusLabel[answer.status] || "参考答案";
  const value = answer.answer ? `：${answer.answer}` : "";
  const suffix = guidance.content_origin === "ai_generated_learning_aid" ? " / AI 辅助" : "";
  return <span className={`answerBadge ${answer.status}`}>{label}{value}{suffix}</span>;
}

function UnderstandingBlock({ problem }: { problem: ProblemSummary }) {
  const guidance = problem.answer_guidance;
  if (!guidance) {
    return null;
  }
  const example = guidance.understanding_example;
  return (
    <div className="understanding">
      <p>{example.summary}</p>
      <ol>
        {example.steps.slice(0, 3).map((step) => <li key={step}>{step}</li>)}
      </ol>
      <div className="commentLine">
        {example.chinese_comments.slice(0, 2).map((comment) => <span key={comment}>{comment}</span>)}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EffectiveStatus }) {
  return <span className={`status ${status}`}>{statusLabel[status]}</span>;
}

function StatusStrip({ counts }: { counts: Record<EffectiveStatus, number> }) {
  return (
    <div className="statusStrip">
      <span className="candidate">{counts.candidate}</span>
      <span className="needs_review">{counts.needs_review}</span>
      <span className="conflict">{counts.conflict}</span>
    </div>
  );
}
