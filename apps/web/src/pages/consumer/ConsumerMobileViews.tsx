import type { CSSProperties } from "react";
import { ArrowRight, BarChart3, BookOpen, Code2, Database, FileSearch, Link2, RefreshCw, Search, Star, Trophy } from "lucide-react";
import { ConsumerCodeBlock } from "./ConsumerCodeBlock";
import type { AtCoderTrack, ConsumerMobileContent, ConsumerProblem, ConsumerView, Domain, LevelSummary } from "./ConsumerMobileData";

type ConsumerRenderState = {
  content: ConsumerMobileContent | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
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
      return <CatalogView content={content} setView={setView} />;
    case "atcoder":
      return <AtCoderView content={content} />;
    case "problem":
      return <ProblemView problem={content.gesp.featured_problem} setView={setView} />;
    case "code":
      return <CodeView problem={content.gesp.featured_problem} />;
    case "evidence":
      return <EvidenceView problem={content.gesp.featured_problem} />;
    case "progress":
      return <ProgressView content={content} />;
    case "profile":
      return <ProfileView content={content} progressStyle={profileProgressStyle} />;
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

function CatalogView({ content, setView }: { content: ConsumerMobileContent; setView: (view: ConsumerView) => void }) {
  return (
    <>
      <div className="consumerSearch"><Search size={17} /><span>搜索题名、知识点、来源</span></div>
      <div className="consumerSegment"><span className="active">GESP</span><span>全等级</span><span>题型</span></div>
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>等级目录</h2>
          <span>{content.gesp.levels.length} 级</span>
        </div>
        <div className="consumerLevelGrid">
          {content.gesp.levels.map((level) => <LevelChip key={level.level} level={level} />)}
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
      <DomainList domains={content.gesp.domains} title="算法范畴" />
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>题型分布</h2>
          <span>{content.gesp.problem_types.length} 类</span>
        </div>
        {content.gesp.problem_types.map((type) => (
          <button className="consumerProblemRow" key={type.id} onClick={() => setView("problem")} type="button">
            <span className="consumerBadge">{type.count}</span>
            <span>
              <strong>{type.name}</strong>
              <small>{type.level} · {type.source} · {type.description}</small>
            </span>
            <em>{type.progress}%</em>
          </button>
        ))}
      </section>
    </>
  );
}

function AtCoderView({ content }: { content: ConsumerMobileContent }) {
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
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>难度轨道</h2>
          <span>AtCoder</span>
        </div>
        {content.atcoder.tracks.map((track) => <AtCoderTrackRow key={track.difficulty} track={track} />)}
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

function ProblemView({ problem, setView }: { problem: ConsumerProblem | null; setView: (view: ConsumerView) => void }) {
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
        <button className="consumerSecondaryButton" type="button"><Star size={17} />加入收藏夹</button>
      </section>
    </>
  );
}

function CodeView({ problem }: { problem: ConsumerProblem | null }) {
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
          <button type="button"><Star size={16} />收藏</button>
          <button type="button"><FileSearch size={16} />反馈错误</button>
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

function ProgressView({ content }: { content: ConsumerMobileContent }) {
  return (
    <>
      <DomainList domains={content.gesp.domains} title="知识点掌握度" />
      <section className="consumerCard">
        <h2>本周复盘</h2>
        <div className="consumerMetricGrid">
          <div><strong>{content.learning.viewed_count}</strong><span>后端题目</span></div>
          <div><strong>{content.learning.saved_code_count}</strong><span>可复习题型</span></div>
          <div><strong>{content.learning.reviewed_count}</strong><span>高可信题型</span></div>
        </div>
      </section>
      <section className="consumerCard">
        <h2>下一步建议</h2>
        <p>{content.learning.recommendation}</p>
      </section>
    </>
  );
}

function ProfileView({ content, progressStyle }: { content: ConsumerMobileContent; progressStyle: CSSProperties }) {
  const featured = content.gesp.featured_problem;
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
        {featured ? (
          <>
            <div className="consumerSavedRow"><span>题</span><div><strong>{featured.title}</strong><small>{featured.problem_type}</small></div><em>{featured.answer_status}</em></div>
            <div className="consumerSavedRow"><span>码</span><div><strong>{featured.code_filename}</strong><small>{featured.code ? "后端已返回代码" : "暂无代码"}</small></div><em>只读</em></div>
          </>
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

function DomainList({ domains, title }: { domains: Domain[]; title: string }) {
  return (
    <section className="consumerCard">
      <h2>{title}</h2>
      <div className="consumerDomainList">
        {domains.slice(0, 5).map((domain) => <DomainRow domain={domain} key={domain.id} />)}
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

function LevelChip({ level }: { level: LevelSummary }) {
  return (
    <article className={`consumerLevelChip ${level.tone}`}>
      <strong>{level.label}</strong>
      <span>{level.count} 题</span>
      <small>{level.title}</small>
    </article>
  );
}

function DomainRow({ domain }: { domain: Domain }) {
  return (
    <div className="consumerDomainRow">
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

function AtCoderTrackRow({ track }: { track: AtCoderTrack }) {
  return (
    <article className="consumerAtCoderRow">
      <span>{track.difficulty}</span>
      <div>
        <strong>{track.name}</strong>
        <small>{track.description}</small>
        <div className="consumerTagRow">
          {track.tags.map((tag) => <em className="consumerTag info" key={tag}>{tag}</em>)}
        </div>
      </div>
      <b>{track.count}</b>
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
