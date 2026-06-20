import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, BookOpen, ChevronLeft, Code2, Filter, PenLine, RefreshCw, Search, Settings, Share, Star, Trophy } from "lucide-react";
import { ConsumerCodeBlock } from "./ConsumerCodeBlock";
import { ConsumerProblemStatement } from "./ConsumerProblemStatement";
import type {
  AtCoderTrack,
  ConsumerMobileContent,
  ConsumerProblem,
  ConsumerView,
  Domain,
  LearningTask,
  LevelSummary,
  MobileAtCoderCatalog,
  MobileGespCatalog,
  MobileProblemListItem,
  MobileProgress,
  MobileProgressEvent,
  MobileSearchResult,
  ReviewPlan,
  WeakPoint
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
  removeProgress: (event: { problemId: string; source?: "gesp" | "atcoder"; title?: string; type: "view" | "favorite" | "review" }) => Promise<MobileProgress>;
  reload: () => void;
  searchError: string | null;
  searchLoading: boolean;
  searchProblems: (query: string) => Promise<MobileSearchResult | null>;
  searchResult: MobileSearchResult | null;
  selectedProblem: ConsumerProblem | null;
  selectAtCoderProblem: (problemId: string) => Promise<ConsumerProblem | null>;
  selectGespProblem: (problemId: string) => Promise<ConsumerProblem | null>;
};

export function renderConsumerView(
  view: ConsumerView,
  setView: (view: ConsumerView) => void,
  renderState: ConsumerRenderState,
  _progressStyle: CSSProperties,
  _profileProgressStyle: CSSProperties
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
    case "search":
      return <SearchView renderState={renderState} setView={setView} />;
    case "catalog":
      return <CatalogView renderState={renderState} setView={setView} />;
    case "atcoder":
      return <AtCoderView content={content} renderState={renderState} setView={setView} />;
    case "problem":
      return <ProblemView problem={renderState.selectedProblem || content.gesp.featured_problem} progress={renderState.progress} recordProgress={renderState.recordProgress} removeProgress={renderState.removeProgress} setView={setView} />;
    case "code":
      return <CodeView problem={renderState.selectedProblem || content.gesp.featured_problem} progress={renderState.progress} recordProgress={renderState.recordProgress} removeProgress={renderState.removeProgress} setView={setView} />;
    case "progress":
      return <ProgressView content={content} progress={renderState.progress} setView={setView} />;
    case "weak-points":
      return <WeakPointsView content={content} progress={renderState.progress} setView={setView} />;
    case "profile":
      return <ProfileView content={content} progress={renderState.progress} setView={setView} />;
    case "favorites":
      return <FavoritesView content={content} progress={renderState.progress} renderState={renderState} setView={setView} />;
    case "settings":
      return <SettingsView progress={renderState.progress} setView={setView} />;
    default:
      return <HomeView content={content} progress={renderState.progress} renderState={renderState} setView={setView} />;
  }
}

function HomeView({
  content,
  progress,
  renderState,
  setView
}: {
  content: ConsumerMobileContent;
  progress: MobileProgress | null;
  renderState: ConsumerRenderState;
  setView: (view: ConsumerView) => void;
}) {
  const todayTask = nextTaskFromCatalog(renderState.gespCatalog, progress) || content.home?.today_task || fallbackTaskFromProblem(content.gesp.featured_problem, "featured", "开始练习");
  const continueTask = content.home?.continue_task || latestProgressTask(progress) || fallbackTaskFromProblem(content.gesp.featured_problem, "continue", "继续");
  const weakPoints = content.home?.knowledge_progress?.length ? content.home.knowledge_progress : progress?.weak_points || weakPointsFromDomains(content.gesp.domains);
  const libraryCards = content.home?.library_cards || [
    { source: "gesp" as const, title: "GESP 全等级", count: content.gesp.total_count, subtitle: `${content.gesp.levels.length} 个等级 · 后端目录` },
    { source: "atcoder" as const, title: "AtCoder", count: content.atcoder.total_count, subtitle: `${content.atcoder.tracks.length} 个难度轨道` }
  ];

  const openTask = async (task: LearningTask | null) => {
    if (!task?.problem_id) {
      setView("catalog");
      return;
    }
    if (task.source === "atcoder") {
      await renderState.selectAtCoderProblem(task.problem_id);
    } else {
      await renderState.selectGespProblem(task.problem_id);
    }
    setView("problem");
  };

  return (
    <>
      <TopBar title="GESP 练习" subtitle="C++ 学习路径" action={<IconShell label="搜索" onClick={() => setView("search")}><Search size={18} /></IconShell>} />
      <HeroPanel
        eyebrow="今日建议"
        title={todayTask?.title || "先选题库，再开始练习"}
        description={todayTask?.subtitle || content.learning.recommendation}
        actionLabel={todayTask?.cta_label || "开始练习"}
        onAction={() => void openTask(todayTask)}
        sideAction={<Star size={17} />}
      />

      <SectionHeader title="继续学习" action="全部" onAction={() => setView("catalog")} />
      {continueTask ? (
        <TaskCard icon={<PenLine size={18} />} task={continueTask} onOpen={() => void openTask(continueTask)} />
      ) : (
        <StateCard label="还没有学习记录，先从题库挑一道题。" />
      )}

      <SectionHeader title="题库入口" action="2 个来源" />
      <div className="consumerLibraryGrid">
        {libraryCards.map((card) => (
          <button className={`consumerLibraryCard ${card.source === "gesp" ? "active" : ""}`} key={card.source} onClick={() => setView(card.source === "gesp" ? "catalog" : "atcoder")} type="button">
            {card.source === "gesp" ? <BookOpen size={20} /> : <Trophy size={20} />}
            <span>{card.title}</span>
            <strong>{card.count} 题</strong>
            <small>{card.subtitle}</small>
          </button>
        ))}
      </div>

      <SectionHeader title="知识点进度" action="本周" onAction={() => setView("weak-points")} />
      <WeakPointList points={weakPoints.slice(0, 3)} />
    </>
  );
}

