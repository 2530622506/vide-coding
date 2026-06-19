import type { CSSProperties } from "react";
import { ArrowRight, BarChart3, BookOpen, Code2, Database, FileSearch, Link2, RefreshCw, Search, Star, Trophy } from "lucide-react";
import { ConsumerCodeBlock } from "./ConsumerCodeBlock";
import type {
  AtCoderTrack,
  ConsumerMobileContent,
  ConsumerProblem,
  ConsumerView,
  Domain,
  LevelSummary,
  MobileAtCoderCatalog,
  MobileGespCatalog,
  MobileProblemListItem,
  MobileProgress
} from "./ConsumerMobileData";

type ConsumerRenderState = {
  atCoderCatalog: MobileAtCoderCatalog | null;
  catalogError: string | null;
  catalogLoading: boolean;
  content: ConsumerMobileContent | null;
  error: string | null;
  gespCatalog: MobileGespCatalog | null;
  loadAtCoderCatalog: (params?: { difficulty?: string; query?: string }) => Promise<void>;
  loadGespCatalog: (params?: { domainId?: string | null; level?: number; problemTypeId?: string | null; query?: string }) => Promise<void>;
  loading: boolean;
  progress: MobileProgress | null;
  recordProgress: (event: { problemId: string; source?: "gesp" | "atcoder"; title?: string; type: "view" | "favorite" | "review" }) => Promise<MobileProgress>;
  reload: () => void;
  selectedProblem: ConsumerProblem | null;
  selectAtCoderProblem: (problemId: string) => Promise<ConsumerProblem | null>;
  selectGespProblem: (problemId: string) => Promise<ConsumerProblem | null>;
};

export function renderConsumerView(
  view: ConsumerView,
  setView: (view: ConsumerView) => void,
  renderState: ConsumerRenderState,
  progressStyle: CSSProperties,
  profileProgressStyle: CSSProperties
) {
  const { content, error, loading, reload } = renderState;
  if (loading) {
    return <StateCard label="正在从后端加载 C 端内容" />;
  }
  if (error) {
    return <StateCard actionLabel="重试" label={`后端内容加载失败：${error}`} onAction={reload} />;
  }
  if (!content) {
    return <StateCard actionLabel="重新加载" label="后端没有返回 C 端内容" onAction={reload} />;
  }

  switch (view) {
    case "catalog":
      return <CatalogView renderState={renderState} setView={setView} />;
    case "atcoder":
      return <AtCoderView content={content} renderState={renderState} setView={setView} />;
    case "problem":
      return <ProblemView problem={renderState.selectedProblem || content.gesp.featured_problem} recordProgress={renderState.recordProgress} setView={setView} />;
    case "code":
      return <CodeView problem={renderState.selectedProblem || content.gesp.featured_problem} recordProgress={renderState.recordProgress} />;
    case "evidence":
      return <EvidenceView problem={renderState.selectedProblem || content.gesp.featured_problem} />;
    case "progress":
      return <ProgressView content={content} progress={renderState.progress} />;
    case "profile":
      return <ProfileView content={content} progress={renderState.progress} progressStyle={profileProgressStyle} />;
    default:
      return <HomeView content={content} progressStyle={progressStyle} setView={setView} />;
  }
}

