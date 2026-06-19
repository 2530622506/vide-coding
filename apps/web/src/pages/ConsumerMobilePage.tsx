import { BarChart3, BookOpen, ChevronLeft, Home, Layers3, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { consumerHeaders, type ConsumerView } from "./consumer/ConsumerMobileData";
import { renderConsumerView } from "./consumer/ConsumerMobileViews";
import "./ConsumerMobilePage.css";

export function ConsumerMobilePage() {
  const [view, setView] = useState<ConsumerView>(() => readInitialConsumerView());
  const progressStyle = useMemo(() => ({ "--consumer-progress": "72%" }) as React.CSSProperties, []);
  const profileProgressStyle = useMemo(() => ({ "--consumer-progress": "68%" }) as React.CSSProperties, []);

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
        <header className="consumerStatus">
          <span>9:41</span>
          <span>GESP Learn</span>
          <span>{view === "catalog" ? "Wi-Fi" : "72%"}</span>
        </header>
        <ConsumerHeader view={view} setView={setView} />
        <section className="consumerContent">{renderConsumerView(view, setView, progressStyle, profileProgressStyle)}</section>
        <ConsumerBottomNav view={view} setView={setView} />
      </section>
    </main>
  );
}

function readInitialConsumerView(): ConsumerView {
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "catalog" || view === "atcoder" || view === "problem" || view === "code" || view === "evidence" || view === "progress" || view === "profile" ? view : "home";
}

function ConsumerHeader({ setView, view }: { setView: (view: ConsumerView) => void; view: ConsumerView }) {
  const { description, eyebrow, title } = consumerHeaders[view];
  const canGoBack = view === "problem" || view === "code" || view === "evidence";

  return (
    <section className="consumerHero">
      <div className="consumerEyebrow">
        {canGoBack ? (
          <button aria-label="返回题库" className="consumerBackButton" onClick={() => setView(view === "code" || view === "evidence" ? "problem" : "catalog")} type="button">
            <ChevronLeft size={17} />
          </button>
        ) : view === "catalog" ? (
          <Layers3 size={17} />
        ) : (
          <BookOpen size={17} />
        )}
        <span>{eyebrow}</span>
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

function ConsumerBottomNav({ setView, view }: { setView: (view: ConsumerView) => void; view: ConsumerView }) {
  const isCatalogActive = view === "catalog" || view === "atcoder" || view === "problem" || view === "code" || view === "evidence";

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