function SearchView({ renderState, setView }: { renderState: ConsumerRenderState; setView: (view: ConsumerView) => void }) {
  const { searchError, searchLoading, searchProblems, searchResult, selectAtCoderProblem, selectGespProblem } = renderState;
  const [query, setQuery] = useState(searchResult?.query || "");
  const hasResults = Boolean(searchResult && (searchResult.gesp.length || searchResult.atcoder.length));
  const submitSearch = async () => {
    await searchProblems(query);
  };
  const openProblem = async (problem: MobileProblemListItem, source: "gesp" | "atcoder") => {
    if (source === "atcoder") {
      await selectAtCoderProblem(problem.id);
    } else {
      await selectGespProblem(problem.id);
    }
    setView("problem");
  };

  return (
    <>
      <TopBar
        align="right"
        title="搜索"
        subtitle="题名、知识点、题号"
        leading={<IconShell label="返回首页" onClick={() => setView("home")}><ChevronLeft size={18} /></IconShell>}
      />
      <form className="consumerSearchForm" onSubmit={(event) => {
        event.preventDefault();
        void submitSearch();
      }}>
        <Search size={18} />
        <input autoFocus inputMode="search" onChange={(event) => setQuery(event.target.value)} placeholder="输入题名、知识点或题号" type="search" value={query} />
        <button disabled={searchLoading} type="submit">{searchLoading ? "搜索中" : "搜索"}</button>
      </form>
      {searchError ? <StateCard actionLabel="重试" label={`搜索失败：${searchError}`} onAction={() => void submitSearch()} /> : null}
      {!searchResult ? (
        <StateCard label="输入关键词后，会同时搜索 GESP 和 AtCoder 题库。" />
      ) : hasResults ? (
        <>
          <SectionHeader title="GESP" action={`${searchResult.gesp.length} 题`} />
          <div className="consumerProblemList">
            {searchResult.gesp.slice(0, 8).map((problem, index) => (
              <ProblemListRow index={index + 1} key={`gesp:${problemListKey(problem)}`} onOpen={() => void openProblem(problem, "gesp")} problem={problem} />
            ))}
          </div>
          <SectionHeader title="AtCoder" action={`${searchResult.atcoder.length} 题`} />
          <div className="consumerProblemList">
            {searchResult.atcoder.slice(0, 8).map((problem, index) => (
              <ProblemListRow index={index + 1} key={`atcoder:${problemListKey(problem)}`} onOpen={() => void openProblem(problem, "atcoder")} problem={problem} />
            ))}
          </div>
        </>
      ) : (
        <StateCard label={`没有找到「${searchResult.query}」相关题目，换个关键词试试。`} />
      )}
    </>
  );
}