function HomeView({ content, progressStyle, setView }: { content: ConsumerMobileContent; progressStyle: CSSProperties; setView: (view: ConsumerView) => void }) {
  const featured = content.gesp.featured_problem;
  return (
    <>
      <section className="consumerCard consumerCardTint consumerProgressCard">
        <div>
          <h2>本周学习进度</h2>
          <p>已接入后端题库：GESP {content.gesp.total_count} 题，AtCoder {content.atcoder.total_count} 题；移动端以查看、收藏和复习为主。</p>
          <div className="consumerTagRow">
            <span className="consumerTag good">后端数据</span>
            <span className="consumerTag info">弱项 {content.learning.weak_points.length || 0} 个</span>
          </div>
        </div>
        <div className="consumerRing" style={progressStyle}><span>{content.learning.progress_pct}%</span></div>
      </section>
      <section className="consumerLibraryGrid" aria-label="题库入口">
        <button className="consumerLibraryCard active" onClick={() => setView("catalog")} type="button">
          <BookOpen size={20} />
          <span>GESP 全等级</span>
          <strong>{content.gesp.total_count} 题</strong>
          <small>{content.gesp.levels.length} 个等级 · 后端目录</small>
        </button>
        <button className="consumerLibraryCard" onClick={() => setView("atcoder")} type="button">
          <Trophy size={20} />
          <span>AtCoder 题库</span>
          <strong>{content.atcoder.total_count} 题</strong>
          <small>{content.atcoder.tracks.map((track) => track.difficulty).join(" / ") || "难度轨道"}</small>
        </button>
      </section>
      <section className="consumerCard">
        <h2>推荐路径</h2>
        <p>{content.learning.recommendation}</p>
        <button className="consumerPrimaryButton" onClick={() => setView("catalog")} type="button">
          <BookOpen size={17} />继续查看
        </button>
      </section>
      <LevelOverview content={content} />
      <DomainList domains={content.gesp.domains} title="知识点覆盖" />
      <section className="consumerCard">
        <h2>最近查看</h2>
        {featured ? (
          <>
            <p><strong>{featured.title}</strong><br />{featured.subtitle}</p>
            <div className="consumerPillRow">
              <button className="active" onClick={() => setView("problem")} type="button">题目详情</button>
              <button onClick={() => setView("code")} type="button">参考代码</button>
            </div>
          </>
        ) : (
          <p>后端暂未返回推荐题目。</p>
        )}
      </section>
    </>
  );
}

function CatalogView({ renderState, setView }: { renderState: ConsumerRenderState; setView: (view: ConsumerView) => void }) {
  const { catalogError, catalogLoading, content, gespCatalog, loadGespCatalog, selectGespProblem } = renderState;
  const catalog = gespCatalog;
  if (!content || !catalog) {
    return <StateCard label={catalogLoading ? "正在加载 GESP 移动目录" : "GESP 移动目录暂无数据"} />;
  }

  const openProblem = async (problemId: string) => {
    await selectGespProblem(problemId);
    setView("problem");
  };

  return (
    <>
      <div className="consumerSearch"><Search size={17} /><span>搜索题名、知识点、来源</span></div>
      <div className="consumerSegment"><span className="active">GESP</span><span>全等级</span><span>题型</span></div>
      {catalogError ? <StateCard actionLabel="重试目录" label={`目录加载失败：${catalogError}`} onAction={() => void loadGespCatalog({ level: catalog.selected_level })} /> : null}
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>等级目录</h2>
          <span>{catalog.levels.length} 级</span>
        </div>
        <div className="consumerLevelGrid">
          {catalog.levels.map((level) => (
            <LevelChip
              active={catalog.selected_level === level.level}
              key={level.level}
              level={level}
              onClick={() => void loadGespCatalog({ level: level.level })}
            />
          ))}
        </div>
      </section>
      <section className="consumerCard consumerCardTint consumerSplitCard">
        <div>
          <h2>AtCoder 算法题库</h2>
          <p>不混入 GESP 官方等级，用难度和算法标签单独筛选。</p>
        </div>
        <button aria-label="查看 AtCoder 题库" onClick={() => setView("atcoder")} type="button">
          <ArrowRight size={20} />
        </button>
      </section>
      <DomainList
        activeDomainId={catalog.selected_domain_id}
        domains={catalog.domains}
        onSelect={(domain) => void loadGespCatalog({ domainId: domain.id, level: catalog.selected_level })}
        title="算法范畴"
      />
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>题型分布</h2>
          <span>{catalog.problem_types.length} 类</span>
        </div>
        {catalog.problem_types.map((type) => (
          <button
            className={`consumerProblemRow ${catalog.selected_problem_type_id === type.id ? "active" : ""}`}
            key={type.id}
            onClick={() => void loadGespCatalog({ domainId: catalog.selected_domain_id, level: catalog.selected_level, problemTypeId: type.id })}
            type="button"
          >
            <span className="consumerBadge">{type.count}</span>
            <span>
              <strong>{type.name}</strong>
              <small>{type.level} · {type.source} · {type.description}</small>
            </span>
            <em>{type.progress}%</em>
          </button>
        ))}
      </section>
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>题目列表</h2>
          <span>{catalog.problems.length} 题</span>
        </div>
        {catalogLoading ? <p>正在切换目录...</p> : null}
        {catalog.problems.map((problem) => (
          <ProblemListRow key={problemListKey(problem)} onOpen={openProblem} problem={problem} />
        ))}
      </section>
    </>
  );
}

