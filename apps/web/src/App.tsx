import { App as AntApp, ConfigProvider, FloatButton, theme } from "antd";
import { ArrowUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WorkbenchLayout } from "./layout/WorkbenchLayout";
import {
  AtCoderCatalogPage,
  AtCoderMaintenancePage,
  AtCoderProblemDetailPage
} from "./pages/AtCoderCatalogPage";
import type { Navigate, OpenIde, ProblemReturnContext } from "./navigation";
import {
  GespProblemMaintenancePage,
  GespProblemPracticePage,
  GespWorkbenchPage,
  KnowledgeCoveragePage,
  SourceEvidencePage
} from "./pages/gesp/GespPages";
import { ConsumerMobilePage } from "./pages/ConsumerMobilePage";
import { ProblemIdePage } from "./pages/ProblemIdePage";

const RETURN_CONTEXT_STORAGE_KEY = "practice-lab:return-context";
const RETURN_CONTEXT_MAX_AGE = 30 * 60 * 1000;

export default function App() {
  const [routePath, setRoutePath] = useState(() => window.location.pathname);
  const [pendingReturnContext, setPendingReturnContext] = useState<ProblemReturnContext | null>(null);

  useEffect(() => {
    const syncRoute = (event: PopStateEvent) => {
      const nextPath = window.location.pathname;
      const returnContext = readReturnContext(event.state) ?? readStoredReturnContext(nextPath);
      setRoutePath(nextPath);
      setPendingReturnContext(returnContext?.sourcePath === nextPath ? returnContext : null);
    };
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const router = useMemo(() => createRouter(routePath), [routePath]);

  const navigateTo: Navigate = (path, options = {}) => {
    setPendingReturnContext(null);
    if (options.returnContext) {
      storeReturnContext(options.returnContext);
    } else {
      clearStoredReturnContext();
    }
    if (options.returnContext?.sourcePath === window.location.pathname) {
      window.history.replaceState(createHistoryState(options.returnContext), "", window.location.pathname);
    }
    window.history.pushState(createHistoryState(options.returnContext), "", path);
    setRoutePath(path);
    if (options.scroll !== "preserve") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  function navigateBackToReturnContext(fallbackPath: string) {
    const returnContext = readReturnContext(window.history.state) ?? readStoredReturnContext(window.location.pathname);
    if (returnContext?.sourcePath) {
      setPendingReturnContext(returnContext);
      window.history.pushState(createHistoryState(returnContext), "", returnContext.sourcePath);
      setRoutePath(returnContext.sourcePath);
      return;
    }
    navigateTo(fallbackPath);
  }

  useEffect(() => {
    if (!pendingReturnContext || routePath !== pendingReturnContext.sourcePath) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 40;

    function restorePosition() {
      if (cancelled || !pendingReturnContext) {
        return;
      }
      const target = findProblemAnchor(pendingReturnContext.problemId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("returnAnchorFlash");
        window.setTimeout(() => target.classList.remove("returnAnchorFlash"), 1400);
        clearStoredReturnContext();
        setPendingReturnContext(null);
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        window.scrollTo({ top: pendingReturnContext.scrollY, behavior: "smooth" });
        clearStoredReturnContext();
        setPendingReturnContext(null);
        return;
      }
      window.setTimeout(restorePosition, 80);
    }

    window.setTimeout(restorePosition, 0);
    return () => {
      cancelled = true;
    };
  }, [pendingReturnContext, routePath]);

  const openGespIde: OpenIde = (problemId, returnContext) => {
    navigateTo(`/ide/${encodeURIComponent(problemId)}`, { returnContext: returnContext ?? readReturnContext(window.history.state) ?? readStoredReturnContext(window.location.pathname) ?? undefined });
  };
  const openAtCoderIde: OpenIde = (problemId, returnContext) => {
    navigateTo(`/ide/atcoder/${encodeURIComponent(problemId)}`, { returnContext: returnContext ?? readReturnContext(window.history.state) ?? readStoredReturnContext(window.location.pathname) ?? undefined });
  };
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 8,
          colorPrimary: "#167f7b",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
        }
      }}
    >
      <AntApp>
        {router.kind === "mobile" ? (
          <ConsumerMobilePage />
        ) : router.kind === "ide" ? (
          <ProblemIdePage
            onBack={() => navigateBackToReturnContext(router.source === "atcoder" ? "/atcoder" : "/")}
            problemId={router.problemId}
            source={router.source}
          />
        ) : (
          <WorkbenchLayout routePath={routePath} onNavigate={navigateTo}>
            {router.kind === "atcoder-detail" ? (
              <AtCoderProblemDetailPage navigateTo={navigateTo} onBack={() => navigateBackToReturnContext("/atcoder")} onOpenIde={openAtCoderIde} problemId={router.problemId} />
            ) : router.kind === "gesp-detail" ? (
              <GespProblemPracticePage navigateTo={navigateTo} onBack={() => navigateBackToReturnContext("/")} onOpenIde={openGespIde} problemId={router.problemId} />
            ) : router.kind === "atcoder-maintenance" ? (
              <AtCoderMaintenancePage navigateTo={navigateTo} onOpenIde={openAtCoderIde} />
            ) : router.kind === "atcoder" ? (
              <AtCoderCatalogPage navigateTo={navigateTo} onOpenIde={openAtCoderIde} returnContext={pendingReturnContext?.source === "atcoder" ? pendingReturnContext : null} />
            ) : router.kind === "coverage" ? (
              <KnowledgeCoveragePage navigateTo={navigateTo} />
            ) : router.kind === "sources" ? (
              <SourceEvidencePage navigateTo={navigateTo} />
            ) : router.kind === "maintenance" ? (
              <GespProblemMaintenancePage navigateTo={navigateTo} />
            ) : (
              <GespWorkbenchPage navigateTo={navigateTo} onOpenIde={openGespIde} returnContext={pendingReturnContext?.source === "gesp" ? pendingReturnContext : null} />
            )}
          </WorkbenchLayout>
        )}
        {router.kind === "mobile" ? null : (
          <FloatButton
            aria-label="回到顶部"
            className="globalBackTop"
            icon={<ArrowUp size={18} />}
            onClick={scrollToTop}
            tooltip="回到顶部"
          />
        )}
      </AntApp>
    </ConfigProvider>
  );
}

