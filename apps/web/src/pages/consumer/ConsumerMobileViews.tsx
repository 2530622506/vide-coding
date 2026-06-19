import { useState, type CSSProperties } from "react";
import { ArrowRight, BarChart3, BookOpen, Code2, Database, FileSearch, RefreshCw, Search, Star, Trophy } from "lucide-react";
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
import { ConsumerProblemStatement } from "./ConsumerProblemStatement";

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
    return <LoadingSkeleton />;
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
    case "progress":
      return <ProgressView content={content} progress={renderState.progress} />;
    case "profile":
      return <ProfileView content={content} progress={renderState.progress} progressStyle={profileProgressStyle} recordProgress={renderState.recordProgress} />;
    default:
      return <HomeView content={content} progress={renderState.progress} progressStyle={progressStyle} renderState={renderState} setView={setView} />;
  }
}

function HomeView({
  content,
  progress,
  progressStyle,
  renderState,
  setView
}: {
  content: ConsumerMobileContent;
  progress: MobileProgress | null;
  progressStyle: CSSProperties;
  renderState: ConsumerRenderState;
  setView: (view: ConsumerView) => void;
}) {
  const recentViewed = progress?.viewed || [];
  const learningProgress = summarizeLearningProgress(progress);
  const openRecentProblem = async (problemId: string, source?: "gesp" | "atcoder") => {
    if (source === "atcoder") {
      await renderState.selectAtCoderProblem(problemId);
    } else {
      await renderState.selectGespProblem(problemId);
    }
    setView("problem");
  };

  return (
    <>
      <section className="consumerCard consumerCardTint consumerProgressCard">
        <div>
          <h2>本周学习进度</h2>
          <p>基于当前账号本周查看、收藏和复习动作实时计算，数据来自后端进度接口。</p>
          <div className="consumerTagRow">
            <span className="consumerTag good">{progress?.data_source === "mysql" ? "数据库进度" : "本地进度"}</span>
            <span className="consumerTag info">本周 {learningProgress.weeklyActionCount} 次动作</span>
          </div>
        </div>
        <div className="consumerRing" style={progressStyle}><span>{learningProgress.progressPct}%</span></div>
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
        <div className="consumerSectionHead">
          <h2>最近查看</h2>
          <span>{progress?.data_source === "mysql" ? "数据库" : "本地"}</span>
        </div>
        {recentViewed.length ? (
          recentViewed.slice(0, 4).map((event) => (
            <button
              className="consumerSavedRow consumerSavedButton"
              key={`${event.source || "gesp"}:${event.problemId}`}
              onClick={() => void openRecentProblem(event.problemId, event.source)}
              type="button"
            >
              <span>{event.source === "atcoder" ? "At" : "题"}</span>
              <div>
                <strong>{event.title || event.problemId}</strong>
                <small>{event.source || "gesp"} · {formatRecentDate(event.recordedAt)}</small>
              </div>
              <em>查看</em>
            </button>
          ))
        ) : (
          <p>还没有浏览记录。打开任意题目后，这里会从后端进度接口读取最近查看。</p>
        )}
      </section>
    </>
  );
}