function AtCoderView({ content, renderState, setView }: { content: ConsumerMobileContent; renderState: ConsumerRenderState; setView: (view: ConsumerView) => void }) {
  const { atCoderCatalog, catalogError, catalogLoading, loadAtCoderCatalog, selectAtCoderProblem } = renderState;
  const catalog = atCoderCatalog;
  const openProblem = async (problemId: string) => {
    await selectAtCoderProblem(problemId);
    setView("problem");
  };
  return (
    <>
      <div className="consumerSearch"><Search size={17} /><span>搜索 AtCoder 题号、算法标签、难度</span></div>
      <section className="consumerCard consumerAtCoderHero">
        <Database size={22} />
        <h2>独立题库，不套 GESP 等级</h2>
        <p>AtCoder 题目按难度、算法范畴、样例完整度和参考解状态展示，数据来自后端 AtCoder catalog。</p>
        <div className="consumerMetricGrid">
          <div><strong>{content.atcoder.total_count}</strong><span>题目</span></div>
          <div><strong>{content.atcoder.tag_count}</strong><span>标签</span></div>
          <div><strong>{content.atcoder.statement_count}</strong><span>中文题面</span></div>
        </div>
      </section>
      {catalogError ? <StateCard actionLabel="重试 AtCoder" label={`AtCoder 目录加载失败：${catalogError}`} onAction={() => void loadAtCoderCatalog()} /> : null}
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>难度轨道</h2>
          <span>AtCoder</span>
        </div>
        {(catalog?.tracks || content.atcoder.tracks).map((track) => (
          <AtCoderTrackRow
            active={catalog?.selected_difficulty === track.difficulty}
            key={track.difficulty}
            onSelect={() => void loadAtCoderCatalog({ difficulty: track.difficulty })}
            track={track}
          />
        ))}
      </section>
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>AtCoder 题目</h2>
          <span>{catalog?.problems.length ?? 0} 题</span>
        </div>
        {catalogLoading ? <p>正在切换难度...</p> : null}
        {(catalog?.problems || []).map((problem) => (
          <ProblemListRow key={problemListKey(problem)} onOpen={openProblem} problem={problem} />
        ))}
      </section>
      {content.atcoder.featured_problem ? (
        <section className="consumerCard">
          <h2>推荐题目</h2>
          <p><strong>{content.atcoder.featured_problem.title}</strong><br />{content.atcoder.featured_problem.subtitle}</p>
          <div className="consumerTagRow">
            {content.atcoder.featured_problem.knowledge_points.slice(0, 3).map((point) => <span className="consumerTag info" key={point}>{point}</span>)}
          </div>
        </section>
      ) : null}
    </>
  );
}

