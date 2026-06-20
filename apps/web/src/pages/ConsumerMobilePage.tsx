import { BarChart3, BookOpen, Home, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ConsumerView, LearningRecordFilter } from "./consumer/ConsumerMobileData";
import { renderConsumerView } from "./consumer/ConsumerMobileViews";
import { useConsumerMobileContent } from "./consumer/useConsumerMobileContent";
import "./ConsumerMobileGlobal.css";
import "./ConsumerMobilePage.css";

export function ConsumerMobilePage() {
  const [view, setView] = useState<ConsumerView>(() => readInitialConsumerView());
  const [learningRecordFilter, setLearningRecordFilter] = useState<LearningRecordFilter>("all");
  const [learningRecordReturnView, setLearningRecordReturnView] = useState<"progress" | "profile">("progress");
  const contentState = useConsumerMobileContent(view);
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
        <section className="consumerContent">{renderConsumerView(view, setView, contentState, progressStyle, profileProgressStyle, learningRecordFilter, setLearningRecordFilter, learningRecordReturnView, setLearningRecordReturnView)}</section>
        <ConsumerBottomNav view={view} setView={setView} />
      </section>
    </main>
  );
}

function readInitialConsumerView(): ConsumerView {
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "catalog"
    || view === "atcoder"
    || view === "problem"
    || view === "code"
    || view === "progress"
    || view === "profile"
    || view === "search"
    || view === "favorites"
    || view === "settings"
    || view === "weak-points"
    || view === "learning-records"
    ? view
    : "home";
}

function ConsumerBottomNav({ setView, view }: { setView: (view: ConsumerView) => void; view: ConsumerView }) {
  const isCatalogActive = view === "catalog" || view === "atcoder" || view === "problem" || view === "code";
  const isProgressActive = view === "progress" || view === "weak-points" || view === "learning-records";
  const isProfileActive = view === "profile" || view === "favorites" || view === "settings";

  return (
    <nav className="consumerBottomNav" aria-label="C 端主导航">
      <button className={view === "home" ? "active" : ""} onClick={() => setView("home")} type="button">
        <Home size={18} />首页
      </button>
      <button className={isCatalogActive ? "active" : ""} onClick={() => setView("catalog")} type="button">
        <BookOpen size={18} />题库
      </button>
      <button className={isProgressActive ? "active" : ""} onClick={() => setView("progress")} type="button">
        <BarChart3 size={18} />进度
      </button>
      <button className={isProfileActive ? "active" : ""} onClick={() => setView("profile")} type="button">
        <UserRound size={18} />我的
      </button>
    </nav>
  );
}