function CatalogView({ renderState, setView }: { renderState: ConsumerRenderState; setView: (view: ConsumerView) => void }) {
  const { catalogError, catalogLoading, gespCatalog, loadGespCatalog, selectGespProblem } = renderState;
  const catalog = gespCatalog;
  if (!catalog) {
    return catalogLoading ? <LoadingSkeleton /> : <StateCard label="GESP 移动目录暂无数据" />;
  }
  const openProblem = async (problemId: string) => {
    await selectGespProblem(problemId);
    setView("problem");
  };

  return (
    <>
      <TopBar
        align="right"
        title="全等级题库"
        subtitle="按等级、题型、知识点筛选"
        leading={<IconShell label="返回" onClick={() => setView("home")}><ChevronLeft size={18} /></IconShell>}
      />
      <SearchBox label="搜索题名、知识点" onClick={() => setView("search")} />
      <div className="consumerChipRow">
        {catalog.levels.map((level) => (
          <button className={level.level === catalog.selected_level ? "active" : ""} key={level.level} onClick={() => void loadGespCatalog({ level: level.level })} type="button">
            {level.label.replace(" 级", "级")}
          </button>
        ))}
        <button onClick={() => setView("atcoder")} type="button">AtCoder</button>
      </div>
      {catalogError ? <StateCard actionLabel="重试目录" label={`目录加载失败：${catalogError}`} onAction={() => void loadGespCatalog({ level: catalog.selected_level })} /> : null}

      <SectionHeader title="当前筛选" action={`${catalog.problems.length} 题`} />
      <div className="consumerLibraryGrid">
        <SummaryTile label="等级" value={`${catalog.selected_level}级`} />
        <SummaryTile active label="知识点" value={catalog.selected_domain_id ? catalog.domains.find((domain) => domain.id === catalog.selected_domain_id)?.name || "全部" : "全部"} />
      </div>

      <SectionHeader title="题型分布" action="重置" onAction={() => void resetGespCatalog(loadGespCatalog, catalog.selected_level)} />
      <div className="consumerChipRow">
        {catalog.problem_types.map((type) => (
          <button
            className={catalog.selected_problem_type_id === type.id ? "active" : ""}
            key={type.id}
            onClick={() => void loadGespCatalog({ domainId: catalog.selected_domain_id, level: catalog.selected_level, problemTypeId: type.id })}
            type="button"
          >
            {type.name}
          </button>
        ))}
      </div>

      <SectionHeader title="推荐题目" action={catalogLoading ? "切换中" : "薄弱优先"} />
      <div className="consumerProblemList">
        {catalog.problems.slice(0, 8).map((problem, index) => <ProblemListRow index={index + 1} key={problemListKey(problem)} onOpen={openProblem} problem={problem} />)}
      </div>
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
      <TopBar
        align="right"
        title="AtCoder"
        subtitle="独立算法题库"
        leading={<IconShell label="返回" onClick={() => setView("catalog")}><ChevronLeft size={18} /></IconShell>}
      />
      <SearchBox label="搜索题号、算法标签、难度" onClick={() => setView("search")} />
      <HeroPanel eyebrow="算法训练" title={`${content.atcoder.total_count} 道题`} description="按 AtCoder 难度、算法标签和样例完整度组织，不套 GESP 等级。" actionLabel="返回 GESP" onAction={() => setView("catalog")} sideAction={<Trophy size={17} />} />
      {catalogError ? <StateCard actionLabel="重试 AtCoder" label={`AtCoder 目录加载失败：${catalogError}`} onAction={() => void loadAtCoderCatalog()} /> : null}
      <SectionHeader title="难度轨道" action="AtCoder" />
      <div className="consumerChipRow">
        {(catalog?.tracks || content.atcoder.tracks).map((track) => (
          <button className={catalog?.selected_difficulty === track.difficulty ? "active" : ""} key={track.difficulty} onClick={() => void loadAtCoderCatalog({ difficulty: track.difficulty })} type="button">
            {track.difficulty}
          </button>
        ))}
      </div>
      <SectionHeader title="AtCoder 题目" action={catalogLoading ? "切换中" : `${catalog?.problems.length ?? 0} 题`} />
      <div className="consumerProblemList">
        {(catalog?.problems || []).slice(0, 8).map((problem, index) => <ProblemListRow index={index + 1} key={problemListKey(problem)} onOpen={openProblem} problem={problem} />)}
      </div>
    </>
  );
}

function ProblemView({ problem, progress, recordProgress, removeProgress, setView }: {
  problem: ConsumerProblem | null;
  progress: MobileProgress | null;
  recordProgress: ConsumerRenderState["recordProgress"];
  removeProgress: ConsumerRenderState["removeProgress"];
  setView: (view: ConsumerView) => void;
}) {
  const [actionMessage, setActionMessage] = useState("");
  const [favoriteMarked, setFavoriteMarked] = useState(() => Boolean(problem && progress?.favorites.some((event) => event.problemId === problem.id && event.source === problem.source)));
  const [reviewMarked, setReviewMarked] = useState(() => Boolean(problem && progress?.reviewed.some((event) => event.problemId === problem.id && event.source === problem.source)));
  useEffect(() => {
    setFavoriteMarked(Boolean(problem && progress?.favorites.some((event) => event.problemId === problem.id && event.source === problem.source)));
    setReviewMarked(Boolean(problem && progress?.reviewed.some((event) => event.problemId === problem.id && event.source === problem.source)));
  }, [problem, progress?.favorites, progress?.reviewed]);
  if (!problem) {
    return <StateCard label="后端暂未返回推荐题目详情" />;
  }
  const markProgress = async (type: "favorite" | "review", message: string) => {
    await recordProgress({ problemId: problem.id, source: problem.source, title: problem.title, type });
    if (type === "favorite") {
      setFavoriteMarked(true);
    }
    if (type === "review") {
      setReviewMarked(true);
    }
    setActionMessage(message);
  };
  const toggleFavorite = async () => {
    if (favoriteMarked) {
      await removeProgress({ problemId: problem.id, source: problem.source, title: problem.title, type: "favorite" });
      setFavoriteMarked(false);
      setActionMessage("已取消收藏");
      return;
    }
    await markProgress("favorite", "已加入收藏夹");
  };
  const solutionSteps = solutionThinking(problem);

  return (
    <>
      <TopBar
        leading={<IconShell label="返回题库" onClick={() => setView(problem.source === "atcoder" ? "atcoder" : "catalog")}><ChevronLeft size={18} /></IconShell>}
        action={<IconShell label={favoriteMarked ? "取消收藏" : "收藏"} onClick={() => void toggleFavorite()}><Star size={18} fill={favoriteMarked ? "currentColor" : "none"} /></IconShell>}
      />
      <div className="consumerDetailTitle">
        <span>{problem.subtitle}</span>
        <h1>{problem.title}</h1>
        <p>{problem.domain} · {problem.problem_type} · 官方题源对齐</p>
      </div>

      <ConsumerProblemStatement problem={problem} />

      <SectionHeader title="解题思路" action={`${solutionSteps.length} 步`} />
      <div className="consumerInsightList">
        {solutionSteps.map((step, index) => (
          <article className="consumerInsight" key={step}>
            <strong>{index + 1}. {step}</strong>
            <small>{solutionHint(index, problem)}</small>
          </article>
        ))}
      </div>

      <button className="consumerCodeStrip" onClick={() => setView("code")} type="button">
        <span><strong>查看参考代码</strong><small>{problem.complexity || "C++17 · 复杂度待确认"}</small></span>
        <ArrowRight size={18} />
      </button>
      <button className={`consumerSecondaryFull ${reviewMarked ? "active" : ""}`} onClick={() => void markProgress("review", reviewMarked ? "已完成复习" : "已标记复习")} type="button">{reviewMarked ? "已复习" : "标记已复习"}</button>
      {actionMessage ? <p className="consumerActionNote">{actionMessage}</p> : null}
    </>
  );
}