function ProblemView({ problem, recordProgress, setView }: {
  problem: ConsumerProblem | null;
  recordProgress: ConsumerRenderState["recordProgress"];
  setView: (view: ConsumerView) => void;
}) {
  if (!problem) {
    return <StateCard label="后端暂未返回推荐题目详情" />;
  }
  return (
    <>
      <section className="consumerCard">
        <div className="consumerPillRow">
          <button className="active" type="button">题目</button>
          <button type="button">知识点</button>
          <button onClick={() => setView("evidence")} type="button">来源</button>
        </div>
      </section>
      <section className="consumerReadBlock">
        <h2>{problem.title}</h2>
        <p>{problem.statement}</p>
      </section>
      <section className="consumerCard">
        <h2>标签与可信度</h2>
        <div className="consumerTagRow">
          <span className="consumerTag good">官方等级：{problem.level}</span>
          <span className="consumerTag good">{problem.domain}</span>
          {problem.confidence == null ? null : <span className="consumerTag info">可信度 {Math.round(problem.confidence * 100)}%</span>}
        </div>
      </section>
      <section className="consumerCard">
        <h2>解题要点</h2>
        {problem.steps.length ? (
          <ol className="consumerSteps">
            {problem.steps.slice(0, 5).map((step) => <li key={step}>{step}</li>)}
          </ol>
        ) : (
          <p>{problem.algorithm || "后端暂未返回详细解题步骤。"}</p>
        )}
      </section>
      <section className="consumerCard consumerCardTint">
        <h2>学习动作</h2>
        <button className="consumerPrimaryButton" onClick={() => setView("code")} type="button"><Code2 size={17} />查看参考代码</button>
        <button className="consumerSecondaryButton" onClick={() => void recordProgress({ problemId: problem.id, source: problem.source, title: problem.title, type: "favorite" })} type="button"><Star size={17} />加入收藏夹</button>
        <button className="consumerSecondaryButton" onClick={() => void recordProgress({ problemId: problem.id, source: problem.source, title: problem.title, type: "review" })} type="button"><BarChart3 size={17} />标记已复习</button>
      </section>
    </>
  );
}

function CodeView({ problem, recordProgress }: { problem: ConsumerProblem | null; recordProgress: ConsumerRenderState["recordProgress"] }) {
  if (!problem) {
    return <StateCard label="后端暂未返回推荐题目代码" />;
  }
  return (
    <>
      <section className="consumerCard">
        <div className="consumerPillRow">
          <button className="active" type="button">C++</button>
          <button type="button">思路</button>
          <button type="button">复杂度</button>
        </div>
      </section>
      {problem.code ? (
        <ConsumerCodeBlock code={problem.code} filename={problem.code_filename} />
      ) : (
        <section className="consumerCard">
          <h2>暂无本地代码</h2>
          <p>后端已返回题目信息，但这道题暂时没有可直接展示的参考代码。</p>
        </section>
      )}
      <section className="consumerCard">
        <h2>行级讲解</h2>
        <p>{problem.algorithm || "后端暂未返回算法讲解。"}{problem.complexity ? ` 复杂度：${problem.complexity}` : ""}</p>
      </section>
      <section className="consumerCard consumerCardTint">
        <h2>可用操作</h2>
        <div className="consumerActionGrid">
          <button type="button"><Code2 size={16} />只读查看</button>
          <button onClick={() => void recordProgress({ problemId: problem.id, source: problem.source, title: problem.title, type: "favorite" })} type="button"><Star size={16} />收藏</button>
          <button onClick={() => void recordProgress({ problemId: problem.id, source: problem.source, title: problem.title, type: "review" })} type="button"><FileSearch size={16} />已复核</button>
        </div>
      </section>
    </>
  );
}

function EvidenceView({ problem }: { problem: ConsumerProblem | null }) {
  if (!problem) {
    return <StateCard label="后端暂未返回来源证据" />;
  }
  return (
    <>
      <section className="consumerSourceList">
        {problem.source_links.length ? problem.source_links.map((source, index) => (
          <SourceItem
            description={source.url || "后端未返回来源 URL"}
            index={String(index + 1)}
            key={`${source.title}:${index}`}
            label={source.title}
            tag={source.tag}
            tone={source.tone}
          />
        )) : <SourceItem description="后端暂无来源链接" index="1" label="来源待补充" tag="pending" tone="weak" />}
      </section>
      <section className="consumerCard">
        <h2>版权策略</h2>
        <p>未确认授权前，C 端只展示题目概要、短证据片段、来源链接和 hash，不默认转载完整题面。</p>
      </section>
      <section className="consumerCard">
        <h2>分类依据</h2>
        <div className="consumerTagRow">
          <span className="consumerTag good">{problem.level}</span>
          <span className="consumerTag good">{problem.problem_type}</span>
          <span className="consumerTag info">{problem.answer_status}</span>
        </div>
      </section>
      {problem.source_links[0]?.url ? <button className="consumerPrimaryButton" type="button"><Link2 size={17} />打开原始来源</button> : null}
    </>
  );
}

