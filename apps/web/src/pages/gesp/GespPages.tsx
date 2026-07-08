import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Drawer,
  Empty,
  Flex,
  Input,
  Modal,
  Progress,
  Row,
  Segmented,
  Space,
  Statistic,
  Tag,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ProCard } from "@ant-design/pro-components";
import {
  ArrowRight,
  BookOpenCheck,
  Boxes,
  Code2,
  Database,
  ExternalLink,
  FileSearch,
  FileText,
  Filter,
  Layers3,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2
} from "lucide-react";
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterLevelCatalogByQuery } from "../../catalogSearch";
import { ProblemDetailPanel } from "../../components/ProblemDetailPanel";
import { ProblemEditorModal } from "../../components/ProblemEditorModal";
import { VirtualDataTable } from "../../components/VirtualDataTable";
import { emptyEditorForm, formFromProblem, formToPayload } from "../../editor";
import type { EditorMode, ProblemEditorForm } from "../../editor";
import type { Navigate, OpenIde, ProblemReturnContext } from "../../navigation";
import {
  createProblem,
  deleteProblem,
  fetchLevelCatalog,
  fetchLevels,
  fetchProblem,
  updateProblem
} from "../../services/catalog";
import type { DomainGroup, LevelCatalog, LevelSummary, ProblemDetailResponse, ProblemSummary, ProblemTypeGroup } from "../../types";

type FlatProblem = {
  key: string;
  level: number;
  domain: DomainGroup;
  problemType: ProblemTypeGroup;
  problem: ProblemSummary;
};

const questionTypeLabel: Record<string, string> = {
  selection: "选择",
  judgment: "判断",
  programming: "编程"
};

const SIDE_PANE_WIDTH_DEFAULT = 420;
const SIDE_PANE_WIDTH_MAX = 560;
const SIDE_PANE_WIDTH_MIN = 320;
const WORKSPACE_CENTER_MIN_WIDTH = 420;
const WORKSPACE_DOMAIN_WIDTH = 220;
const WORKSPACE_GAP = 14;