function CodeView({ problem, progress, recordProgress, removeProgress, setView }: { problem: ConsumerProblem | null; progress: MobileProgress | null; recordProgress: ConsumerRenderState["recordProgress"]; removeProgress: ConsumerRenderState["removeProgress"]; setView: (view: ConsumerView) => void }) {
  const [actionMessage, setActionMessage] = useState("");
  const [favoriteMarked, setFavoriteMarked] = useState(() => Boolean(problem && progress?.favorites.some((event) => event.problemId === problem.id && event.source === problem.source)));
  const [reviewMarked, setReviewMarked] = useState(() => Boolean(problem && progress?.reviewed.some((event) => event.problemId === problem.id && event.source === problem.source)));
  useEffect(() => {
    setFavoriteMarked(Boolean(problem && progress?.favorites.some((event) => event.problemId === problem.id && event.source === problem.source)));
    setReviewMarked(Boolean(problem && progress?.reviewed.some((event) => event.problemId === problem.id && event.source === problem.source)));
  }, [problem, progress?.favorites, progress?.reviewed]);
  if (!problem) {
    return <StateCard label="后端暂未返回推荐题目代码" />;
  }
  const markProgress = async (type: "favorite" | "review", message: string) => {
    await recordProgress({ problemId: problem.id, source: problem.source, title: problem.title, type });
    if (type === "favorite") {
      setFavoriteMarked(true);
    }
    if (type === "review") {
      setReviewMarked(true);
    }
    setActionMessage(message);
  };
  const toggleFavorite = async () => {
    if (favoriteMarked) {
      await removeProgress({ problemId: problem.id, source: problem.source, title: problem.title, type: "favorite" });
      setFavoriteMarked(false);
      setActionMessage("已取消收藏");
      return;
    }
    await markProgress("favorite", "已收藏");
  };

  return (
    <>
      <TopBar
        align="right"
        title="参考代码"
        subtitle={problem.title}
        leading={<IconShell label="返回题目" onClick={() => setView("problem")}><ChevronLeft size={18} /></IconShell>}
      />
      <div className="consumerActionGrid top">
        <button className={favoriteMarked ? "active" : ""} onClick={() => void toggleFavorite()} type="button"><Star fill={favoriteMarked ? "currentColor" : "none"} size={16} />{favoriteMarked ? "取消收藏" : "收藏"}</button>
        <button className={reviewMarked ? "active" : ""} onClick={() => void markProgress("review", reviewMarked ? "已完成复习" : "已复习")} type="button"><Code2 size={16} />{reviewMarked ? "已复习" : "已复习"}</button>
      </div>
      {problem.code ? (
        <ConsumerCodeBlock code={problem.code} filename={problem.code_filename} />
      ) : (
        <section className="consumerStatementCard">
          <h2>暂无本地代码</h2>
          <p>{problem.algorithm || "这道题暂时没有可直接展示的参考代码。"}</p>
        </section>
      )}
      {actionMessage ? <p className="consumerActionNote">{actionMessage}</p> : null}
    </>
  );
}

