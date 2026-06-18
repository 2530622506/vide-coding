import { App as AntApp, ConfigProvider, theme } from "antd";
import { useEffect, useMemo, useState } from "react";
import { WorkbenchLayout } from "./layout/WorkbenchLayout";
import {
  AtCoderCatalogPage,
  AtCoderMaintenancePage,
  AtCoderProblemDetailPage
} from "./pages/AtCoderCatalogPage";
import {
  ExerciseBuilderPage,
  GespProblemMaintenancePage,
  GespProblemPracticePage,
  GespWorkbenchPage,
  KnowledgeCoveragePage,
  SourceEvidencePage
} from "./pages/gesp/GespPages";
import { ProblemIdePage } from "./pages/ProblemIdePage";

export default function App() {
  const [routePath, setRoutePath] = useState(() => window.location.pathname);

  useEffect(() => {
    const syncRoute = () => setRoutePath(window.location.pathname);
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const router = useMemo(() => createRouter(routePath), [routePath]);

  function navigateTo(path: string) {
    window.history.pushState(null, "", path);
    setRoutePath(path);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  const openGespIde = (problemId: string) => navigateTo(`/ide/${encodeURIComponent(problemId)}`);
  const openAtCoderIde = (problemId: string) => navigateTo(`/ide/atcoder/${encodeURIComponent(problemId)}`);

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
        {router.kind === "ide" ? (
          <ProblemIdePage
            onBack={() => navigateTo(router.source === "atcoder" ? "/atcoder" : "/")}
            problemId={router.problemId}
            source={router.source}
          />
        ) : (
          <WorkbenchLayout routePath={routePath} onNavigate={navigateTo}>
            {router.kind === "atcoder-detail" ? (
              <AtCoderProblemDetailPage navigateTo={navigateTo} onOpenIde={openAtCoderIde} problemId={router.problemId} />
            ) : router.kind === "gesp-detail" ? (
              <GespProblemPracticePage navigateTo={navigateTo} onOpenIde={openGespIde} problemId={router.problemId} />
            ) : router.kind === "atcoder-maintenance" ? (
              <AtCoderMaintenancePage navigateTo={navigateTo} onOpenIde={openAtCoderIde} />
            ) : router.kind === "atcoder" ? (
              <AtCoderCatalogPage navigateTo={navigateTo} onOpenIde={openAtCoderIde} />
            ) : router.kind === "exercise-builder" ? (
              <ExerciseBuilderPage navigateTo={navigateTo} />
            ) : router.kind === "coverage" ? (
              <KnowledgeCoveragePage navigateTo={navigateTo} />
            ) : router.kind === "sources" ? (
              <SourceEvidencePage navigateTo={navigateTo} />
            ) : router.kind === "maintenance" ? (
              <GespProblemMaintenancePage navigateTo={navigateTo} />
            ) : (
              <GespWorkbenchPage navigateTo={navigateTo} onOpenIde={openGespIde} />
            )}
          </WorkbenchLayout>
        )}
      </AntApp>
    </ConfigProvider>
  );
}

type RouteState =
  | { kind: "ide"; problemId: string; source: "gesp" | "atcoder" }
  | { kind: "atcoder-detail"; problemId: string }
  | { kind: "gesp-detail"; problemId: string }
  | { kind: "atcoder-maintenance" }
  | { kind: "atcoder" }
  | { kind: "exercise-builder" }
  | { kind: "coverage" }
  | { kind: "sources" }
  | { kind: "maintenance" }
  | { kind: "workbench" };

function createRouter(routePath: string): RouteState {
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
  if (routePath.startsWith("/exercise-builder")) {
    return { kind: "exercise-builder" };
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