export function GespWorkbenchPage({ navigateTo, onOpenIde, returnContext }: { navigateTo: Navigate; onOpenIde: OpenIde; returnContext?: ProblemReturnContext | null }) {
  const catalogState = useGespCatalog(5, returnContext?.gesp);
  const {
    activeDomain,
    activeDomainId,
    catalog,
    error,
    flatProblems,
    loading,
    levels,
    searchQuery,
    selectedLevel,
    setActiveDomainId,
    setSearchQuery,
    setSelectedLevel,
    visibleCatalog
  } = catalogState;
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(returnContext?.problemId ?? null);
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sidePaneWidth, setSidePaneWidth] = useState(SIDE_PANE_WIDTH_DEFAULT);
  const workspaceRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const clampToWorkspace = () => {
      const maxWidth = getWorkspaceSidePaneMaxWidth(workspaceRef.current);
      setSidePaneWidth((currentWidth) => clampSidePaneWidth(currentWidth, maxWidth));
    };

    clampToWorkspace();
    window.addEventListener("resize", clampToWorkspace);
    return () => window.removeEventListener("resize", clampToWorkspace);
  }, []);

  useEffect(() => {
    if (returnContext?.problemId) {
      setSelectedProblemId(returnContext.problemId);
    }
  }, [returnContext?.problemId]);

  function createReturnContext(problemId: string): ProblemReturnContext {
    return {
      source: "gesp",
      sourcePath: "/",
      problemId,
      scrollY: window.scrollY,
      gesp: {
        activeDomainId,
        searchQuery,
        selectedLevel
      }
    };
  }

  function openDetailPage(problemId: string) {
    setSelectedProblemId(problemId);
    navigateTo(`/gesp/problems/${encodeURIComponent(problemId)}`, { returnContext: createReturnContext(problemId) });
  }

  function openIde(problemId: string) {
    setSelectedProblemId(problemId);
    onOpenIde(problemId, createReturnContext(problemId));
  }

  async function openProblem(problemId: string) {
    setSelectedProblemId(problemId);
    setDetailLoading(true);
    try {
      setSelectedProblem(await fetchProblem(problemId));
    } catch {
      setSelectedProblem(null);
    } finally {
      setDetailLoading(false);
    }
  }

  const featuredProblems = flatProblems.slice(0, 8);
  const workspaceStyle = {
    "--practice-side-width": `${sidePaneWidth}px`
  } as CSSProperties;

  function resizeSidePaneBy(delta: number) {
    const maxWidth = getWorkspaceSidePaneMaxWidth(workspaceRef.current);
    setSidePaneWidth((currentWidth) => clampSidePaneWidth(currentWidth + delta, maxWidth));
  }

  function handleResizeKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      resizeSidePaneBy(20);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      resizeSidePaneBy(-20);
    }
    if (event.key === "Home") {
      event.preventDefault();
      setSidePaneWidth(SIDE_PANE_WIDTH_MIN);
    }
    if (event.key === "End") {
      event.preventDefault();
      setSidePaneWidth(SIDE_PANE_WIDTH_MAX);
    }
  }

  function startSidePaneResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidePaneWidth;
    const maxWidth = getWorkspaceSidePaneMaxWidth(workspaceRef.current);

    document.body.classList.add("isResizingPracticeSidePane");

    function handlePointerMove(moveEvent: PointerEvent) {
      const nextWidth = startWidth + startX - moveEvent.clientX;
      setSidePaneWidth(clampSidePaneWidth(nextWidth, maxWidth));
    }

    function stopResize() {
      document.body.classList.remove("isResizingPracticeSidePane");
      window.removeEventListener("pointermove", handlePointerMove);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize, { once: true });
  }

  return (
    <main className="pageSurface">
      <PageHeading
        eyebrow="GESP C++"
        icon={<BookOpenCheck size={18} />}
        title="练习工作台"
        description="按等级、算法范畴、题型和知识点组织练习查看，维护内容与来源证据在同一套工作流中闭环。"
        actions={(
          <>
            <Button className="actionButton actionButton--source" icon={<FileSearch size={16} />} onClick={() => navigateTo("/sources")}>来源证据</Button>
            <Button className="actionButton actionButton--maintenance" icon={<Database size={16} />} onClick={() => navigateTo("/maintenance")}>题目维护</Button>
            <Button className="actionButton actionButton--detail" icon={<ArrowRight size={16} />} onClick={() => navigateTo("/atcoder")} type="primary">AtCoder 题库</Button>
          </>
        )}
      />

      <ControlBar
        levels={levels}
        loading={loading}
        searchQuery={searchQuery}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        onRefresh={() => catalogState.reload()}
        onSearchChange={setSearchQuery}
      />
      {error ? <Alert className="pageAlert" message={error} showIcon type="warning" /> : null}

      <section className="statGrid">
        <WorkbenchStat icon={<Boxes size={18} />} label="题目" value={visibleCatalog?.summary.problem_count ?? 0} />
        <WorkbenchStat icon={<Layers3 size={18} />} label="算法范畴" value={visibleCatalog?.domains.length ?? 0} />
        <WorkbenchStat icon={<BookOpenCheck size={18} />} label="题型" value={visibleCatalog?.summary.problem_type_count ?? 0} />
        <WorkbenchStat icon={<ShieldCheck size={18} />} label="知识点" value={visibleCatalog?.summary.knowledge_point_count ?? 0} />
      </section>

      <section className="practiceWorkspace" ref={workspaceRef} style={workspaceStyle}>
        <Card className="domainRail" title="算法范畴" loading={loading}>
          <Space direction="vertical" size={8}>
            {(visibleCatalog?.domains || []).map((domain) => (
              <button
                className={activeDomain?.domain_id === domain.domain_id ? "domainRailItem active" : "domainRailItem"}
                key={domain.domain_id}
                onClick={() => setActiveDomainId(domain.domain_id)}
                type="button"
              >
                <span>{domain.domain_label}</span>
                <strong>{domain.problem_count}</strong>
              </button>
            ))}
          </Space>
        </Card>

        <Card className="practiceListPane" loading={loading}>
          <Flex align="center" className="sectionTitleRow" justify="space-between" gap={12}>
            <div>
              <Typography.Text className="sectionEyebrow">练习地图</Typography.Text>
              <Typography.Title level={2}>{activeDomain?.domain_label || "题型列表"}</Typography.Title>
            </div>
          </Flex>
          {activeDomain ? (
            <Space className="typeColumn" direction="vertical" size={14}>
              {activeDomain.problem_types.map((type) => (
                <Card className="typePracticeCard" key={type.problem_type_id} size="small">
                  <Flex align="flex-start" justify="space-between" gap={12}>
                    <div>
                      <Typography.Text className="sectionEyebrow">{type.problem_type_id}</Typography.Text>
                      <Typography.Title level={3}>{type.problem_type_label}</Typography.Title>
                    </div>
                    <Tag color="blue">{type.problem_count} 题</Tag>
                  </Flex>
                  <Flex className="tagWrap" gap={6} wrap="wrap">
                    {type.knowledge_points.slice(0, 8).map((point) => <Tag key={point.id}>{point.label}</Tag>)}
                  </Flex>
                  <div className="problemCardGrid">
                    {type.problems.slice(0, 6).map((problem) => (
                      <ProblemPracticeCard
                        isSelected={selectedProblemId === problem.id}
                        key={`${type.problem_type_id}:${problem.id}`}
                        onOpenDetail={() => openDetailPage(problem.id)}
                        onOpenIde={problem.question_type === "programming" ? () => openIde(problem.id) : undefined}
                        onSelect={() => openProblem(problem.id)}
                        problem={problem}
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description={searchQuery ? "没有匹配的题目" : "暂无题目"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>

        <div className="practiceSidePaneWrap">
          <button
            aria-label="调整当前题目宽度"
            aria-orientation="vertical"
            aria-valuemax={SIDE_PANE_WIDTH_MAX}
            aria-valuemin={SIDE_PANE_WIDTH_MIN}
            aria-valuenow={sidePaneWidth}
            className="practiceSideResizeHandle"
            onDoubleClick={() => setSidePaneWidth(SIDE_PANE_WIDTH_DEFAULT)}
            onKeyDown={handleResizeKeyDown}
            onPointerDown={startSidePaneResize}
            role="separator"
            title="拖动调整当前题目宽度，双击恢复默认"
            type="button"
          />
          <Card className="practiceSidePane" title="当前题目" loading={detailLoading}>
            {selectedProblem ? (
              <ProblemDetailPanel
                loading={detailLoading}
                onClose={() => {
                  setSelectedProblem(null);
                  setSelectedProblemId(null);
                }}
                onOpenIde={(problemId) => openIde(problemId)}
                problem={selectedProblem}
              />
            ) : (
              <Space className="sideEmpty" direction="vertical" size={12}>
                <Empty description="从中间列表选择题目查看练习内容" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                {featuredProblems.length ? (
                  <Space className="recommendList" direction="vertical" size={8}>
                    <Typography.Text strong>推荐先看</Typography.Text>
                    {featuredProblems.slice(0, 3).map((entry) => (
                      <Button block className="recommendButton" key={entry.key} onClick={() => openProblem(entry.problem.id)}>
                        {entry.problem.title}
                      </Button>
                    ))}
                  </Space>
                ) : null}
              </Space>
            )}
          </Card>
        </div>
      </section>
    </main>
  );
}

function clampSidePaneWidth(width: number, maxWidth = SIDE_PANE_WIDTH_MAX) {
  return Math.min(maxWidth, Math.max(SIDE_PANE_WIDTH_MIN, Math.round(width)));
}

function getWorkspaceSidePaneMaxWidth(workspace: HTMLElement | null) {
  if (!workspace) {
    return SIDE_PANE_WIDTH_MAX;
  }

  const availableWidth = workspace.getBoundingClientRect().width;
  const maxWidth = availableWidth - WORKSPACE_DOMAIN_WIDTH - WORKSPACE_CENTER_MIN_WIDTH - WORKSPACE_GAP * 2;
  return Math.max(SIDE_PANE_WIDTH_MIN, Math.min(SIDE_PANE_WIDTH_MAX, Math.floor(maxWidth)));
}

export function GespProblemPracticePage({ problemId, navigateTo, onBack, onOpenIde }: { problemId: string; navigateTo: Navigate; onBack: () => void; onOpenIde: OpenIde }) {
  const [problem, setProblem] = useState<ProblemDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchProblem(problemId)
      .then(setProblem)
      .catch((currentError: unknown) => setError(currentError instanceof Error ? currentError.message : "题目加载失败"))
      .finally(() => setLoading(false));
  }, [problemId]);

  return (
    <main className="pageSurface">
      <PageHeading
        eyebrow="练习查看"
        icon={<FileText size={18} />}
        title={problem?.title || "题目详情"}
        description="题面、样例、知识讲解、参考解和来源信息集中展示，编程题可直接进入 IDE 练习。"
        actions={(
          <>
            <Button className="actionButton actionButton--back" onClick={onBack}>返回工作台</Button>
            {problem?.question_type === "programming" ? (
              <Button className="actionButton actionButton--ide" icon={<Code2 size={16} />} onClick={() => onOpenIde(problem.id)} type="primary">进入 IDE</Button>
            ) : null}
          </>
        )}
      />
      {error ? <Alert className="pageAlert" message={error} showIcon type="warning" /> : null}
      <Card className="detailPageCard" loading={loading}>
        <ProblemDetailPanel loading={loading} onClose={onBack} onOpenIde={onOpenIde} problem={problem} />
      </Card>
    </main>
  );
}

export function GespQuestionTypePage({
  navigateTo,
  questionType,
  returnContext
}: {
  navigateTo: Navigate;
  questionType: "selection" | "judgment";
  returnContext?: ProblemReturnContext | null;
}) {
  const catalogState = useGespCatalog(5, returnContext?.gesp, questionType, "wanjuanwang_exam");
  const { flatProblems, levels, loading, searchQuery, selectedLevel, setSearchQuery, setSelectedLevel, error } = catalogState;
  const routePath = questionType === "selection" ? "/gesp/selection" : "/gesp/judgment";
  const title = questionTypeLabel[questionType];
  const groupedProblems = groupFlatProblemsByDomain(flatProblems);
  const knowledgePointCount = new Set(flatProblems.flatMap((entry) => entry.problem.knowledge_point_tags.map((tag) => tag.value))).size;
  const problemTypeCount = new Set(flatProblems.map((entry) => entry.problemType.problem_type_id)).size;

  function createReturnContext(problemId: string): ProblemReturnContext {
    return {
      source: "gesp",
      sourcePath: routePath,
      problemId,
      scrollY: window.scrollY,
      gesp: {
        activeDomainId: null,
        searchQuery,
        selectedLevel
      }
    };
  }

  function openDetailPage(problemId: string) {
    navigateTo(`/gesp/problems/${encodeURIComponent(problemId)}`, { returnContext: createReturnContext(problemId) });
  }

  return (
    <main className="pageSurface">
      <PageHeading
        eyebrow="GESP C++"
        icon={<ListChecks size={18} />}
        title={`${title}题练习`}
        description={`按等级集中查看 ${title}题，保留知识点与来源信息，适合刷题与讲评。`}
        actions={<Button className="actionButton actionButton--back" onClick={() => navigateTo("/")}>返回工作台</Button>}
      />
      <ControlBar
        levels={levels}
        loading={loading}
        searchQuery={searchQuery}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        onRefresh={() => catalogState.reload()}
        onSearchChange={setSearchQuery}
      />
      {error ? <Alert className="pageAlert" message={error} showIcon type="warning" /> : null}
      <section className="statGrid">
        <WorkbenchStat icon={<Boxes size={18} />} label="题目" value={flatProblems.length} />
        <WorkbenchStat icon={<Layers3 size={18} />} label="算法范畴" value={groupedProblems.length} />
        <WorkbenchStat icon={<BookOpenCheck size={18} />} label="题型标签" value={problemTypeCount} />
        <WorkbenchStat icon={<ShieldCheck size={18} />} label="知识点" value={knowledgePointCount} />
      </section>
      <Card className="practiceListPane" loading={loading}>
        <Flex align="center" className="sectionTitleRow" justify="space-between" gap={12}>
          <div>
            <Typography.Text className="sectionEyebrow">题型过滤</Typography.Text>
            <Typography.Title level={2}>{title}题</Typography.Title>
          </div>
          <Tag color="blue">{flatProblems.length} 题</Tag>
        </Flex>
        {groupedProblems.length ? (
          <Space className="typeColumn" direction="vertical" size={14}>
            {groupedProblems.map((group) => (
              <Card className="typePracticeCard" key={group.domainId} size="small">
                <Flex align="flex-start" justify="space-between" gap={12}>
                  <div>
                    <Typography.Text className="sectionEyebrow">{group.domainId}</Typography.Text>
                    <Typography.Title level={3}>{group.domainLabel}</Typography.Title>
                  </div>
                  <Tag color="blue">{group.problems.length} 题</Tag>
                </Flex>
                <div className="problemCardGrid">
                  {group.problems.map((entry) => (
                    <ProblemPracticeCard
                      isSelected={returnContext?.problemId === entry.problem.id}
                      key={entry.key}
                      onOpenDetail={() => openDetailPage(entry.problem.id)}
                      onSelect={() => openDetailPage(entry.problem.id)}
                      problem={entry.problem}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </Space>
        ) : (
          <Empty description={searchQuery ? "没有匹配的题目" : `当前等级暂无${title}题`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>
    </main>
  );
}

export function KnowledgeCoveragePage({ navigateTo }: { navigateTo: Navigate }) {
  const catalogState = useGespCatalog(5);
  const { flatProblems, levels, loading, searchQuery, selectedLevel, setSearchQuery, setSelectedLevel, visibleCatalog } = catalogState;
  const rows = useMemo(() => {
    return (visibleCatalog?.domains || []).map((domain) => {
      const knowledge = new Set<string>();
      let programmingCount = 0;
      for (const type of domain.problem_types) {
        for (const point of type.knowledge_points) {
          knowledge.add(point.label);
        }
        programmingCount += type.problems.filter((problem) => problem.question_type === "programming").length;
      }
      return {
        key: domain.domain_id,
        domain,
        knowledgeCount: knowledge.size,
        programmingCount,
        coverage: visibleCatalog?.summary.problem_count ? Math.round((domain.problem_count / visibleCatalog.summary.problem_count) * 100) : 0
      };
    });
  }, [visibleCatalog]);

  const columns: ColumnsType<(typeof rows)[number]> = [
    {
      title: "算法范畴",
      dataIndex: ["domain", "domain_label"],
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{row.domain.domain_label}</Typography.Text>
          <Typography.Text type="secondary">{row.domain.domain_id}</Typography.Text>
        </Space>
      )
    },
    { title: "题目", dataIndex: ["domain", "problem_count"], width: 100 },
    { title: "编程题", dataIndex: "programmingCount", width: 100 },
    { title: "知识点", dataIndex: "knowledgeCount", width: 100 },
    {
      title: "覆盖占比",
      dataIndex: "coverage",
      width: 220,
      render: (_, row) => <Progress percent={row.coverage} size="small" />
    }
  ];

  return (
    <main className="pageSurface">
      <PageHeading
        eyebrow="知识覆盖"
        icon={<ShieldCheck size={18} />}
        title="知识覆盖"
        description="查看不同等级下算法范畴、题型与知识点的覆盖结构，辅助安排练习顺序。"
        actions={<Button className="actionButton actionButton--back" onClick={() => navigateTo("/")}>返回工作台</Button>}
      />
      <ControlBar
        levels={levels}
        loading={loading}
        searchQuery={searchQuery}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        onRefresh={() => catalogState.reload()}
        onSearchChange={setSearchQuery}
      />
      <section className="statGrid">
        <WorkbenchStat icon={<Boxes size={18} />} label="题目" value={visibleCatalog?.summary.problem_count ?? 0} />
        <WorkbenchStat icon={<Layers3 size={18} />} label="算法范畴" value={visibleCatalog?.domains.length ?? 0} />
        <WorkbenchStat icon={<BookOpenCheck size={18} />} label="题型" value={visibleCatalog?.summary.problem_type_count ?? 0} />
        <WorkbenchStat icon={<ShieldCheck size={18} />} label="知识点" value={visibleCatalog?.summary.knowledge_point_count ?? 0} />
      </section>
      <Card className="tableCard" loading={loading}>
        <VirtualDataTable
          columns={columns}
          dataSource={rows}
          rowKey="key"
          xScroll={760}
        />
      </Card>
      <Card className="coverageMatrix" title="题型覆盖矩阵">
        <div className="coverageChipGrid">
          {flatProblems.slice(0, 60).map((entry) => (
            <Tag key={entry.key}>{entry.problemType.problem_type_label}</Tag>
          ))}
        </div>
      </Card>
    </main>
  );
}

export function SourceEvidencePage({ navigateTo }: { navigateTo: Navigate }) {
  const catalogState = useGespCatalog(5);
  const { flatProblems, levels, loading, searchQuery, selectedLevel, setSearchQuery, setSelectedLevel } = catalogState;
  const [drawerProblem, setDrawerProblem] = useState<ProblemDetailResponse | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  async function openEvidence(problemId: string) {
    setDrawerLoading(true);
    try {
      setDrawerProblem(await fetchProblem(problemId));
    } finally {
      setDrawerLoading(false);
    }
  }

  const columns: ColumnsType<FlatProblem> = [
    {
      title: "题目",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{row.problem.title}</Typography.Text>
          <Typography.Text type="secondary">{row.domain.domain_label} / {row.problemType.problem_type_label}</Typography.Text>
        </Space>
      )
    },
    { title: "题型", width: 90, render: (_, row) => <Tag>{questionTypeLabel[row.problem.question_type]}</Tag> },
    {
      title: "题面",
      width: 120,
      render: (_, row) => <ReadinessTag problem={row.problem} />
    },
    {
      title: "图片",
      width: 100,
      render: (_, row) => row.problem.visual_asset_thumbnails.length ? <Tag color="green">{row.problem.visual_asset_thumbnails.length} 张</Tag> : <Tag>无图片</Tag>
    },
    {
      title: "来源",
      width: 140,
      render: (_, row) => sourceStateLabel(row.problem)
    },
    {
      title: "操作",
      width: 130,
      render: (_, row) => (
        <Button className="actionButton actionButton--source" icon={<FileSearch size={14} />} onClick={() => openEvidence(row.problem.id)}>查看证据</Button>
      )
    }
  ];

  return (
    <main className="pageSurface">
      <PageHeading
        eyebrow="来源证据"
        icon={<FileSearch size={18} />}
        title="来源证据"
        description="按题目查看题面、图片、样例与参考入口的来源状态，方便补齐训练材料。"
        actions={<Button className="actionButton actionButton--maintenance" onClick={() => navigateTo("/maintenance")}>进入题目维护</Button>}
      />
      <ControlBar
        levels={levels}
        loading={loading}
        searchQuery={searchQuery}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        onRefresh={() => catalogState.reload()}
        onSearchChange={setSearchQuery}
      />
      <Card className="tableCard" loading={loading}>
        <VirtualDataTable
          columns={columns}
          dataSource={flatProblems}
          rowKey="key"
          xScroll={840}
        />
      </Card>
      <Drawer
        className="detailDrawer"
        destroyOnHidden
        loading={drawerLoading}
        onClose={() => setDrawerProblem(null)}
        open={Boolean(drawerProblem)}
        title="来源证据"
        width={720}
      >
        <ProblemDetailPanel loading={drawerLoading} onClose={() => setDrawerProblem(null)} problem={drawerProblem} />
      </Drawer>
    </main>
  );
}

export function GespProblemMaintenancePage({ navigateTo }: { navigateTo: Navigate }) {
  const { modal, message } = AntApp.useApp();
  const catalogState = useGespCatalog(5);
  const { flatProblems, levels, loading, searchQuery, selectedLevel, setSearchQuery, setSelectedLevel } = catalogState;
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editorForm, setEditorForm] = useState<ProblemEditorForm>(() => emptyEditorForm(5));
  const [editingProblem, setEditingProblem] = useState<ProblemDetailResponse | null>(null);
  const [saving, setSaving] = useState(false);

  function startCreate() {
    setEditingProblem(null);
    setEditorMode("create");
    setEditorForm(emptyEditorForm(selectedLevel));
  }

  async function startEdit(problemId: string) {
    const problem = await fetchProblem(problemId);
    setEditingProblem(problem);
    setEditorMode("edit");
    setEditorForm(formFromProblem(problem));
  }

  async function saveEditor() {
    setSaving(true);
    try {
      const payload = formToPayload(editorForm);
      const saved = editorMode === "edit" && editingProblem
        ? await updateProblem(editingProblem.id, payload)
        : await createProblem(payload);
      setEditorMode(null);
      setEditingProblem(saved);
      if (saved.level !== selectedLevel) {
        setSelectedLevel(saved.level);
      } else {
        await catalogState.reload();
      }
      message.success("题目已保存");
    } catch (currentError) {
      message.error(currentError instanceof Error ? currentError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(problem: ProblemSummary) {
    modal.confirm({
      title: `确认删除「${problem.title}」吗？`,
      content: "删除后会从当前题库中移除题面、答案、样例和来源记录。",
      okButtonProps: { danger: true },
      okText: "删除",
      cancelText: "取消",
      onOk: async () => {
        await deleteProblem(problem.id);
        await catalogState.reload();
        message.success("题目已删除");
      }
    });
  }

  const columns: ColumnsType<FlatProblem> = [
    {
      title: "题目",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{row.problem.title}</Typography.Text>
          <Typography.Text type="secondary">{row.problem.official_problem_id || row.problem.id}</Typography.Text>
        </Space>
      )
    },
    { title: "算法范畴", width: 150, render: (_, row) => row.domain.domain_label },
    { title: "题型标签", width: 180, render: (_, row) => row.problemType.problem_type_label },
    { title: "题型", width: 90, render: (_, row) => <Tag>{questionTypeLabel[row.problem.question_type]}</Tag> },
    { title: "内容状态", width: 120, render: (_, row) => <ReadinessTag problem={row.problem} /> },
    {
      title: "操作",
      width: 230,
      render: (_, row) => (
        <Space className="tableActionGroup" size={6}>
          <Button className="actionButton actionButton--detail" icon={<ExternalLink size={14} />} onClick={() => navigateTo(`/gesp/problems/${encodeURIComponent(row.problem.id)}`)}>查看</Button>
          <Button className="actionButton actionButton--edit" icon={<Pencil size={14} />} onClick={() => startEdit(row.problem.id)}>编辑</Button>
          <Button className="actionButton actionButton--delete" danger icon={<Trash2 size={14} />} onClick={() => confirmDelete(row.problem)} />
        </Space>
      )
    }
  ];

  return (
    <main className="pageSurface">
      <PageHeading
        eyebrow="题目维护"
        icon={<Database size={18} />}
        title="题目维护"
        description="维护 GESP 题目、题面、答案、讲解、图片、样例和来源链接，供练习查看页面直接使用。"
        actions={(
          <>
            <Button className="actionButton actionButton--source" icon={<FileSearch size={16} />} onClick={() => navigateTo("/sources")}>来源证据</Button>
            <Button className="actionButton actionButton--create" icon={<Plus size={16} />} onClick={startCreate} type="primary">新增题目</Button>
          </>
        )}
      />
      <ControlBar
        levels={levels}
        loading={loading}
        searchQuery={searchQuery}
        selectedLevel={selectedLevel}
        onLevelChange={setSelectedLevel}
        onRefresh={() => catalogState.reload()}
        onSearchChange={setSearchQuery}
      />
      <Card className="tableCard" loading={loading}>
        <VirtualDataTable
          columns={columns}
          dataSource={flatProblems}
          rowKey="key"
          xScroll={980}
        />
      </Card>
      <ProblemEditorModal
        form={editorForm}
        mode={editorMode}
        onCancel={() => setEditorMode(null)}
        onChange={setEditorForm}
        onSave={saveEditor}
        saving={saving}
      />
    </main>
  );
}

function useGespCatalog(
  initialLevel: number,
  initialState?: ProblemReturnContext["gesp"],
  questionType?: "selection" | "judgment" | "programming",
  sourceKind?: string
) {
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(initialState?.selectedLevel ?? initialLevel);
  const [catalog, setCatalog] = useState<LevelCatalog | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialState?.searchQuery ?? "");
  const [activeDomainId, setActiveDomainId] = useState<string | null>(initialState?.activeDomainId ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLevels()
      .then((response) => setLevels(response.levels))
      .catch((currentError: unknown) => setError(currentError instanceof Error ? currentError.message : "等级加载失败"));
  }, []);

  useEffect(() => {
    void loadCatalog(selectedLevel);
  }, [selectedLevel]);

  const visibleCatalog = useMemo(() => filterLevelCatalogByQuery(catalog, searchQuery), [catalog, searchQuery]);

  useEffect(() => {
    if (!visibleCatalog?.domains.length) {
      setActiveDomainId(null);
      return;
    }
    if (!visibleCatalog.domains.some((domain) => domain.domain_id === activeDomainId)) {
      setActiveDomainId(visibleCatalog.domains[0].domain_id);
    }
  }, [activeDomainId, visibleCatalog]);

  const flatProblems = useMemo(() => flattenCatalog(visibleCatalog), [visibleCatalog]);

  async function loadCatalog(level: number) {
    setLoading(true);
    setError(null);
    try {
      const nextCatalog = await fetchLevelCatalog(level, questionType, sourceKind);
      setCatalog(nextCatalog);
      setActiveDomainId((currentDomainId) => {
        if (currentDomainId && nextCatalog.domains.some((domain) => domain.domain_id === currentDomainId)) {
          return currentDomainId;
        }
        return nextCatalog.domains[0]?.domain_id || null;
      });
    } catch (currentError) {
      setCatalog(null);
      setError(currentError instanceof Error ? currentError.message : "目录加载失败");
    } finally {
      setLoading(false);
    }
  }

  return {
    activeDomain: visibleCatalog?.domains.find((domain) => domain.domain_id === activeDomainId) || visibleCatalog?.domains[0] || null,
    activeDomainId,
    catalog,
    error,
    flatProblems,
    levels,
    loading,
    reload: () => loadCatalog(selectedLevel),
    searchQuery,
    selectedLevel,
    setActiveDomainId,
    setSearchQuery,
    setSelectedLevel,
    visibleCatalog
  };
}

function flattenCatalog(catalog: LevelCatalog | null): FlatProblem[] {
  if (!catalog) {
    return [];
  }
  return catalog.domains.flatMap((domain) => (
    domain.problem_types.flatMap((problemType) => (
      problemType.problems.map((problem) => ({
        key: `${domain.domain_id}:${problemType.problem_type_id}:${problem.id}`,
        level: catalog.level,
        domain,
        problemType,
        problem
      }))
    ))
  ));
}

function groupFlatProblemsByDomain(flatProblems: FlatProblem[]) {
  const groups = new Map<string, { domainId: string; domainLabel: string; problems: FlatProblem[] }>();

  for (const entry of flatProblems) {
    if (!groups.has(entry.domain.domain_id)) {
      groups.set(entry.domain.domain_id, {
        domainId: entry.domain.domain_id,
        domainLabel: entry.domain.domain_label,
        problems: []
      });
    }
    groups.get(entry.domain.domain_id)?.problems.push(entry);
  }

  return [...groups.values()].sort((left, right) => right.problems.length - left.problems.length || left.domainId.localeCompare(right.domainId));
}

function PageHeading({ actions, description, eyebrow, icon, title }: {
  actions?: ReactNode;
  description: string;
  eyebrow: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <header className="pageHeading">
      <div>
        <Typography.Text className="eyebrowLine">{icon}{eyebrow}</Typography.Text>
        <Typography.Title level={1}>{title}</Typography.Title>
        <Typography.Paragraph>{description}</Typography.Paragraph>
      </div>
      {actions ? <Space className="pageActions" size={8} wrap>{actions}</Space> : null}
    </header>
  );
}

function ControlBar({ levels, loading, onLevelChange, onRefresh, onSearchChange, searchQuery, selectedLevel }: {
  levels: LevelSummary[];
  loading: boolean;
  onLevelChange: (level: number) => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
  selectedLevel: number;
}) {
  return (
    <Card className="controlBar" size="small">
      <Flex align="center" gap={12} justify="space-between" wrap="wrap">
        <Space wrap>
          <Segmented
            disabled={loading}
            onChange={(value) => onLevelChange(Number(value))}
            options={levels.map((level) => ({ label: `${level.level} 级`, value: level.level }))}
            value={selectedLevel}
          />
          <Input
            allowClear
            className="searchInput"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索题号、标题、题型、知识点"
            prefix={<Filter size={15} />}
            value={searchQuery}
          />
        </Space>
        <Button className="actionButton actionButton--refresh" icon={<RefreshCw size={15} />} onClick={onRefresh}>刷新</Button>
      </Flex>
    </Card>
  );
}

function WorkbenchStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <ProCard className="statCard">
      <Space align="start" size={12}>
        <span className="statIcon">{icon}</span>
        <Statistic title={label} value={value} />
      </Space>
    </ProCard>
  );
}

function ProblemPracticeCard({ isSelected, onOpenDetail, onOpenIde, onSelect, problem }: {
  isSelected: boolean;
  onOpenDetail: () => void;
  onOpenIde?: () => void;
  onSelect: () => void;
  problem: ProblemSummary;
}) {
  return (
    <Card className={isSelected ? "problemPracticeCard active" : "problemPracticeCard"} data-problem-anchor={problem.id} hoverable onClick={onSelect} size="small">
      <Space direction="vertical" size={8}>
        <Flex align="center" justify="space-between" gap={8}>
          <Tag>{questionTypeLabel[problem.question_type]}</Tag>
          <ReadinessTag problem={problem} />
        </Flex>
        <Typography.Text className="problemTitle" strong>{problem.title}</Typography.Text>
        <Flex className="tagWrap" gap={6} wrap="wrap">
          {problem.knowledge_point_tags.slice(0, 3).map((tag) => <Tag key={tag.value}>{tag.label}</Tag>)}
        </Flex>
        <Space className="problemPracticeActions" size={6}>
          <Button className="actionButton actionButton--detail" size="small" onClick={(event) => { event.stopPropagation(); onOpenDetail(); }}>查看练习</Button>
          {onOpenIde ? (
            <Button className="actionButton actionButton--ide" icon={<Code2 size={13} />} size="small" onClick={(event) => { event.stopPropagation(); onOpenIde(); }}>IDE</Button>
          ) : null}
        </Space>
      </Space>
    </Card>
  );
}

function ReadinessTag({ problem }: { problem: ProblemSummary }) {
  const completeness = problem.detail_completeness;
  if (!completeness) {
    return <Tag>内容待补</Tag>;
  }
  if (completeness.needs_source_enrichment || completeness.needs_option_collection || completeness.needs_visual_asset_collection) {
    return <Tag color="gold">待完善</Tag>;
  }
  if (problem.status === "confirmed") {
    return <Tag color="green">可练习</Tag>;
  }
  return <Tag color="blue">已归档</Tag>;
}

function sourceStateLabel(problem: ProblemSummary) {
  if (problem.detail_completeness?.needs_source_enrichment) {
    return <Tag color="gold">来源待补</Tag>;
  }
  if (problem.answer_guidance?.reference_links?.length || problem.answer_guidance?.reference_answer.source_url) {
    return <Tag color="green">有参考入口</Tag>;
  }
  return <Tag>题库记录</Tag>;
}