function ProgressView({ content, progress, setView }: { content: ConsumerMobileContent; progress: MobileProgress | null; setView: (view: ConsumerView) => void }) {
  const weakPoints = progress?.weak_points?.length ? progress.weak_points : content.progress_summary?.weak_points || weakPointsFromDomains(content.gesp.domains);
  const recentEvents = progress?.recent_events || content.progress_summary?.recent_events || progress?.viewed || [];
  const counts = progressCounts(progress, content);
  const masteryPct = progress?.mastery_pct ?? progress?.progress_pct ?? content.progress_summary?.mastery_pct ?? content.learning.progress_pct;
  const reviewPlan = progress?.review_plan || content.profile_summary?.review_plan || emptyReviewPlan();
  const openReview = () => {
    const task = reviewPlan.items.find((item) => item.problem_id);
    if (task?.problem_id) {
      setView("favorites");
      return;
    }
    setView("weak-points");
  };

  return (
    <>
      <TopBar title="学习进度" subtitle="按知识点看掌握度" action={<IconShell label="筛选薄弱点" onClick={() => setView("weak-points")}><Filter size={18} /></IconShell>} />
      <HeroPanel eyebrow="本周概览" title={`完成 ${counts.weekly_actions} 次练习，薄弱点剩 ${weakPoints.length} 个`} description="系统会优先把错误率高、最近没复习的知识点放在前面。" actionLabel="开始复习" onAction={openReview} onSideAction={() => setView("weak-points")} sideAction={<RefreshCw size={17} />} sideLabel="刷新复习建议" />
      <SectionHeader title="掌握度" action={`${masteryPct}%`} />
      <div className="consumerLibraryGrid">
        <SummaryTile active label="已看题目" value={String(counts.viewed)} />
        <SummaryTile label="已复习" value={String(counts.reviewed)} />
      </div>
      <SectionHeader title="薄弱知识点" action="查看全部" onAction={() => setView("weak-points")} />
      <WeakPointList points={weakPoints.slice(0, 4)} />
      <SectionHeader title="最近动作" action={progress?.data_source === "mysql" ? "数据库同步" : "本地记录"} />
      <EventList events={recentEvents.slice(0, 3)} emptyLabel="点击题目后，这里会记录最近动作。" />
    </>
  );
}

function ProfileView({ content, progress, setView }: { content: ConsumerMobileContent; progress: MobileProgress | null; setView: (view: ConsumerView) => void }) {
  const counts = progressCounts(progress, content);
  const favorites = progress?.favorites || content.profile_summary?.favorites || [];
  const reviewPlan = progress?.review_plan || content.profile_summary?.review_plan || emptyReviewPlan();
  const profileCopy = profileHeroCopy(progress, reviewPlan);

  return (
    <>
      <TopBar title="我的" subtitle="收藏、复习和学习记录" action={<IconShell label="设置" onClick={() => setView("settings")}><Settings size={18} /></IconShell>} />
      <HeroPanel eyebrow="学习档案" title={profileCopy.title} description={profileCopy.description} actionLabel="打开收藏" onAction={() => setView("favorites")} onSideAction={() => setView("favorites")} sideAction={<Share size={17} />} sideLabel="进入收藏夹" />
      <SectionHeader title="学习数据" action="实时" />
      <div className="consumerLibraryGrid">
        <SummaryTile active label="收藏题" value={String(counts.favorite)} />
        <SummaryTile label="复习中" value={String(counts.reviewed)} />
      </div>
      <SectionHeader title="收藏夹" action="管理" onAction={() => setView("favorites")} />
      <EventList events={favorites.slice(0, 4)} emptyLabel="还没有收藏题，先从题目页点击收藏。" />
      <SectionHeader title="复习计划" action={reviewPlan.status === "ready" ? `今日 ${reviewPlan.items.length} 题` : "待生成"} />
      {reviewPlan.items.length ? (
        <div className="consumerProblemList">
          {reviewPlan.items.map((task) => <TaskCard icon={<BookOpen size={18} />} key={task.id} task={task} />)}
        </div>
      ) : (
        <StateCard label="暂无复习计划，浏览或收藏题目后会自动生成。" />
      )}
    </>
  );
}

function WeakPointsView({ content, progress, setView }: { content: ConsumerMobileContent; progress: MobileProgress | null; setView: (view: ConsumerView) => void }) {
  const weakPoints = progress?.weak_points?.length ? progress.weak_points : content.progress_summary?.weak_points || weakPointsFromDomains(content.gesp.domains);
  return (
    <>
      <TopBar
        align="right"
        title="薄弱知识点"
        subtitle="按掌握度排序"
        leading={<IconShell label="返回进度" onClick={() => setView("progress")}><ChevronLeft size={18} /></IconShell>}
      />
      <HeroPanel eyebrow="复习建议" title={`优先处理 ${weakPoints[0]?.name || "基础题型"}`} description="按题量和掌握度排序，先补最薄弱的知识点，再回到题库筛选同类题。" actionLabel="去题库筛选" onAction={() => setView("catalog")} onSideAction={() => setView("progress")} sideAction={<RefreshCw size={17} />} sideLabel="返回进度" />
      <SectionHeader title="全部薄弱点" action={`${weakPoints.length} 个`} />
      <WeakPointList points={weakPoints} />
    </>
  );
}

