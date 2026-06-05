import { Alert, App as AntApp, Button, Card, ConfigProvider, Flex, FloatButton, Input, Modal, Radio, Space, theme, Typography } from "antd";
import { AlertTriangle, Binary, ChevronDown, ChevronUp, Database, GitBranch, Layers3, ListChecks, Pencil, Plus, RefreshCw, Trophy, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { DomainPanel } from "./components/DomainPanel";
import { DomainNav } from "./components/DomainNav";
import { Metric } from "./components/Metric";
import { ProblemDetailPanel } from "./components/ProblemDetailPanel";
import { ProblemEditorModal } from "./components/ProblemEditorModal";
import { ReviewQueuePane } from "./components/ReviewQueuePane";
import { emptyEditorForm, formFromProblem, formToPayload } from "./editor";
import type { EditorMode, ProblemEditorForm } from "./editor";
import { AtCoderCatalogPage } from "./pages/AtCoderCatalogPage";
import type { LevelCatalog, LevelSummary, ProblemDetailResponse, ReviewActionResult, ReviewQueueItem, ReviewQueueResponse, ReviewQueueSummary } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const DETAIL_PANE_WIDTH_KEY = "gesp-detail-pane-width";
const DETAIL_PANE_DEFAULT_WIDTH = 360;
const DETAIL_PANE_MIN_WIDTH = 280;
const DETAIL_PANE_MAX_WIDTH = 720;

type WorkspaceStyle = CSSProperties & {
  "--detail-column-width"?: string;
};

type ReviewAction = "confirm" | "reject" | "merge_duplicate";

const reviewActionLabel: Record<ReviewAction, string> = {
  confirm: "确认",
  reject: "拒绝",
  merge_duplicate: "合并重复"
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function clampDetailColumnWidth(width: number) {
  if (typeof window === "undefined") {
    return Math.min(DETAIL_PANE_MAX_WIDTH, Math.max(DETAIL_PANE_MIN_WIDTH, width));
  }
  const viewportMax = Math.max(DETAIL_PANE_MIN_WIDTH, Math.min(DETAIL_PANE_MAX_WIDTH, window.innerWidth - 560));
  return Math.min(viewportMax, Math.max(DETAIL_PANE_MIN_WIDTH, width));
}

function readStoredDetailColumnWidth() {
  if (typeof window === "undefined") {
    return DETAIL_PANE_DEFAULT_WIDTH;
  }
  const stored = Number.parseInt(window.localStorage.getItem(DETAIL_PANE_WIDTH_KEY) || "", 10);
  if (Number.isFinite(stored)) {
    return clampDetailColumnWidth(stored);
  }
  return clampDetailColumnWidth(DETAIL_PANE_DEFAULT_WIDTH);
}

export default function App() {
  const [routePath, setRoutePath] = useState(() => window.location.pathname);

  useEffect(() => {
    const syncRoute = () => setRoutePath(window.location.pathname);
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  function navigateTo(path: string) {
    window.history.pushState(null, "", path);
    setRoutePath(path);
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 8,
          colorPrimary: "#188b8b",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
        }
      }}
    >
      <AntApp>
        {routePath.startsWith("/atcoder") ? (
          <AtCoderCatalogPage onBack={() => navigateTo("/")} />
        ) : (
          <GespCatalogPage onOpenAtCoder={() => navigateTo("/atcoder")} />
        )}
      </AntApp>
    </ConfigProvider>
  );
}

function GespCatalogPage({ onOpenAtCoder }: { onOpenAtCoder: () => void }) {
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(5);
  const [catalog, setCatalog] = useState<LevelCatalog | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewQueueSummary | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editorForm, setEditorForm] = useState<ProblemEditorForm>(() => emptyEditorForm(5));
  const [saving, setSaving] = useState(false);
  const [reviewActionBusyId, setReviewActionBusyId] = useState<string | null>(null);
  const [reviewActionMessage, setReviewActionMessage] = useState<string | null>(null);
  const [detailColumnWidth, setDetailColumnWidth] = useState(() => readStoredDetailColumnWidth());
  const [stickyControlsPinned, setStickyControlsPinned] = useState(false);
  const [stickyControlsExpanded, setStickyControlsExpanded] = useState(false);
  const [stickyControlsMotion, setStickyControlsMotion] = useState<"pinning" | "restoring" | null>(null);
  const stickyControlsSentinelRef = useRef<HTMLDivElement | null>(null);
  const stickyControlsPinnedRef = useRef(false);
  const stickyControlsMotionTimerRef = useRef<number | null>(null);
  const detailPaneRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const pendingSelectionRef = useRef<{ problemId: string; domainId?: string } | null>(null);

  const workspaceStyle = {
    "--detail-column-width": `${detailColumnWidth}px`
  } as WorkspaceStyle;

  const selectedLevelSummary = levels.find((level) => level.level === selectedLevel);
  const stickyControlsCollapsed = stickyControlsPinned && !stickyControlsExpanded;
  const stickyControlsClassName = [
    "stickyControls",
    stickyControlsPinned ? "isPinned" : "",
    stickyControlsCollapsed ? "isCollapsed" : "isExpanded",
    stickyControlsMotion === "pinning" ? "isPinning" : "",
    stickyControlsMotion === "restoring" ? "isRestoring" : ""
  ].filter(Boolean).join(" ");
  const shellClassName = [
    "shell",
    stickyControlsPinned ? "hasStickyControlsPinned" : "",
    stickyControlsCollapsed ? "hasStickyControlsCollapsed" : ""
  ].filter(Boolean).join(" ");

  useEffect(() => {
    void loadShell();
  }, []);

  useEffect(() => {
    void loadCatalogLevel(selectedLevel);
  }, [selectedLevel]);

  useEffect(() => {
    window.localStorage.setItem(DETAIL_PANE_WIDTH_KEY, String(detailColumnWidth));
  }, [detailColumnWidth]);

  useEffect(() => {
    stickyControlsPinnedRef.current = stickyControlsPinned;
  }, [stickyControlsPinned]);

  useEffect(() => {
    let frameId = 0;

    const applyPinnedState = (nextPinned: boolean) => {
      if (stickyControlsPinnedRef.current === nextPinned) {
        return;
      }
      const scrollTopBeforeChange = window.scrollY;
      stickyControlsPinnedRef.current = nextPinned;
      if (stickyControlsMotionTimerRef.current) {
        window.clearTimeout(stickyControlsMotionTimerRef.current);
      }
      flushSync(() => {
        setStickyControlsPinned(nextPinned);
        setStickyControlsMotion(nextPinned ? "pinning" : "restoring");
        if (!nextPinned) {
          setStickyControlsExpanded(false);
        }
      });
      window.scrollTo({ top: scrollTopBeforeChange, behavior: "instant" });
      stickyControlsMotionTimerRef.current = window.setTimeout(() => {
        stickyControlsMotionTimerRef.current = null;
        setStickyControlsMotion(null);
      }, 340);
    };

    const updatePinnedState = () => {
      const sentinel = stickyControlsSentinelRef.current;
      if (!sentinel) {
        return;
      }
      const pinStart = Math.max(0, sentinel.offsetTop - 8);
      const pinEnd = Math.max(0, pinStart - 48);
      if (window.scrollY <= pinEnd) {
        applyPinnedState(false);
        return;
      }
      applyPinnedState(stickyControlsPinnedRef.current || window.scrollY >= pinStart);
    };

    const schedulePinnedUpdate = () => {
      if (frameId) {
        return;
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updatePinnedState();
      });
    };

    updatePinnedState();
    window.addEventListener("scroll", schedulePinnedUpdate, { passive: true });
    window.addEventListener("resize", schedulePinnedUpdate);
    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (stickyControlsMotionTimerRef.current) {
        window.clearTimeout(stickyControlsMotionTimerRef.current);
      }
      window.removeEventListener("scroll", schedulePinnedUpdate);
      window.removeEventListener("resize", schedulePinnedUpdate);
    };
  }, []);

  async function loadShell() {
    return Promise.all([
      fetchJson<{ levels: LevelSummary[] }>("/catalog/levels"),
      fetchJson<ReviewQueueSummary>("/catalog/review-queue/summary"),
      fetchJson<ReviewQueueResponse>("/catalog/review-queue")
    ])
      .then(([levelResponse, reviewResponse, queueResponse]) => {
        setLevels(levelResponse.levels);
        setReviewSummary(reviewResponse);
        setReviewQueue(queueResponse.items);
      })
      .catch((currentError: unknown) => {
        setError(currentError instanceof Error ? currentError.message : "API 请求失败");
      });
  }

  async function loadCatalogLevel(level: number) {
    setLoading(true);
    setError(null);
    return fetchJson<LevelCatalog>(`/catalog/levels/${level}`)
      .then((nextCatalog) => {
        const pendingSelection = pendingSelectionRef.current;
        pendingSelectionRef.current = null;
        setCatalog(nextCatalog);
        setActiveDomainId(pendingSelection?.domainId || nextCatalog.domains[0]?.domain_id || null);
        if (pendingSelection) {
          openProblem(pendingSelection.problemId);
        } else {
          setSelectedProblemId(null);
          setSelectedProblem(null);
        }
      })
      .catch((currentError: unknown) => {
        setCatalog(null);
        setError(currentError instanceof Error ? currentError.message : "目录加载失败");
      })
      .finally(() => setLoading(false));
  }

  const activeDomain = useMemo(() => {
    if (!catalog) {
      return null;
    }
    return catalog.domains.find((domain) => domain.domain_id === activeDomainId) || catalog.domains[0] || null;
  }, [activeDomainId, catalog]);

  const visibleReviewItems = useMemo(() => {
    return reviewQueue
      .filter((item) => item.status === "open")
      .slice(0, 10);
  }, [reviewQueue]);

  function openProblem(problemId: string) {
    setSelectedProblemId(problemId);
    setDetailLoading(true);
    detailPaneRef.current?.parentElement?.scrollTo({ top: 0, behavior: "smooth" });
    detailPaneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    fetchJson<ProblemDetailResponse>(`/catalog/problems/${encodeURIComponent(problemId)}`)
      .then((problem) => {
        setSelectedProblem(problem);
        window.setTimeout(() => detailPaneRef.current?.scrollTo({ top: 0 }), 0);
      })
      .catch((currentError: unknown) => {
        setError(currentError instanceof Error ? currentError.message : "题目详情加载失败");
      })
      .finally(() => setDetailLoading(false));
  }

  function resizeDetailColumn(nextWidth: number) {
    setDetailColumnWidth(clampDetailColumnWidth(nextWidth));
  }

  function startDetailColumnResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!workspaceRef.current || window.innerWidth <= 1100) {
      return;
    }
    event.preventDefault();
    const workspace = workspaceRef.current;
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const rect = workspace.getBoundingClientRect();
      resizeDetailColumn(rect.right - moveEvent.clientX);
    };
    const handlePointerUp = () => {
      document.body.classList.remove("isResizingDetailPane");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    document.body.classList.add("isResizingDetailPane");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }

  function nudgeDetailColumnWidth(delta: number) {
    resizeDetailColumn(detailColumnWidth + delta);
  }

  function startCreate() {
    setEditorMode("create");
    setEditorForm(emptyEditorForm(selectedLevel));
  }

  function startEdit() {
    if (!selectedProblem) {
      setError("请先选择一道题目再修改");
      return;
    }
    setEditorMode("edit");
    setEditorForm(formFromProblem(selectedProblem));
  }

  async function saveEditor() {
    setSaving(true);
    setError(null);
    try {
      const payload = formToPayload(editorForm);
      const saved = editorMode === "edit" && selectedProblem
        ? await requestJson<ProblemDetailResponse>(`/catalog/problems/${encodeURIComponent(selectedProblem.id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        })
        : await requestJson<ProblemDetailResponse>("/catalog/problems", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      setEditorMode(null);
      setSelectedProblem(saved);
      setSelectedProblemId(saved.id);
      await loadShell();
      pendingSelectionRef.current = {
        problemId: saved.id,
        domainId: saved.resolved_algorithm_domains[0]?.value
      };
      if (saved.level !== selectedLevel) {
        setSelectedLevel(saved.level);
      } else {
        await loadCatalogLevel(saved.level);
      }
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function deleteSelectedProblem() {
    if (!selectedProblem) {
      setError("请先选择一道题目再删除");
      return;
    }
    Modal.confirm({
      title: `确认删除「${selectedProblem.title}」吗？`,
      content: "这个操作会从当前 MySQL 目录中移除题目、详情、答案和来源记录。",
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: async () => {
        setSaving(true);
        setError(null);
        try {
          await requestJson<{ deleted: boolean }>(`/catalog/problems/${encodeURIComponent(selectedProblem.id)}`, {
            method: "DELETE"
          });
          setSelectedProblem(null);
          setSelectedProblemId(null);
          setEditorMode(null);
          await loadShell();
          await loadCatalogLevel(selectedLevel);
        } catch (currentError) {
          setError(currentError instanceof Error ? currentError.message : "删除失败");
          throw currentError;
        } finally {
          setSaving(false);
        }
      }
    });
  }

  function applyReviewAction(item: ReviewQueueItem, action: ReviewAction) {
    let note = item.recommended_action || item.reason;
    Modal.confirm({
      title: `${reviewActionLabel[action]}复核项`,
      content: (
        <Space direction="vertical" size={8}>
          <Typography.Text>{item.title}</Typography.Text>
          <Input.TextArea defaultValue={note} onChange={(event) => { note = event.target.value; }} rows={4} />
        </Space>
      ),
      okText: reviewActionLabel[action],
      cancelText: "取消",
      onOk: () => submitReviewAction(item, action, note)
    });
  }

  async function submitReviewAction(item: ReviewQueueItem, action: ReviewAction, note: string) {
    setReviewActionBusyId(item.id);
    setReviewActionMessage(null);
    setError(null);
    try {
      const result = await requestJson<ReviewActionResult>(`/catalog/review-queue/${encodeURIComponent(item.id)}/actions`, {
        method: "POST",
        body: JSON.stringify({
          action,
          reviewer: "local-reviewer",
          note
        })
      });
      setReviewQueue((items) => items.map((current) => current.id === item.id ? result.item : current));
      setReviewActionMessage(`${reviewActionLabel[action]}：${item.title}`);
      await loadShell();
      await loadCatalogLevel(selectedLevel);
      if (item.canonical_problem_id && item.canonical_problem_id === selectedProblemId) {
        openProblem(item.canonical_problem_id);
      }
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "复核动作提交失败");
      throw currentError;
    } finally {
      setReviewActionBusyId(null);
    }
  }

  return (
      <main className={shellClassName}>
        <Flex className="topbar" align="center" justify="space-between" gap={24}>
          <div>
            <Typography.Text className="eyebrow"><Database size={16} /> C++ 官方真题分类数据</Typography.Text>
            <Typography.Title level={1}>GESP C++ 题型分类目录</Typography.Title>
          </div>
          <Space className="actionBar" size={8} wrap>
            <Button icon={<Trophy size={16} />} onClick={onOpenAtCoder}>AtCoder 题库</Button>
            <Button icon={<RefreshCw size={18} />} onClick={() => window.location.reload()} title="刷新目录" />
          </Space>
        </Flex>

        <div className="stickyControlsSentinel" ref={stickyControlsSentinelRef} />
        <section className={stickyControlsClassName} aria-label="目录操作、级别筛选和统计">
          <div className="stickyControlsTop">
            <Space className="actionBar" size={8} wrap>
              <Button icon={<Plus size={16} />} onClick={startCreate}>新增题目</Button>
              <Button disabled={!selectedProblem} icon={<Pencil size={16} />} onClick={startEdit}>修改当前</Button>
              <Button danger disabled={!selectedProblem || saving} icon={<Trash2 size={16} />} onClick={deleteSelectedProblem}>删除当前</Button>
            </Space>

            {stickyControlsPinned ? (
              <div className="stickyControlsSummary" aria-hidden={stickyControlsExpanded}>
                <span className="stickyLevelPill">
                  {selectedLevel} 级
                  <strong>{selectedLevelSummary?.problem_count ?? 0}</strong>
                </span>
                <span>题目 <strong>{catalog?.summary.problem_count ?? 0}</strong></span>
                <span>算法 <strong>{catalog?.domains.length ?? 0}</strong></span>
                <span>题型 <strong>{catalog?.summary.problem_type_count ?? 0}</strong></span>
                <span>知识点 <strong>{catalog?.summary.knowledge_point_count ?? 0}</strong></span>
                <span className="stickyReviewCount">复核 <strong>{reviewSummary?.summary.total_count ?? 0}</strong></span>
                {error ? <span className="stickyWarning">提示</span> : null}
              </div>
            ) : null}

            {stickyControlsPinned ? (
              <Button
                className="stickyControlsToggle"
                icon={stickyControlsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                onClick={() => setStickyControlsExpanded((expanded) => !expanded)}
                aria-expanded={stickyControlsExpanded}
              >
                {stickyControlsExpanded ? "收起" : "展开"}
              </Button>
            ) : null}
          </div>

          {!stickyControlsCollapsed ? (
            <div className="stickyControlsBody">
              <Radio.Group
                className="levelRail"
                onChange={(event) => setSelectedLevel(Number(event.target.value))}
                value={selectedLevel}
              >
                {levels.map((level) => (
                  <Radio.Button className="levelOptionButton" key={level.level} value={level.level}>
                    <span className="levelOption">
                      <span>{level.level} 级</span>
                      <strong>{level.problem_count}</strong>
                    </span>
                  </Radio.Button>
                ))}
              </Radio.Group>

              {error ? <Alert className="notice" icon={<AlertTriangle size={18} />} message={error} showIcon type="warning" /> : null}

              <section className="metricGrid">
                <Metric icon={<Layers3 size={18} />} label="题目" value={catalog?.summary.problem_count ?? 0} />
                <Metric icon={<GitBranch size={18} />} label="算法范畴" value={catalog?.domains.length ?? 0} />
                <Metric icon={<Binary size={18} />} label="题型" value={catalog?.summary.problem_type_count ?? 0} />
                <Metric icon={<ListChecks size={18} />} label="知识点" value={catalog?.summary.knowledge_point_count ?? 0} />
                <Metric icon={<AlertTriangle size={18} />} label="复核项" value={reviewSummary?.summary.total_count ?? 0} tone="warn" />
              </section>
            </div>
          ) : null}
        </section>

        <section className="workspace" ref={workspaceRef} style={workspaceStyle}>
          <DomainNav
            activeDomainId={activeDomain?.domain_id || null}
            domains={catalog?.domains || []}
            onSelect={setActiveDomainId}
          />

          <Card className="catalogPane" loading={loading}>
            {!loading && activeDomain ? <DomainPanel domain={activeDomain} selectedProblemId={selectedProblemId} onProblemSelect={openProblem} /> : null}
          </Card>

          <aside className="sidePane">
            <button
              aria-label="调整题目详情栏宽度"
              aria-orientation="vertical"
              aria-valuemax={DETAIL_PANE_MAX_WIDTH}
              aria-valuemin={DETAIL_PANE_MIN_WIDTH}
              aria-valuenow={detailColumnWidth}
              className="paneResizeHandle"
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  nudgeDetailColumnWidth(24);
                }
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  nudgeDetailColumnWidth(-24);
                }
              }}
              onPointerDown={startDetailColumnResize}
              role="separator"
              title="向左拖动扩大题目详情栏"
              type="button"
            />
            <Card className="detailPane" ref={detailPaneRef} size="small" title="题目详情">
              <ProblemDetailPanel
                loading={detailLoading}
                problem={selectedProblem}
                onClose={() => {
                  setSelectedProblemId(null);
                  setSelectedProblem(null);
                }}
              />
            </Card>

            <ReviewQueuePane
              busyId={reviewActionBusyId}
              items={visibleReviewItems}
              message={reviewActionMessage}
              onAction={applyReviewAction}
              summary={reviewSummary}
            />
          </aside>
        </section>
        <ProblemEditorModal
          form={editorForm}
          mode={editorMode}
          onCancel={() => setEditorMode(null)}
          onChange={setEditorForm}
          onSave={saveEditor}
          saving={saving}
        />
        <FloatButton.BackTop
          aria-label="回到顶部"
          className="backToTopButton"
          tooltip="回到顶部"
          visibilityHeight={360}
        />
      </main>
  );
}
