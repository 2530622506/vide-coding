import type { CSSProperties } from "react";
import { ArrowRight, BarChart3, BookOpen, Code2, Database, FileSearch, Link2, Search, Star, Trophy } from "lucide-react";
import { ConsumerCodeBlock } from "./ConsumerCodeBlock";
import {
  atCoderTracks,
  consumerDomains,
  consumerLevels,
  consumerProblemTypes,
  finiteDecimalCode,
  type AtCoderTrack,
  type ConsumerView,
  type Domain,
  type LevelSummary
} from "./ConsumerMobileData";

export function renderConsumerView(
  view: ConsumerView,
  setView: (view: ConsumerView) => void,
  progressStyle: CSSProperties,
  profileProgressStyle: CSSProperties
) {
  switch (view) {
    case "catalog":
      return <CatalogView setView={setView} />;
    case "atcoder":
      return <AtCoderView />;
    case "problem":
      return <ProblemView setView={setView} />;
    case "code":
      return <CodeView />;
    case "evidence":
      return <EvidenceView />;
    case "progress":
      return <ProgressView />;
    case "profile":
      return <ProfileView progressStyle={profileProgressStyle} />;
    default:
      return <HomeView progressStyle={progressStyle} setView={setView} />;
  }
}

function HomeView({ progressStyle, setView }: { progressStyle: CSSProperties; setView: (view: ConsumerView) => void }) {
  return (
    <>
      <section className="consumerCard consumerCardTint consumerProgressCard">
        <div>
          <h2>本周学习进度</h2>
          <p>已查看 18 道 GESP 题，收藏 6 段参考代码；AtCoder 练习入口已并入移动端。</p>
          <div className="consumerTagRow">
            <span className="consumerTag good">继续学习</span>
            <span className="consumerTag info">预计 24 分钟</span>
          </div>
        </div>
        <div className="consumerRing" style={progressStyle}><span>72%</span></div>
      </section>
      <section className="consumerLibraryGrid" aria-label="题库入口">
        <button className="consumerLibraryCard active" onClick={() => setView("catalog")} type="button">
          <BookOpen size={20} />
          <span>GESP 全等级</span>
          <strong>345 题</strong>
          <small>一级到八级 · 官方等级链路</small>
        </button>
        <button className="consumerLibraryCard" onClick={() => setView("atcoder")} type="button">
          <Trophy size={20} />
          <span>AtCoder 题库</span>
          <strong>240 题</strong>
          <small>A-B / C / D / E+ · 算法标签</small>
        </button>
      </section>
      <section className="consumerCard">
        <h2>推荐路径</h2>
        <p>先完成 GESP 五级数论，再用 AtCoder C 难度补二分、前缀和和贪心。</p>
        <button className="consumerPrimaryButton" onClick={() => setView("catalog")} type="button">
          <BookOpen size={17} />继续查看
        </button>
      </section>
      <LevelOverview />
      <DomainList title="知识点覆盖" />
      <section className="consumerCard">
        <h2>最近查看</h2>
        <p><strong>有限小数判断</strong><br />选择题 · 质因数 · 官方证据已确认</p>
        <div className="consumerPillRow">
          <button className="active" onClick={() => setView("problem")} type="button">题目详情</button>
          <button onClick={() => setView("code")} type="button">参考代码</button>
        </div>
      </section>
    </>
  );
}