function FavoritesView({ content, progress, renderState, setView }: { content: ConsumerMobileContent; progress: MobileProgress | null; renderState: ConsumerRenderState; setView: (view: ConsumerView) => void }) {
  const favorites = progress?.favorites || content.profile_summary?.favorites || [];
  const reviewPlan = progress?.review_plan || content.profile_summary?.review_plan || emptyReviewPlan();
  const openEvent = async (event: MobileProgressEvent) => {
    if (event.source === "atcoder") {
      await renderState.selectAtCoderProblem(event.problemId);
    } else {
      await renderState.selectGespProblem(event.problemId);
    }
    setView("problem");
  };
  const openTask = async (task: LearningTask) => {
    if (!task.problem_id) {
      setView("weak-points");
      return;
    }
    if (task.source === "atcoder") {
      await renderState.selectAtCoderProblem(task.problem_id);
    } else {
      await renderState.selectGespProblem(task.problem_id);
    }
    setView("problem");
  };
  return (
    <>
      <TopBar
        align="right"
        title="收藏夹"
        subtitle="收藏和待复习题"
        leading={<IconShell label="返回我的" onClick={() => setView("profile")}><ChevronLeft size={18} /></IconShell>}
      />
      <SectionHeader title="已收藏" action={`${favorites.length} 题`} />
      {favorites.length ? (
        <div className="consumerProblemList">
          {favorites.map((event, index) => (
            <button className="consumerEventRow" key={`${event.source}:${event.problemId}`} onClick={() => void openEvent(event)} type="button">
              <span>收</span>
              <div><strong>{event.title || event.problemId}</strong><small>{event.source === "atcoder" ? "AtCoder" : "GESP"} · 已收藏</small></div>
              <em>{String(index + 1).padStart(2, "0")}</em>
            </button>
          ))}
        </div>
      ) : (
        <StateCard actionLabel="去题库收藏" label="还没有收藏题，先从题目详情页点击收藏。" onAction={() => setView("catalog")} />
      )}
      <SectionHeader title="复习计划" action={reviewPlan.status === "ready" ? `${reviewPlan.items.length} 项` : "待生成"} />
      {reviewPlan.items.length ? (
        <div className="consumerProblemList">
          {reviewPlan.items.map((task) => <TaskCard icon={<BookOpen size={18} />} key={task.id} task={task} onOpen={() => void openTask(task)} />)}
        </div>
      ) : (
        <StateCard label="收藏或浏览题目后，系统会自动生成复习计划。" />
      )}
    </>
  );
}

function SettingsView({ progress, setView }: { progress: MobileProgress | null; setView: (view: ConsumerView) => void }) {
  return (
    <>
      <TopBar
        align="right"
        title="设置"
        subtitle="学习档案与数据"
        leading={<IconShell label="返回我的" onClick={() => setView("profile")}><ChevronLeft size={18} /></IconShell>}
      />
      <section className="consumerSettingList">
        <article>
          <span>学习档案</span>
          <strong>{progress?.user_key || "anonymous"}</strong>
        </article>
        <article>
          <span>进度来源</span>
          <strong>{progress?.data_source === "mysql" ? "数据库同步" : "本地临时记录"}</strong>
        </article>
        <article>
          <span>本周动作</span>
          <strong>{progress?.counts?.weekly_actions ?? 0} 次</strong>
        </article>
      </section>
      <SectionHeader title="快捷入口" />
      <div className="consumerActionGrid">
        <button onClick={() => setView("favorites")} type="button"><Star size={16} />收藏夹</button>
        <button onClick={() => setView("weak-points")} type="button"><Filter size={16} />薄弱点</button>
      </div>
    </>
  );
}

function TopBar({
  action,
  align = "left",
  leading,
  subtitle,
  title
}: {
  action?: ReactNode;
  align?: "left" | "right";
  leading?: ReactNode;
  subtitle?: string;
  title?: string;
}) {
  return (
    <header className="consumerTopbar">
      {leading || (
        <div className={`consumerBrand ${align === "right" ? "right" : ""}`}>
          {title ? <strong>{title}</strong> : null}
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      )}
      {leading ? (
        <div className={`consumerBrand ${align === "right" ? "right" : ""}`}>
          {title ? <strong>{title}</strong> : null}
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      ) : action}
      {leading ? action : null}
    </header>
  );
}

function IconShell({ children, label, onClick }: { children: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button aria-label={label} className="consumerIconButton" onClick={onClick} type="button">
      {children}
    </button>
  );
}