function ProgressView({ content, progress }: { content: ConsumerMobileContent; progress: MobileProgress | null }) {
  return (
    <>
      <DomainList domains={content.gesp.domains} title="知识点掌握度" />
      <section className="consumerCard">
        <h2>本周复盘</h2>
        <div className="consumerMetricGrid">
          <div><strong>{progress?.viewed_count ?? 0}</strong><span>已查看</span></div>
          <div><strong>{progress?.favorite_count ?? 0}</strong><span>收藏</span></div>
          <div><strong>{progress?.reviewed_count ?? 0}</strong><span>已复习</span></div>
        </div>
      </section>
      <section className="consumerCard">
        <h2>最近动作</h2>
        {(progress?.viewed || []).slice(0, 3).map((event) => (
          <div className="consumerSavedRow" key={`${event.type}:${event.problemId}`}>
            <span>看</span>
            <div><strong>{event.title || event.problemId}</strong><small>{event.source || "gesp"}</small></div>
            <em>{event.type}</em>
          </div>
        ))}
        {progress?.viewed.length ? null : <p>点击题目后，这里会通过后端进度接口记录浏览历史。</p>}
      </section>
      <section className="consumerCard">
        <h2>下一步建议</h2>
        <p>{content.learning.recommendation}</p>
      </section>
    </>
  );
}

function ProfileView({ content, progress, progressStyle }: { content: ConsumerMobileContent; progress: MobileProgress | null; progressStyle: CSSProperties }) {
  const featured = content.gesp.featured_problem;
  const favorites = progress?.favorites || [];
  return (
    <>
      <section className="consumerCard consumerCardTint consumerProgressCard">
        <div>
          <h2>后端题库掌握度</h2>
          <p>当前接入 GESP {content.gesp.total_count} 题，AtCoder {content.atcoder.total_count} 题。</p>
        </div>
        <div className="consumerRing" style={progressStyle}><span>{content.learning.progress_pct}%</span></div>
      </section>
      <section className="consumerCard">
        <h2>收藏夹</h2>
        {favorites.length ? (
          favorites.slice(0, 4).map((event) => (
            <div className="consumerSavedRow" key={event.problemId}><span>题</span><div><strong>{event.title || event.problemId}</strong><small>{event.source || "gesp"}</small></div><em>收藏</em></div>
          ))
        ) : featured ? (
          <div className="consumerSavedRow"><span>题</span><div><strong>{featured.title}</strong><small>{featured.problem_type}</small></div><em>推荐</em></div>
        ) : (
          <p>后端暂未返回收藏推荐。</p>
        )}
      </section>
      <section className="consumerCard">
        <h2>弱项提醒</h2>
        {content.gesp.domains.filter((domain) => domain.tone !== "good").slice(0, 2).map((domain) => <DomainRow domain={domain} key={domain.id} />)}
      </section>
      <button className="consumerPrimaryButton" type="button"><BarChart3 size={17} />生成复习清单</button>
    </>
  );
}

function DomainList({ activeDomainId, domains, onSelect, title }: {
  activeDomainId?: string | null;
  domains: Domain[];
  onSelect?: (domain: Domain) => void;
  title: string;
}) {
  return (
    <section className="consumerCard">
      <h2>{title}</h2>
      <div className="consumerDomainList">
        {domains.slice(0, 5).map((domain) => (
          <DomainRow active={activeDomainId === domain.id} domain={domain} key={domain.id} onSelect={onSelect ? () => onSelect(domain) : undefined} />
        ))}
      </div>
    </section>
  );
}

