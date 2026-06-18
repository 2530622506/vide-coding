import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Checkbox,
  Col,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Tag,
  Typography
} from "antd";
import { ProCard, ProTable, type ProColumns } from "@ant-design/pro-components";
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
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { filterLevelCatalogByQuery } from "../../catalogSearch";
import { ProblemDetailPanel } from "../../components/ProblemDetailPanel";
import { ProblemEditorModal } from "../../components/ProblemEditorModal";
import { emptyEditorForm, formFromProblem, formToPayload } from "../../editor";
import type { EditorMode, ProblemEditorForm } from "../../editor";
import {
  createProblem,
  deleteProblem,
  fetchLevelCatalog,
  fetchLevels,
  fetchProblem,
  updateProblem
} from "../../services/catalog";
import type { DomainGroup, LevelCatalog, LevelSummary, ProblemDetailResponse, ProblemSummary, ProblemTypeGroup } from "../../types";

type Navigate = (path: string) => void;

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

export function GespWorkbenchPage({ navigateTo, onOpenIde }: { navigateTo: Navigate; onOpenIde: (problemId: string) => void }) {
  const catalogState = useGespCatalog(5);
  const {
    activeDomain,
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
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  return (
    <main className="pageSurface">
      <PageHeading
        eyebrow="GESP C++"
        icon={<BookOpenCheck size={18} />}
        title="练习工作台"
        description="按等级、算法范畴、题型和知识点组织练习查看，维护内容与来源证据在同一套工作流中闭环。"
        actions={(
          <>
            <Button icon={<FileSearch size={16} />} onClick={() => navigateTo("/sources")}>来源证据</Button>
            <Button icon={<Database size={16} />} onClick={() => navigateTo("/maintenance")}>题目维护</Button>
            <Button icon={<ArrowRight size={16} />} onClick={() => navigateTo("/atcoder")} type="primary">AtCoder 题库</Button>
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

      <section className="practiceWorkspace">
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
            <Button icon={<Pencil size={16} />} onClick={() => navigateTo("/exercise-builder")}>生成练习包</Button>
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
                        key={problem.id}
                        onOpenDetail={() => navigateTo(`/gesp/problems/${encodeURIComponent(problem.id)}`)}
                        onOpenIde={problem.question_type === "programming" ? () => onOpenIde(problem.id) : undefined}
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

        <Card className="practiceSidePane" title="当前题目" loading={detailLoading}>
          {selectedProblem ? (
            <ProblemDetailPanel
              loading={detailLoading}
              onClose={() => {
                setSelectedProblem(null);
                setSelectedProblemId(null);
              }}
              onOpenIde={onOpenIde}
              problem={selectedProblem}
            />
          ) : (
            <Space className="sideEmpty" direction="vertical" size={12}>
              <Empty description="从中间列表选择题目查看练习内容" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              {featuredProblems.length ? (
                <Space direction="vertical" size={8}>
                  <Typography.Text strong>推荐先看</Typography.Text>
                  {featuredProblems.slice(0, 3).map((entry) => (
                    <Button block key={entry.problem.id} onClick={() => openProblem(entry.problem.id)}>
                      {entry.problem.title}
                    </Button>
                  ))}
                </Space>
              ) : null}
            </Space>
          )}
        </Card>
      </section>
    </main>
  );
}

export function GespProblemPracticePage({ problemId, navigateTo, onOpenIde }: { problemId: string; navigateTo: Navigate; onOpenIde: (problemId: string) => void }) {
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
            <Button onClick={() => navigateTo("/")}>返回工作台</Button>
            {problem?.question_type === "programming" ? (
              <Button icon={<Code2 size={16} />} onClick={() => onOpenIde(problem.id)} type="primary">进入 IDE</Button>
            ) : null}
          </>
        )}
      />
      {error ? <Alert className="pageAlert" message={error} showIcon type="warning" /> : null}
      <Card className="detailPageCard" loading={loading}>
        <ProblemDetailPanel loading={loading} onClose={() => navigateTo("/")} onOpenIde={onOpenIde} problem={problem} />
      </Card>
    </main>
  );
}