function CatalogView({ renderState, setView }: { renderState: ConsumerRenderState; setView: (view: ConsumerView) => void }) {
  const { catalogError, catalogLoading, content, gespCatalog, loadGespCatalog, selectGespProblem } = renderState;
  const catalog = gespCatalog;
  if (!content || !catalog) {
    return catalogLoading ? <LoadingSkeleton /> : <StateCard label="GESP 移动目录暂无数据" />;
  }

  const openProblem = async (problemId: string) => {
    await selectGespProblem(problemId);
    setView("problem");
  };

  return (
    <>
      <div className="consumerSearch"><Search size={17} /><span>搜索题名、知识点</span></div>
      <div className="consumerSegment">
        <button className="active" onClick={() => void loadGespCatalog({ level: catalog.selected_level })} type="button">GESP</button>
        <button onClick={() => scrollConsumerSection("levels")} type="button">全等级</button>
        <button onClick={() => scrollConsumerSection("problem-types")} type="button">题型</button>
      </div>
      {catalogError ? <StateCard actionLabel="重试目录" label={`目录加载失败：${catalogError}`} onAction={() => void loadGespCatalog({ level: catalog.selected_level })} /> : null}
      <section className="consumerCard consumerFilterCard" data-consumer-section="levels">
        <div className="consumerSectionHead">
          <h2>等级目录</h2>
          <span>{catalog.levels.length} 级</span>
        </div>
        <LevelSelect
          activeLevel={catalog.selected_level}
          levels={catalog.levels}
          onSelect={(level) => void loadGespCatalog({ level: level.level })}
          problemCount={catalog.problems.length}
        />
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
      <DomainSelect
        activeDomainId={catalog.selected_domain_id}
        domains={catalog.domains}
        onSelect={(domain) => void loadGespCatalog({ domainId: domain.id, level: catalog.selected_level })}
        problemCount={catalog.problems.length}
      />
      <section className="consumerCard" data-consumer-section="problem-types">
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
  const [activeTab, setActiveTab] = useState<"statement" | "knowledge">("statement");
  const [actionMessage, setActionMessage] = useState("");
  if (!problem) {
    return <StateCard label="后端暂未返回推荐题目详情" />;
  }
  const markProgress = async (type: "favorite" | "review", message: string) => {
    await recordProgress({ problemId: problem.id, source: problem.source, title: problem.title, type });
    setActionMessage(message);
  };
  return (
    <>
      <section className="consumerCard">
        <div className="consumerPillRow">
          <button className={activeTab === "statement" ? "active" : ""} onClick={() => setActiveTab("statement")} type="button">题目</button>
          <button className={activeTab === "knowledge" ? "active" : ""} onClick={() => setActiveTab("knowledge")} type="button">知识点</button>
        </div>
      </section>
      {activeTab === "statement" ? (
        <>
          <ConsumerProblemStatement problem={problem} />
          <section className="consumerCard">
            <h2>解题要点</h2>
            {problem.steps.length ? (
              <ol className="consumerSteps">
                {problem.steps.slice(0, 5).map((step) => <li key={step}>{step}</li>)}
              </ol>
            ) : (
              <p>{problem.algorithm || "暂无详细解题步骤。"}</p>
            )}
          </section>
        </>
      ) : (
        <section className="consumerCard">
          <h2>知识点</h2>
          <div className="consumerTagRow">
            <span className="consumerTag good">等级：{problem.level}</span>
            <span className="consumerTag good">{problem.domain}</span>
            <span className="consumerTag info">{problem.problem_type}</span>
            {problem.knowledge_points.map((point) => <span className="consumerTag info" key={point}>{point}</span>)}
          </div>
        </section>
      )}
      <section className="consumerCard consumerCardTint">
        <h2>学习动作</h2>
        <button className="consumerPrimaryButton" onClick={() => setView("code")} type="button"><Code2 size={17} />查看参考代码</button>
        <button className="consumerSecondaryButton" onClick={() => void markProgress("favorite", "已加入收藏夹")} type="button"><Star size={17} />加入收藏夹</button>
        <button className="consumerSecondaryButton" onClick={() => void markProgress("review", "已标记复习")} type="button"><BarChart3 size={17} />标记已复习</button>
        {actionMessage ? <p className="consumerActionNote">{actionMessage}</p> : null}
      </section>
    </>
  );
}

function CodeView({ problem, recordProgress }: { problem: ConsumerProblem | null; recordProgress: ConsumerRenderState["recordProgress"] }) {
  const [activeTab, setActiveTab] = useState<"code" | "outline" | "complexity">("code");
  const [actionMessage, setActionMessage] = useState("");
  if (!problem) {
    return <StateCard label="后端暂未返回推荐题目代码" />;
  }
  const markProgress = async (type: "favorite" | "review", message: string) => {
    await recordProgress({ problemId: problem.id, source: problem.source, title: problem.title, type });
    setActionMessage(message);
  };
  return (
    <>
      <section className="consumerCard">
        <div className="consumerPillRow">
          <button className={activeTab === "code" ? "active" : ""} onClick={() => setActiveTab("code")} type="button">C++</button>
          <button className={activeTab === "outline" ? "active" : ""} onClick={() => setActiveTab("outline")} type="button">思路</button>
          <button className={activeTab === "complexity" ? "active" : ""} onClick={() => setActiveTab("complexity")} type="button">复杂度</button>
        </div>
      </section>
      {activeTab === "code" && problem.code ? (
        <ConsumerCodeBlock code={problem.code} filename={problem.code_filename} />
      ) : activeTab === "code" ? (
        <section className="consumerCard">
          <h2>暂无本地代码</h2>
          <p>这道题暂时没有可直接展示的参考代码。</p>
        </section>
      ) : activeTab === "outline" ? (
        <section className="consumerCard">
          <h2>参考思路</h2>
          <p>{problem.algorithm || "暂无算法讲解。"}</p>
          {problem.steps.length ? (
            <ol className="consumerSteps">
              {problem.steps.slice(0, 5).map((step) => <li key={step}>{step}</li>)}
            </ol>
          ) : null}
        </section>
      ) : (
        <section className="consumerCard">
          <h2>复杂度</h2>
          <p>{problem.complexity || "暂无复杂度信息。"}</p>
          <div className="consumerTagRow">
            <span className="consumerTag good">{problem.problem_type}</span>
            <span className="consumerTag info">{problem.domain}</span>
          </div>
        </section>
      )}
      <section className="consumerCard consumerCardTint">
        <h2>可用操作</h2>
        <div className="consumerActionGrid">
          <button type="button"><Code2 size={16} />只读查看</button>
          <button onClick={() => void markProgress("favorite", "已收藏")} type="button"><Star size={16} />收藏</button>
          <button onClick={() => void markProgress("review", "已复核")} type="button"><FileSearch size={16} />已复核</button>
        </div>
        {actionMessage ? <p className="consumerActionNote">{actionMessage}</p> : null}
      </section>
    </>
  );
}

function ProgressView({ content, progress }: { content: ConsumerMobileContent; progress: MobileProgress | null }) {
  const learningProgress = summarizeLearningProgress(progress);
  return (
    <>
      <DomainList domains={content.gesp.domains} title="知识点掌握度" />
      <section className="consumerCard">
        <h2>本周复盘</h2>
        <div className="consumerMetricGrid">
          <div><strong>{progress?.weekly_viewed_count ?? 0}</strong><span>已查看</span></div>
          <div><strong>{progress?.weekly_favorite_count ?? 0}</strong><span>收藏</span></div>
          <div><strong>{progress?.weekly_reviewed_count ?? 0}</strong><span>已复习</span></div>
        </div>
        <p className="consumerActionNote">本周完成度 {learningProgress.progressPct}% · 累计 {progress?.activity_count ?? 0} 次动作</p>
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

function ProfileView({
  content,
  progress,
  progressStyle,
  recordProgress
}: {
  content: ConsumerMobileContent;
  progress: MobileProgress | null;
  progressStyle: CSSProperties;
  recordProgress: ConsumerRenderState["recordProgress"];
}) {
  const featured = content.gesp.featured_problem;
  const favorites = progress?.favorites || [];
  const [reviewPlanMessage, setReviewPlanMessage] = useState("");
  const learningProgress = summarizeLearningProgress(progress);
  const generateReviewPlan = async () => {
    const candidates = [...favorites, ...(progress?.viewed || [])];
    const titles = candidates.slice(0, 3).map((event) => event.title || event.problemId);
    const title = titles.length ? `复习清单：${titles.join("、")}` : "复习清单：先浏览 3 道题";
    await recordProgress({
      problemId: `review-plan:${Date.now()}`,
      source: "gesp",
      title,
      type: "review"
    });
    setReviewPlanMessage(title);
  };
  return (
    <>
      <section className="consumerCard consumerCardTint consumerProgressCard">
        <div>
          <h2>后端题库掌握度</h2>
          <p>当前账号本周进度来自数据库事件，已接入 GESP {content.gesp.total_count} 题，AtCoder {content.atcoder.total_count} 题。</p>
        </div>
        <div className="consumerRing" style={progressStyle}><span>{learningProgress.progressPct}%</span></div>
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
      <button className="consumerPrimaryButton" onClick={() => void generateReviewPlan()} type="button"><BarChart3 size={17} />生成复习清单</button>
      {reviewPlanMessage ? <p className="consumerActionNote">{reviewPlanMessage}</p> : null}
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

function LevelSelect({
  activeLevel,
  levels,
  onSelect,
  problemCount
}: {
  activeLevel: number;
  levels: LevelSummary[];
  onSelect: (level: LevelSummary) => void;
  problemCount: number;
}) {
  const currentLevel = levels.find((level) => level.level === activeLevel) || levels[0] || null;

  return (
    <>
      <label className="consumerSelectField">
        <span>当前等级</span>
        <select
          aria-label="选择 GESP 等级"
          disabled={!levels.length}
          name="consumer-gesp-level"
          onChange={(event) => {
            const nextLevel = levels.find((level) => String(level.level) === event.target.value);
            if (nextLevel) {
              onSelect(nextLevel);
            }
          }}
          value={currentLevel ? String(currentLevel.level) : ""}
        >
          {levels.map((level) => (
            <option key={level.level} value={level.level}>
              {level.label} · {level.count} 题
            </option>
          ))}
        </select>
      </label>
      {currentLevel ? (
        <div className="consumerDomainSummary">
          <div>
            <strong>{currentLevel.label}</strong>
            <small>{currentLevel.description}</small>
          </div>
          <span className={`consumerTag ${currentLevel.tone}`}>{problemCount} 题</span>
        </div>
      ) : (
        <p>后端暂未返回等级目录。</p>
      )}
    </>
  );
}

function DomainSelect({
  activeDomainId,
  domains,
  onSelect,
  problemCount
}: {
  activeDomainId?: string | null;
  domains: Domain[];
  onSelect: (domain: Domain) => void;
  problemCount: number;
}) {
  const activeDomain = domains.find((domain) => domain.id === activeDomainId) || domains[0] || null;

  return (
    <section className="consumerCard consumerFilterCard">
      <div className="consumerSectionHead">
        <h2>算法范畴</h2>
        <span>{problemCount} 题</span>
      </div>
      <label className="consumerSelectField">
        <span>当前范畴</span>
        <select
          aria-label="选择算法范畴"
          disabled={!domains.length}
          name="consumer-algorithm-domain"
          onChange={(event) => {
            const nextDomain = domains.find((domain) => domain.id === event.target.value);
            if (nextDomain) {
              onSelect(nextDomain);
            }
          }}
          value={activeDomain?.id || ""}
        >
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name} · {domain.count} 题
            </option>
          ))}
        </select>
      </label>
      {activeDomain ? (
        <div className="consumerDomainSummary">
          <div>
            <strong>{activeDomain.name}</strong>
            <small>{activeDomain.description}</small>
          </div>
          <span className={`consumerTag ${activeDomain.tone}`}>{activeDomain.progress}%</span>
        </div>
      ) : (
        <p>后端暂未返回算法范畴。</p>
      )}
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

function formatRecentDate(recordedAt?: string) {
  if (!recordedAt) {
    return "最近查看";
  }
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) {
    return "最近查看";
  }
  return date.toLocaleDateString();
}

function scrollConsumerSection(section: string) {
  const target = document.querySelector(`[data-consumer-section="${section}"]`);
  const content = document.querySelector(".consumerContent");
  if (!(target instanceof HTMLElement) || !(content instanceof HTMLElement)) {
    return;
  }
  const contentTop = content.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  content.scrollTo({
    top: content.scrollTop + targetTop - contentTop - 16,
    behavior: "smooth"
  });
}

function summarizeLearningProgress(progress: MobileProgress | null) {
  const progressPct = progress?.progress_pct ?? 0;
  const weeklyActionCount = (progress?.weekly_viewed_count ?? 0) + (progress?.weekly_favorite_count ?? 0) + (progress?.weekly_reviewed_count ?? 0);
  return { progressPct, weeklyActionCount };
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

function LoadingSkeleton() {
  return (
    <>
      <section className="consumerCard consumerSkeletonCard" aria-hidden="true">
        <span />
        <span />
        <span />
      </section>
      <section className="consumerCard consumerSkeletonCard short" aria-hidden="true">
        <span />
        <span />
      </section>
    </>
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