function CatalogView({ setView }: { setView: (view: ConsumerView) => void }) {
  return (
    <>
      <div className="consumerSearch"><Search size={17} /><span>搜索题名、知识点、来源</span></div>
      <div className="consumerSegment"><span className="active">GESP</span><span>全等级</span><span>题型</span></div>
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>等级目录</h2>
          <span>1-8 级</span>
        </div>
        <div className="consumerLevelGrid">
          {consumerLevels.map((level) => <LevelChip key={level.level} level={level} />)}
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
      <DomainList title="算法范畴" />
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>题型分布</h2>
          <span>{consumerProblemTypes.length} 类</span>
        </div>
        {consumerProblemTypes.map((type) => (
          <button className="consumerProblemRow" key={type.name} onClick={() => setView("problem")} type="button">
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

function AtCoderView() {
  return (
    <>
      <div className="consumerSearch"><Search size={17} /><span>搜索 AtCoder 题号、算法标签、难度</span></div>
      <section className="consumerCard consumerAtCoderHero">
        <Database size={22} />
        <h2>独立题库，不套 GESP 等级</h2>
        <p>AtCoder 题目按 A-B / C / D / E+ 难度、算法范畴、样例完整度和参考解状态展示。</p>
        <div className="consumerMetricGrid">
          <div><strong>240</strong><span>题目</span></div>
          <div><strong>89</strong><span>标签</span></div>
          <div><strong>126</strong><span>中文题面</span></div>
        </div>
      </section>
      <section className="consumerCard">
        <div className="consumerSectionHead">
          <h2>难度轨道</h2>
          <span>AtCoder</span>
        </div>
        {atCoderTracks.map((track) => <AtCoderTrackRow key={track.name} track={track} />)}
      </section>
      <section className="consumerCard">
        <h2>推荐衔接</h2>
        <p>GESP 五级学完二分和数论后，优先看 AtCoder C 的 binary search、greedy、prefix sum；六级以后再进入 DP / graph。</p>
      </section>
    </>
  );
}

function ProblemView({ setView }: { setView: (view: ConsumerView) => void }) {
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
        <h2>题目概要</h2>
        <p>判断一个分数能否化为有限小数。核心思路是分母约分后只含质因数 2 和 5。</p>
      </section>
      <section className="consumerCard">
        <h2>标签与可信度</h2>
        <div className="consumerTagRow">
          <span className="consumerTag good">官方等级：五级</span>
          <span className="consumerTag good">质因数</span>
          <span className="consumerTag info">可信度 0.92</span>
        </div>
      </section>
      <section className="consumerCard">
        <h2>解题要点</h2>
        <ol className="consumerSteps">
          <li>先用 gcd 对分子分母约分。</li>
          <li>不断除去分母中的 2 和 5。</li>
          <li>剩余为 1 时可以写成有限小数。</li>
        </ol>
      </section>
      <section className="consumerCard consumerCardTint">
        <h2>学习动作</h2>
        <button className="consumerPrimaryButton" onClick={() => setView("code")} type="button"><Code2 size={17} />查看参考代码</button>
        <button className="consumerSecondaryButton" type="button"><Star size={17} />加入收藏夹</button>
      </section>
    </>
  );
}

function CodeView() {
  return (
    <>
      <section className="consumerCard">
        <div className="consumerPillRow">
          <button className="active" type="button">C++17</button>
          <button type="button">思路</button>
          <button type="button">复杂度</button>
        </div>
      </section>
      <ConsumerCodeBlock code={finiteDecimalCode} filename="finite_decimal.cpp" />
      <section className="consumerCard">
        <h2>行级讲解</h2>
        <p>第 9 行先约分，避免分母中保留可消去因子；第 11-12 行只移除 2 和 5。</p>
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

function EvidenceView() {
  return (
    <>
      <section className="consumerSourceList">
        <SourceItem index="1" label="官方真题 PDF" description="等级、题型和题号来源" tag="canonical" tone="good" />
        <SourceItem index="2" label="OJ 练习入口" description="用于练习跳转和样例核验" tag="mirror" tone="info" />
        <SourceItem index="3" label="题解文章" description="辅助理解，不覆盖官方结论" tag="aux" tone="weak" />
      </section>
      <section className="consumerCard">
        <h2>版权策略</h2>
        <p>未确认授权前，C 端只展示题目概要、短证据片段、来源链接和 hash，不默认转载完整题面。</p>
      </section>
      <section className="consumerCard">
        <h2>分类依据</h2>
        <div className="consumerTagRow">
          <span className="consumerTag good">官方五级</span>
          <span className="consumerTag good">质因数</span>
          <span className="consumerTag info">reviewed</span>
        </div>
      </section>
      <button className="consumerPrimaryButton" type="button"><Link2 size={17} />打开原始来源</button>
    </>
  );
}

function ProgressView() {
  return (
    <>
      <DomainList title="知识点掌握度" />
      <section className="consumerCard">
        <h2>本周复盘</h2>
        <div className="consumerMetricGrid">
          <div><strong>18</strong><span>查看题目</span></div>
          <div><strong>6</strong><span>代码收藏</span></div>
          <div><strong>9</strong><span>完成复盘</span></div>
        </div>
      </section>
      <section className="consumerCard">
        <h2>下一步建议</h2>
        <p>先看筛法模板题，再复盘高精度代码。每个弱项保留 2 道题和 1 段参考代码即可。</p>
      </section>
    </>
  );
}

function ProfileView({ progressStyle }: { progressStyle: CSSProperties }) {
  return (
    <>
      <section className="consumerCard consumerCardTint consumerProgressCard">
        <div>
          <h2>五级掌握度</h2>
          <p>本月查看 38 个条目，完成 9 个知识点复盘。</p>
        </div>
        <div className="consumerRing" style={progressStyle}><span>68%</span></div>
      </section>
      <section className="consumerCard">
        <h2>收藏夹</h2>
        <div className="consumerSavedRow"><span>码</span><div><strong>有限小数判断代码</strong><small>gcd + 分母因子剔除</small></div><em>已标注</em></div>
        <div className="consumerSavedRow"><span>题</span><div><strong>二分查找边界题</strong><small>lower_bound、闭区间</small></div><em>待复习</em></div>
      </section>
      <section className="consumerCard">
        <h2>弱项提醒</h2>
        <DomainRow domain={consumerDomains[2]} />
        <DomainRow domain={consumerDomains[3]} />
      </section>
      <button className="consumerPrimaryButton" type="button"><BarChart3 size={17} />生成复习清单</button>
    </>
  );
}

function DomainList({ title }: { title: string }) {
  return (
    <section className="consumerCard">
      <h2>{title}</h2>
      <div className="consumerDomainList">
        {consumerDomains.slice(0, 5).map((domain) => <DomainRow domain={domain} key={domain.name} />)}
      </div>
    </section>
  );
}

function LevelOverview() {
  return (
    <section className="consumerCard">
      <div className="consumerSectionHead">
        <h2>GESP 等级覆盖</h2>
        <span>345 题</span>
      </div>
      <div className="consumerLevelGrid">
        {consumerLevels.slice(0, 6).map((level) => <LevelChip key={level.level} level={level} />)}
      </div>
    </section>
  );
}

function LevelChip({ level }: { level: LevelSummary }) {
  return (
    <article className={`consumerLevelChip ${level.tone}`}>
      <strong>{level.level}</strong>
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

function SourceItem({ description, index, label, tag, tone }: { description: string; index: string; label: string; tag: string; tone: "good" | "info" | "weak" }) {
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