function createHistoryState(returnContext?: ProblemReturnContext) {
  return returnContext ? { returnContext } : null;
}

function readReturnContext(state: unknown): ProblemReturnContext | null {
  if (!state || typeof state !== "object" || !("returnContext" in state)) {
    return null;
  }
  const context = (state as { returnContext?: unknown }).returnContext;
  if (!context || typeof context !== "object") {
    return null;
  }
  const candidate = context as Partial<ProblemReturnContext>;
  if (
    (candidate.source !== "gesp" && candidate.source !== "atcoder") ||
    typeof candidate.sourcePath !== "string" ||
    typeof candidate.problemId !== "string" ||
    typeof candidate.scrollY !== "number"
  ) {
    return null;
  }
  return candidate as ProblemReturnContext;
}

function findProblemAnchor(problemId: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-problem-anchor]"))
    .find((element) => element.dataset.problemAnchor === problemId) || null;
}

function storeReturnContext(returnContext: ProblemReturnContext) {
  try {
    window.sessionStorage.setItem(RETURN_CONTEXT_STORAGE_KEY, JSON.stringify({
      createdAt: Date.now(),
      returnContext
    }));
  } catch {
    // Navigation still works through history.state when storage is unavailable.
  }
}

function readStoredReturnContext(routePath: string): ProblemReturnContext | null {
  try {
    const rawValue = window.sessionStorage.getItem(RETURN_CONTEXT_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue) as { createdAt?: unknown; returnContext?: unknown };
    if (typeof parsed.createdAt !== "number" || Date.now() - parsed.createdAt > RETURN_CONTEXT_MAX_AGE) {
      clearStoredReturnContext();
      return null;
    }
    const returnContext = readReturnContext({ returnContext: parsed.returnContext });
    if (!returnContext || !isReturnContextForRoute(returnContext, routePath)) {
      return null;
    }
    return returnContext;
  } catch {
    clearStoredReturnContext();
    return null;
  }
}