function LevelOverview({ content }: { content: ConsumerMobileContent }) {
  return (
    <section className="consumerCard">
      <div className="consumerSectionHead">
        <h2>GESP 等级覆盖</h2>
        <span>{content.gesp.total_count} 题</span>
      </div>
      <div className="consumerLevelGrid">
        {content.gesp.levels.slice(0, 6).map((level) => <LevelChip key={level.level} level={level} />)}
      </div>
    </section>
  );
}

function LevelChip({ active = false, level, onClick }: { active?: boolean; level: LevelSummary; onClick?: () => void }) {
  const className = `consumerLevelChip ${level.tone} ${active ? "active" : ""}`;
  if (onClick) {
    return (
      <button className={className} onClick={onClick} type="button">
        <strong>{level.label}</strong>
        <span>{level.count} 题</span>
        <small>{level.title}</small>
      </button>
    );
  }
  return (
    <article className={className}>
      <strong>{level.label}</strong>
      <span>{level.count} 题</span>
      <small>{level.title}</small>
    </article>
  );
}

function DomainRow({ active = false, domain, onSelect }: { active?: boolean; domain: Domain; onSelect?: () => void }) {
  const className = `consumerDomainRow ${active ? "active" : ""}`;
  if (onSelect) {
    return (
      <button className={className} onClick={onSelect} type="button">
        <div>
          <strong>{domain.name}</strong>
          <small>{domain.description}</small>
        </div>
        <span className={`consumerTag ${domain.tone}`}>{domain.progress}%</span>
      </button>
    );
  }
  return (
    <div className={className}>
      <div>
        <strong>{domain.name}</strong>
        <small>{domain.description}</small>
      </div>
      <span className={`consumerTag ${domain.tone}`}>{domain.progress}%</span>
    </div>
  );
}

function SourceItem({ description, index, label, tag, tone }: { description: string; index: string; label: string; tag: string; tone: "good" | "normal" | "weak" }) {
  return (
    <article className="consumerSourceItem">
      <span>{index}</span>
      <div>
        <strong>{label}</strong>
        <small>{description}</small>
      </div>
      <em className={`consumerTag ${tone}`}>{tag}</em>
    </article>
  );
}

function ProblemListRow({ onOpen, problem }: { onOpen?: (problemId: string) => void | Promise<void>; problem: MobileProblemListItem }) {
  return (
    <button className="consumerProblemRow" onClick={() => void onOpen?.(problem.id)} type="button">
      <span className="consumerBadge">{problem.level.replace(" 级", "")}</span>
      <span>
        <strong>{problem.title}</strong>
        <small>{problem.subtitle} · {problem.domain} · {problem.problem_type}</small>
      </span>
      <em>{problem.has_code ? "码" : "看"}</em>
    </button>
  );
}

function problemListKey(problem: MobileProblemListItem) {
  return `${problem.id}:${problem.domain}:${problem.problem_type}`;
}

function AtCoderTrackRow({ active = false, onSelect, track }: { active?: boolean; onSelect?: () => void; track: AtCoderTrack }) {
  const content = (
    <>
      <span>{track.difficulty}</span>
      <div>
        <strong>{track.name}</strong>
        <small>{track.description}</small>
        <div className="consumerTagRow">
          {track.tags.map((tag) => <em className="consumerTag info" key={tag}>{tag}</em>)}
        </div>
      </div>
      <b>{track.count}</b>
    </>
  );
  if (onSelect) {
    return (
      <button className={`consumerAtCoderRow ${active ? "active" : ""}`} onClick={onSelect} type="button">
        {content}
      </button>
    );
  }
  return (
    <article className={`consumerAtCoderRow ${active ? "active" : ""}`}>
      {content}
    </article>
  );
}

function StateCard({ actionLabel, label, onAction }: { actionLabel?: string; label: string; onAction?: () => void }) {
  return (
    <section className="consumerCard consumerStateCard">
      <RefreshCw size={22} />
      <h2>{label}</h2>
      {onAction ? <button className="consumerSecondaryButton" onClick={onAction} type="button">{actionLabel || "重试"}</button> : null}
    </section>
  );
}