export function ExerciseBuilderPage({ navigateTo }: { navigateTo: Navigate }) {
  const catalogState = useGespCatalog(5);
  const { flatProblems, levels, loading, searchQuery, selectedLevel, setSearchQuery, setSelectedLevel } = catalogState;
  const [questionType, setQuestionType] = useState<string>("all");
  const [count, setCount] = useState(8);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredProblems = useMemo(() => {
    return flatProblems.filter((entry) => questionType === "all" || entry.problem.question_type === questionType);
  }, [flatProblems, questionType]);
  const suggestedIds = filteredProblems.slice(0, count).map((entry) => entry.problem.id);
  const selectedProblems = flatProblems.filter((entry) => selectedIds.includes(entry.problem.id));

  useEffect(() => {
    setSelectedIds(suggestedIds);
  }, [count, selectedLevel, questionType, searchQuery]);

  return (
    <main className="pageSurface">
      <PageHeading
        eyebrow="练习包"
        icon={<Pencil size={18} />}
        title="练习包生成"
        description="从等级、题型和关键词筛出题目，生成一组可以连续查看和练习的题目包。"
        actions={<Button onClick={() => navigateTo("/")}>返回工作台</Button>}
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

      <section className="builderWorkspace">
        <Card className="builderConfigCard" title="筛选条件">
          <Form layout="vertical">
            <Form.Item label="题型">
              <Select
                value={questionType}
                onChange={setQuestionType}
                options={[
                  { value: "all", label: "全部题型" },
                  { value: "programming", label: "编程" },
                  { value: "selection", label: "选择" },
                  { value: "judgment", label: "判断" }
                ]}
              />
            </Form.Item>
            <Form.Item label="题量">
              <InputNumber min={1} max={30} value={count} onChange={(value) => setCount(value || 1)} />
            </Form.Item>
          </Form>
          <Alert message={`已按当前条件选出 ${selectedIds.length} 题，可在右侧勾选调整。`} showIcon type="info" />
        </Card>

        <Card className="builderListCard" loading={loading} title="候选题目">
          <Checkbox.Group className="builderCheckGroup" value={selectedIds} onChange={(values) => setSelectedIds(values.map(String))}>
            <Space direction="vertical" size={10}>
              {filteredProblems.slice(0, 40).map((entry) => (
                <Checkbox className="builderProblemCheck" key={entry.problem.id} value={entry.problem.id}>
                  <Space direction="vertical" size={2}>
                    <Typography.Text strong>{entry.problem.title}</Typography.Text>
                    <Typography.Text type="secondary">{entry.domain.domain_label} / {entry.problemType.problem_type_label}</Typography.Text>
                  </Space>
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </Card>

        <Card className="builderResultCard" title="练习包预览">
          {selectedProblems.length ? (
            <Space direction="vertical" size={10}>
              {selectedProblems.map((entry, index) => (
                <Card className="compactProblemCard" key={entry.problem.id} size="small">
                  <Flex align="center" justify="space-between" gap={12}>
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>{index + 1}. {entry.problem.title}</Typography.Text>
                      <Typography.Text type="secondary">{questionTypeLabel[entry.problem.question_type]} / {entry.problemType.problem_type_label}</Typography.Text>
                    </Space>
                    <Button icon={<Play size={14} />} onClick={() => navigateTo(`/gesp/problems/${encodeURIComponent(entry.problem.id)}`)}>查看</Button>
                  </Flex>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="请选择题目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </section>
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

  const columns: ProColumns<(typeof rows)[number]>[] = [
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
        actions={<Button onClick={() => navigateTo("/")}>返回工作台</Button>}
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
        <ProTable
          columns={columns}
          dataSource={rows}
          options={false}
          pagination={false}
          rowKey="key"
          search={false}
        />
      </Card>
      <Card className="coverageMatrix" title="题型覆盖矩阵">
        <div className="coverageChipGrid">
          {flatProblems.slice(0, 60).map((entry) => (
            <Tag key={entry.problem.id}>{entry.problemType.problem_type_label}</Tag>
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

  const columns: ProColumns<FlatProblem>[] = [
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
        <Button icon={<FileSearch size={14} />} onClick={() => openEvidence(row.problem.id)}>查看证据</Button>
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
        actions={<Button onClick={() => navigateTo("/maintenance")}>进入题目维护</Button>}
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
        <ProTable
          columns={columns}
          dataSource={flatProblems}
          options={false}
          pagination={{ pageSize: 12 }}
          rowKey="key"
          search={false}
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

  const columns: ProColumns<FlatProblem>[] = [
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
        <Space size={6}>
          <Button icon={<ExternalLink size={14} />} onClick={() => navigateTo(`/gesp/problems/${encodeURIComponent(row.problem.id)}`)}>查看</Button>
          <Button icon={<Pencil size={14} />} onClick={() => startEdit(row.problem.id)}>编辑</Button>
          <Button danger icon={<Trash2 size={14} />} onClick={() => confirmDelete(row.problem)} />
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
            <Button icon={<FileSearch size={16} />} onClick={() => navigateTo("/sources")}>来源证据</Button>
            <Button icon={<Plus size={16} />} onClick={startCreate} type="primary">新增题目</Button>
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
        <ProTable
          columns={columns}
          dataSource={flatProblems}
          options={false}
          pagination={{ pageSize: 10 }}
          rowKey="key"
          search={false}
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

function useGespCatalog(initialLevel: number) {
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(initialLevel);
  const [catalog, setCatalog] = useState<LevelCatalog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
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

  async function loadCatalog(level: number) {
    setLoading(true);
    setError(null);
    try {
      const nextCatalog = await fetchLevelCatalog(level);
      setCatalog(nextCatalog);
      setActiveDomainId(nextCatalog.domains[0]?.domain_id || null);
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
    flatProblems: flattenCatalog(visibleCatalog),
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
        key: problem.id,
        level: catalog.level,
        domain,
        problemType,
        problem
      }))
    ))
  ));
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
        <Button icon={<RefreshCw size={15} />} onClick={onRefresh}>刷新</Button>
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
    <Card className={isSelected ? "problemPracticeCard active" : "problemPracticeCard"} hoverable onClick={onSelect} size="small">
      <Space direction="vertical" size={8}>
        <Flex align="center" justify="space-between" gap={8}>
          <Tag>{questionTypeLabel[problem.question_type]}</Tag>
          <ReadinessTag problem={problem} />
        </Flex>
        <Typography.Text className="problemTitle" strong>{problem.title}</Typography.Text>
        <Flex className="tagWrap" gap={6} wrap="wrap">
          {problem.knowledge_point_tags.slice(0, 3).map((tag) => <Tag key={tag.value}>{tag.label}</Tag>)}
        </Flex>
        <Space size={6}>
          <Button size="small" onClick={(event) => { event.stopPropagation(); onOpenDetail(); }}>查看练习</Button>
          {onOpenIde ? (
            <Button icon={<Code2 size={13} />} size="small" onClick={(event) => { event.stopPropagation(); onOpenIde(); }}>IDE</Button>
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