function clearStoredReturnContext() {
  try {
    window.sessionStorage.removeItem(RETURN_CONTEXT_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function isReturnContextForRoute(returnContext: ProblemReturnContext, routePath: string) {
  if (routePath === returnContext.sourcePath) {
    return true;
  }
  const routeProblem = getProblemRoute(routePath);
  return routeProblem?.source === returnContext.source && routeProblem.problemId === returnContext.problemId;
}

function getProblemRoute(routePath: string): { source: ProblemReturnContext["source"]; problemId: string } | null {
  const atCoderProblemPrefix = "/atcoder/problems/";
  const atCoderIdePrefix = "/ide/atcoder/";
  if (routePath.startsWith(atCoderProblemPrefix)) {
    return {
      source: "atcoder",
      problemId: decodeURIComponent(routePath.slice(atCoderProblemPrefix.length).split("/")[0] || "")
    };
  }
  if (routePath.startsWith(atCoderIdePrefix)) {
    return {
      source: "atcoder",
      problemId: decodeURIComponent(routePath.slice(atCoderIdePrefix.length).split("/")[0] || "")
    };
  }
  const gespProblemPrefix = "/gesp/problems/";
  if (routePath.startsWith(gespProblemPrefix)) {
    return {
      source: "gesp",
      problemId: decodeURIComponent(routePath.slice(gespProblemPrefix.length).split("/")[0] || "")
    };
  }
  const gespIdePrefix = "/ide/";
  if (routePath.startsWith(gespIdePrefix)) {
    return {
      source: "gesp",
      problemId: decodeURIComponent(routePath.slice(gespIdePrefix.length).split("/")[0] || "")
    };
  }
  return null;
}

type RouteState =
  | { kind: "ide"; problemId: string; source: "gesp" | "atcoder" }
  | { kind: "atcoder-detail"; problemId: string }
  | { kind: "gesp-detail"; problemId: string }
  | { kind: "atcoder-maintenance" }
  | { kind: "atcoder" }
  | { kind: "coverage" }
  | { kind: "sources" }
  | { kind: "maintenance" }
  | { kind: "mobile" }
  | { kind: "workbench" };

function createRouter(routePath: string): RouteState {
  if (routePath.startsWith("/mobile")) {
    return { kind: "mobile" };
  }
  const atCoderIdePrefix = "/ide/atcoder/";
  if (routePath.startsWith(atCoderIdePrefix)) {
    return {
      kind: "ide",
      problemId: decodeURIComponent(routePath.slice(atCoderIdePrefix.length).split("/")[0] || ""),
      source: "atcoder"
    };
  }
  if (routePath.startsWith("/ide/")) {
    return {
      kind: "ide",
      problemId: decodeURIComponent(routePath.slice("/ide/".length).split("/")[0] || ""),
      source: "gesp"
    };
  }
  if (routePath.startsWith("/atcoder/problems/")) {
    return {
      kind: "atcoder-detail",
      problemId: decodeURIComponent(routePath.slice("/atcoder/problems/".length).split("/")[0] || "")
    };
  }
  if (routePath.startsWith("/gesp/problems/")) {
    return {
      kind: "gesp-detail",
      problemId: decodeURIComponent(routePath.slice("/gesp/problems/".length).split("/")[0] || "")
    };
  }
  if (routePath.startsWith("/atcoder/maintenance")) {
    return { kind: "atcoder-maintenance" };
  }
  if (routePath.startsWith("/atcoder")) {
    return { kind: "atcoder" };
  }
  if (routePath.startsWith("/coverage")) {
    return { kind: "coverage" };
  }
  if (routePath.startsWith("/sources")) {
    return { kind: "sources" };
  }
  if (routePath.startsWith("/maintenance")) {
    return { kind: "maintenance" };
  }
  return { kind: "workbench" };
}
