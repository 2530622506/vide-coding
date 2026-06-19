import { BarChart3, BookOpen, ChevronLeft, Home, Layers3, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { consumerHeaders, type ConsumerMobileContent, type ConsumerProblem, type ConsumerView } from "./consumer/ConsumerMobileData";
import { renderConsumerView } from "./consumer/ConsumerMobileViews";
import { useConsumerMobileContent } from "./consumer/useConsumerMobileContent";
import "./ConsumerMobilePage.css";

export function ConsumerMobilePage() {
  const [view, setView] = useState<ConsumerView>(() => readInitialConsumerView());
  const contentState = useConsumerMobileContent();
  const progressStyle = useMemo(() => ({ "--consumer-progress": `${contentState.progress?.progress_pct ?? 0}%` }) as React.CSSProperties, [contentState.progress?.progress_pct]);
  const profileProgressStyle = useMemo(() => ({ "--consumer-progress": `${contentState.progress?.progress_pct ?? 0}%` }) as React.CSSProperties, [contentState.progress?.progress_pct]);

  useEffect(() => {
    const root = document.documentElement;
    const previousFontSize = root.style.fontSize;
    const applyMobileRootSize = () => {
      const viewportWidth = Math.min(window.innerWidth, 750);
      root.style.fontSize = `${viewportWidth / 10}px`;
    };

    applyMobileRootSize();
    window.addEventListener("resize", applyMobileRootSize);
    return () => {
      window.removeEventListener("resize", applyMobileRootSize);
      root.style.fontSize = previousFontSize;
    };
  }, []);

  return (
    <main className="consumerPage">
      <section className="consumerPhone" aria-label="GESP C 端移动页面">
        <ConsumerHeader content={contentState.content} selectedProblem={contentState.selectedProblem} view={view} setView={setView} />
        <section className="consumerContent">{renderConsumerView(view, setView, contentState, progressStyle, profileProgressStyle)}</section>
        <ConsumerBottomNav view={view} setView={setView} />
      </section>
    </main>
  );
}

function readInitialConsumerView(): ConsumerView {
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "catalog" || view === "atcoder" || view === "problem" || view === "code" || view === "progress" || view === "profile" ? view : "home";
}

function ConsumerHeader({
  content,
  selectedProblem,
  setView,
  view
}: {
  content: ConsumerMobileContent | null;
  selectedProblem: ConsumerProblem | null;
  setView: (view: ConsumerView) => void;
  view: ConsumerView;
}) {
  const { description, eyebrow, title } = getConsumerHeader(view, content, selectedProblem);
  const canGoBack = view === "problem" || view === "code";

  return (
    <section className="consumerHero">
      {eyebrow ? (
        <div className="consumerEyebrow">
          {canGoBack ? (
            <button aria-label="返回题库" className="consumerBackButton" onClick={() => setView(view === "code" ? "problem" : "catalog")} type="button">
              <ChevronLeft size={17} />
            </button>
          ) : view === "catalog" ? (
            <Layers3 size={17} />
          ) : (
            <BookOpen size={17} />
          )}
          <span>{eyebrow}</span>
        </div>
      ) : canGoBack ? (
        <button aria-label="返回题目" className="consumerBackButton consumerHeaderBackButton" onClick={() => setView("problem")} type="button">
            <ChevronLeft size={17} />
        </button>
      ) : null}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </section>
  );
}

function getConsumerHeader(view: ConsumerView, content: ConsumerMobileContent | null, selectedProblem: ConsumerProblem | null) {
  const featured = selectedProblem || content?.gesp.featured_problem;
  if (featured && view === "problem") {
    return {
      eyebrow: featured.subtitle,
      title: featured.title,
      description: `${featured.question_type} · ${featured.problem_type} · ${featured.domain}`
    };
  }
  if (featured && view === "code") {
    return {
      eyebrow: "",
      title: featured.title,
      description: ""
    };
  }
  if (content && view === "atcoder") {
    return {
      ...consumerHeaders.atcoder,
      description: `后端 AtCoder catalog 当前返回 ${content.atcoder.total_count} 题，按难度和算法标签组织。`
    };
  }
  return consumerHeaders[view];
}

function ConsumerBottomNav({ setView, view }: { setView: (view: ConsumerView) => void; view: ConsumerView }) {
  const isCatalogActive = view === "catalog" || view === "atcoder" || view === "problem" || view === "code";

  return (
    <nav className="consumerBottomNav" aria-label="C 端主导航">
      <button className={view === "home" ? "active" : ""} onClick={() => setView("home")} type="button">
        <Home size={18} />首页
      </button>
      <button className={isCatalogActive ? "active" : ""} onClick={() => setView("catalog")} type="button">
        <BookOpen size={18} />题库
      </button>
      <button className={view === "progress" ? "active" : ""} onClick={() => setView("progress")} type="button">
        <BarChart3 size={18} />进度
      </button>
      <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")} type="button">
        <UserRound size={18} />我的
      </button>
    </nav>
  );
}