function HeroPanel({
  actionLabel,
  description,
  eyebrow,
  onAction,
  onSideAction,
  sideAction,
  sideLabel = "更多",
  title
}: {
  actionLabel: string;
  description: string;
  eyebrow: string;
  onAction: () => void;
  onSideAction?: () => void;
  sideAction: ReactNode;
  sideLabel?: string;
  title: string;
}) {
  return (
    <section className="consumerHeroPanel">
      <div className="consumerHeroEyebrow"><BookOpen size={15} />{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="consumerHeroActions">
        <button onClick={onAction} type="button">{actionLabel}<ArrowRight size={16} /></button>
        <button aria-label={sideLabel} className="consumerHeroIconAction" onClick={onSideAction || onAction} type="button">{sideAction}</button>
      </div>
    </section>
  );
}

function SectionHeader({ action, onAction, title }: { action?: string; onAction?: () => void; title: string }) {
  return (
    <div className="consumerSectionHeader">
      <h2>{title}</h2>
      {action ? (
        onAction ? <button onClick={onAction} type="button">{action}</button> : <span>{action}</span>
      ) : null}
    </div>
  );
}

function SearchBox({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="consumerSearchBox" onClick={onClick} type="button"><Search size={17} />{label}</button>;
}

function SummaryTile({ active = false, label, value }: { active?: boolean; label: string; value: string }) {
  return (
    <article className={`consumerSummaryTile ${active ? "active" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TaskCard({ icon, onOpen, task }: { icon: ReactNode; onOpen?: () => void; task: LearningTask }) {
  const content = (
    <>
      <span className="consumerTaskIcon">{icon}</span>
      <div><strong>{task.title}</strong><small>{task.subtitle}</small></div>
      {onOpen ? <em><ArrowRight size={17} /></em> : null}
    </>
  );
  if (onOpen) {
    return <button className="consumerTaskCard" onClick={onOpen} type="button">{content}</button>;
  }
  return <article className="consumerTaskCard">{content}</article>;
}

function WeakPointList({ points }: { points: WeakPoint[] }) {
  if (!points.length) {
    return <StateCard label="暂无薄弱知识点，继续练习后会生成。" />;
  }
  return (
    <div className="consumerWeakList">
      {points.map((point) => (
        <article className="consumerWeakItem" key={point.id}>
          <strong>{point.name}</strong>
          <small>{point.count} 道题 · 建议今天完成 {point.suggested_count} 道</small>
          <span><i style={{ width: `${point.progress}%` }} /></span>
        </article>
      ))}
    </div>
  );
}

function EventList({ emptyLabel, events }: { emptyLabel: string; events: MobileProgressEvent[] }) {
  if (!events.length) {
    return <StateCard label={emptyLabel} />;
  }
  return (
    <div className="consumerProblemList">
      {events.map((event) => (
        <article className="consumerEventRow" key={`${event.type}:${event.source}:${event.problemId}`}>
          <span>{event.source === "atcoder" ? "At" : event.type === "favorite" ? "收" : "题"}</span>
          <div><strong>{event.title || event.problemId}</strong><small>{event.source || "gesp"} · {event.type}</small></div>
          <em>{event.type === "review" ? "复习" : event.type === "favorite" ? "收藏" : "查看"}</em>
        </article>
      ))}
    </div>
  );
}

function ProblemListRow({ index, onOpen, problem }: { index: number; onOpen?: (problemId: string) => void | Promise<void>; problem: MobileProblemListItem }) {
  return (
    <button className="consumerProblemRow" onClick={() => void onOpen?.(problem.id)} type="button">
      <span>{String(index).padStart(2, "0")}</span>
      <div><strong>{problem.title}</strong><small>{problem.subtitle} · {problem.problem_type}</small></div>
      <em className={problem.has_code ? "good" : "weak"}>{problem.has_code ? "76%" : "新"}</em>
    </button>
  );
}

function StateCard({ actionLabel, label, onAction }: { actionLabel?: string; label: string; onAction?: () => void }) {
  return (
    <section className="consumerStateCard">
      <p>{label}</p>
      {actionLabel && onAction ? <button onClick={onAction} type="button">{actionLabel}</button> : null}
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <TopBar title="GESP 练习" subtitle="正在加载" />
      <section className="consumerSkeletonCard"><span /><span /><span /></section>
      <section className="consumerSkeletonCard short"><span /><span /><span /></section>
    </>
  );
}

function fallbackTaskFromProblem(problem: ConsumerProblem | null, kind: LearningTask["kind"], ctaLabel: string): LearningTask | null {
  if (!problem) {
    return null;
  }
  return {
    id: `${kind}:${problem.source}:${problem.id}`,
    kind,
    title: problem.title,
    subtitle: `${problem.level} · ${problem.domain} · ${problem.problem_type}`,
    problem_id: problem.id,
    source: problem.source,
    cta_label: ctaLabel,
    priority: 50
  };
}

function latestProgressTask(progress: MobileProgress | null): LearningTask | null {
  const event = (progress?.recent_events || progress?.viewed || [])[0];
  if (!event?.problemId) {
    return null;
  }
  return {
    id: `continue:${event.source || "gesp"}:${event.problemId}`,
    kind: "continue",
    title: event.title || event.problemId,
    subtitle: `${event.source || "gesp"} · ${event.type}`,
    problem_id: event.problemId,
    source: event.source || "gesp",
    cta_label: "继续",
    priority: 80
  };
}

function nextTaskFromCatalog(catalog: MobileGespCatalog | null, progress: MobileProgress | null): LearningTask | null {
  const skipped = new Set([
    ...(progress?.reviewed || []).map((event) => event.problemId),
    ...(progress?.recent_events || []).slice(0, 6).map((event) => event.problemId)
  ]);
  const problem = catalog?.problems.find((item) => !skipped.has(item.id)) || catalog?.problems[0];
  if (!problem) {
    return null;
  }
  return {
    id: `catalog-next:gesp:${problem.id}`,
    kind: "featured",
    title: problem.title,
    subtitle: `${problem.level} · ${problem.domain} · ${problem.problem_type}`,
    problem_id: problem.id,
    source: "gesp",
    cta_label: "开始复习",
    priority: 85
  };
}

function weakPointsFromDomains(domains: Domain[]): WeakPoint[] {
  return domains
    .filter((domain) => domain.tone !== "good")
    .slice(0, 5)
    .map((domain) => ({
      id: domain.id,
      name: domain.name,
      description: domain.description,
      count: domain.count,
      progress: domain.progress,
      suggested_count: domain.progress < 45 ? 2 : 1,
      tone: domain.tone
    }));
}

function progressCounts(progress: MobileProgress | null, content: ConsumerMobileContent) {
  if (progress?.counts) {
    return progress.counts;
  }
  if (content.progress_summary?.counts) {
    return content.progress_summary.counts;
  }
  return {
    viewed: progress?.viewed_count ?? content.learning.viewed_count,
    favorite: progress?.favorite_count ?? 0,
    reviewed: progress?.reviewed_count ?? content.learning.reviewed_count,
    weekly_actions: progress?.weekly_action_count ?? summarizeLearningProgress(progress).weeklyActionCount
  };
}

function emptyReviewPlan(): ReviewPlan {
  return {
    generated_at: new Date().toISOString(),
    status: "empty",
    basis: [],
    items: []
  };
}

async function resetGespCatalog(loadGespCatalog: ConsumerRenderState["loadGespCatalog"], level: number) {
  resetCatalogChipScroll();
  await loadGespCatalog({ level });
  resetCatalogChipScroll();
  window.requestAnimationFrame(resetCatalogChipScroll);
  window.setTimeout(resetCatalogChipScroll, 120);
}

function resetCatalogChipScroll() {
  document.querySelectorAll<HTMLElement>(".consumerChipRow").forEach((row) => {
    row.scrollLeft = 0;
  });
}

function profileHeroCopy(progress: MobileProgress | null, reviewPlan: ReviewPlan) {
  const weeklyActions = progress?.counts?.weekly_actions ?? progress?.weekly_action_count ?? 0;
  const favoriteCount = progress?.counts?.favorite ?? progress?.favorite_count ?? 0;
  const weakPoint = progress?.weak_points?.[0]?.name;
  if (weeklyActions > 0) {
    return {
      title: `本周完成 ${weeklyActions} 次练习`,
      description: weakPoint
        ? `收藏 ${favoriteCount} 题，下一步优先巩固「${weakPoint}」。`
        : `收藏 ${favoriteCount} 题，复习计划中有 ${reviewPlan.items.length} 个入口。`
    };
  }
  if (reviewPlan.items.length) {
    return {
      title: `今日待复习 ${reviewPlan.items.length} 项`,
      description: "系统会根据浏览、收藏和弱项自动更新学习档案。"
    };
  }
  return {
    title: "先完成一次练习",
    description: "浏览、收藏和复习记录会自动沉淀为你的学习档案。"
  };
}

function solutionThinking(problem: ConsumerProblem) {
  const blocked = /(来源|证据|核对|公开|OJ|复核|可信|分类|收录|参考当前样例|AI|验证)/;
  const steps = problem.steps
    .map((step) => step.trim())
    .filter((step) => step && !blocked.test(step))
    .slice(0, 3);
  if (steps.length) {
    return steps;
  }
  const type = problem.problem_type || "题型";
  if (problem.algorithm) {
    return [`识别为${type}，先把输入条件转成变量。`, `使用${problem.algorithm}处理核心关系。`, "用样例回代检查边界和输出格式。"];
  }
  return [`识别为${type}，先读清输入和目标。`, "把题目条件拆成可计算的判定或公式。", "用样例验证推导，再整理成代码步骤。"];
}

function solutionHint(index: number, problem: ConsumerProblem) {
  if (index === 0) {
    return `知识点：${problem.knowledge_points.slice(0, 2).join("、") || problem.domain}`;
  }
  if (index === 1) {
    return problem.complexity || "把推导过程转成可复用模板。";
  }
  return "最后检查样例、边界和输出格式。";
}

function plainStatement(problem: ConsumerProblem) {
  const source = problem.statement_sections[0]?.markdown || problem.statement || "后端暂未收录完整题面。";
  const cleanedLines = source
    .split(/\r?\n/)
    .map((line) => line
      .replace(/\[[^\]]+\]\([^)]+\)/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/<https?:\/\/[^>]+>/g, "")
      .replace(/[#*_`>-]/g, "")
      .trim())
    .filter((line) => {
      if (!line) {
        return false;
      }
      if (/^(输入|输出|样例|题目描述|参考|来源|对应的选择)/.test(line)) {
        return false;
      }
      if (line.includes("<") || line.includes(">")) {
        return false;
      }
      return !/^[-+]?\d+(\s+[-+]?\d+)*$/.test(line);
    });
  const readable = cleanedLines.find((line) => /[\u4e00-\u9fa5]/.test(line) && line.length >= 12) || cleanedLines[0];
  return readable || `${problem.domain}下的${problem.problem_type}，先确认输入条件，再完成核心推导。`;
}

function problemListKey(problem: MobileProblemListItem) {
  return `${problem.id}:${problem.domain}:${problem.problem_type}`;
}

function summarizeLearningProgress(progress: MobileProgress | null) {
  const progressPct = progress?.progress_pct ?? 0;
  const weeklyActionCount = (progress?.weekly_viewed_count ?? 0) + (progress?.weekly_favorite_count ?? 0) + (progress?.weekly_reviewed_count ?? 0);
  return { progressPct, weeklyActionCount };
}
