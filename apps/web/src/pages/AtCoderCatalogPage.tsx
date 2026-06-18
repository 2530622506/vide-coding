import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ProCard } from "@ant-design/pro-components";
import {
  ArrowRight,
  Code2,
  Database,
  ExternalLink,
  FileText,
  Filter,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Trash2
} from "lucide-react";
import MarkdownIt from "markdown-it";
import mathjax3 from "markdown-it-mathjax3";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  createAtCoderProblem,
  deleteAtCoderProblem,
  fetchAtCoderCatalog,
  fetchAtCoderProblem,
  updateAtCoderProblem
} from "../services/atcoderCatalog";
import type { AtCoderCatalog, AtCoderDomainGroup, AtCoderLabel, AtCoderProblem, AtCoderProblemSummary, AtCoderProblemTypeGroup } from "../types/atcoder";

type Navigate = (path: string) => void;

type FlatAtCoderProblem = {
  key: string;
  domain: AtCoderDomainGroup;
  problemType: AtCoderProblemTypeGroup;
  problem: AtCoderProblemSummary;
};

type AtCoderProblemForm = {
  pid: string;
  title: string;
  title_zh: string;
  difficulty: number;
  source_url: string;
  algorithm_domains: string;
  problem_type_tags: string;
  knowledge_points: string;
  statement: string;
  samples: string;
  solution_outline: string;
  solution_code: string;
};

const markdown = new MarkdownIt({ breaks: true, html: false, linkify: true }).use(mathjax3);

const difficultyOptions = [
  { value: "all", label: "全部难度" },
  { value: "2", label: "普及-" },
  { value: "3", label: "普及/提高-" },
  { value: "4", label: "普及+/提高" },
  { value: "5", label: "提高+/省选-" }
];

export function AtCoderCatalogPage({ navigateTo, onOpenIde }: { navigateTo: Navigate; onOpenIde: (problemId: string) => void }) {
  const catalogState = useAtCoderCatalog();
  const { activeDomain, catalog, difficulty, error, flatProblems, loading, searchQuery, setActiveDomainId, setDifficulty, setSearchQuery } = catalogState;

  return (
    <main className="pageSurface">
      <AtCoderHeading
        eyebrow="AtCoder"
        icon={<Trophy size={18} />}
        title="AtCoder 算法题库"
        description="AtCoder 题库与 GESP 真题的数据结构不同，单独按难度、算法范畴、题型和样例组织。"
        actions={(
          <>
            <Button icon={<Database size={16} />} onClick={() => navigateTo("/atcoder/maintenance")}>题库维护</Button>
            <Button onClick={() => navigateTo("/")}>返回 GESP</Button>
          </>
        )}
      />
      <AtCoderControlBar
        difficulty={difficulty}
        loading={loading}
        searchQuery={searchQuery}
        onDifficultyChange={setDifficulty}
        onRefresh={() => catalogState.reload()}
        onSearchChange={setSearchQuery}
      />
      {error ? <Alert className="pageAlert" message={error} showIcon type="warning" /> : null}

      <section className="statGrid">
        <AtCoderStat icon={<Trophy size={18} />} label="题目" value={catalog?.summary.problem_count ?? 0} />
        <AtCoderStat icon={<ShieldCheck size={18} />} label="算法范畴" value={catalog?.summary.domain_count ?? 0} />
        <AtCoderStat icon={<FileText size={18} />} label="中文题面" value={catalog?.summary.source_extracted_statement_count ?? 0} />
        <AtCoderStat icon={<Code2 size={18} />} label="本地参考解" value={catalog?.summary.local_ai_answer_count ?? 0} />
      </section>

      <section className="atcoderWorkspace">
        <Card className="domainRail" loading={loading} title="算法范畴">
          <Space direction="vertical" size={8}>
            {(catalog?.domains || []).map((domain) => (
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
              <Typography.Text className="sectionEyebrow">题目列表</Typography.Text>
              <Typography.Title level={2}>{activeDomain?.domain_label || "AtCoder Problems"}</Typography.Title>
            </div>
            <Tag color="blue">{flatProblems.length} 题</Tag>
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
                  <div className="problemCardGrid">
                    {type.problems
                      .filter((problem) => matchAtCoderProblem(problem, searchQuery, difficulty))
                      .slice(0, 9)
                      .map((problem) => (
                        <AtCoderProblemCard
                          key={problem.id}
                          onOpenDetail={() => navigateTo(`/atcoder/problems/${encodeURIComponent(problem.id)}`)}
                          onOpenIde={() => onOpenIde(problem.id)}
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
      </section>
    </main>
  );
}

export function AtCoderProblemDetailPage({ navigateTo, onOpenIde, problemId }: { navigateTo: Navigate; onOpenIde: (problemId: string) => void; problemId: string }) {
  const [problem, setProblem] = useState<AtCoderProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAtCoderProblem(problemId)
      .then(setProblem)
      .catch((currentError: unknown) => setError(currentError instanceof Error ? currentError.message : "题目加载失败"))
      .finally(() => setLoading(false));
  }, [problemId]);

  return (
    <main className="pageSurface">
      <AtCoderHeading
        eyebrow="AtCoder 题目详情"
        icon={<FileText size={18} />}
        title={problem?.title_zh || problem?.title || problemId}
        description="题面 sections、样例、算法标签、参考思路和 C++17 参考解按 AtCoder 数据结构单独展示。"
        actions={(
          <>
            <Button onClick={() => navigateTo("/atcoder")}>返回题库</Button>
            <Button icon={<Code2 size={16} />} onClick={() => onOpenIde(problemId)} type="primary">进入 IDE</Button>
          </>
        )}
      />
      {error ? <Alert className="pageAlert" message={error} showIcon type="warning" /> : null}
      <Card className="detailPageCard" loading={loading}>
        {problem ? (
          <section className="atcoderDetailGrid">
            <Card className="atcoderStatementCard" title="题面">
              <Space direction="vertical" size={14}>
                <Flex gap={8} wrap="wrap">
                  <Tag color="purple">{problem.difficulty_label}</Tag>
                  <Tag>AC 率 {formatPercent(problem.acceptance_rate)}</Tag>
                  {problem.statement.limits.time_ms ? <Tag>{problem.statement.limits.time_ms} ms</Tag> : null}
                  {problem.statement.limits.memory_kb ? <Tag>{Math.round(problem.statement.limits.memory_kb / 1024)} MB</Tag> : null}
                </Flex>
                {problem.statement.sections.length ? (
                  problem.statement.sections.map((section) => (
                    <section className="markdownSection" key={section.id}>
                      <Typography.Title level={3}>{section.title}</Typography.Title>
                      <MarkdownBlock markdownText={section.markdown} />
                    </section>
                  ))
                ) : (
                  <Empty description="题面待补" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Space>
            </Card>

            <aside className="atcoderDetailAside">
              <Card title="练习操作">
                <Space direction="vertical" size={10}>
                  <Button block icon={<Play size={16} />} onClick={() => onOpenIde(problem.id)} type="primary">进入 IDE 练习</Button>
                  <Button block href={problem.source_url} icon={<ExternalLink size={16} />} rel="noreferrer" target="_blank">打开来源</Button>
                </Space>
              </Card>
              <Card title="标签">
                <Flex gap={6} wrap="wrap">
                  {[...problem.algorithm_domains, ...problem.problem_type_tags, ...problem.knowledge_points].map((tag) => (
                    <Tag key={`${tag.id}-${tag.label}`}>{tag.label}</Tag>
                  ))}
                </Flex>
              </Card>
              <Card title="提交统计">
                <Progress percent={Math.round((problem.acceptance_rate || 0) * 100)} />
                <Typography.Text type="secondary">通过 {problem.total_accepted} / 提交 {problem.total_submit}</Typography.Text>
              </Card>
            </aside>

            <Card className="atcoderSampleCard" title="样例">
              {problem.statement.samples.length ? (
                <div className="sampleGrid">
                  {problem.statement.samples.map((sample, index) => (
                    <Card key={sample.id || index} size="small" title={`样例 ${index + 1}`}>
                      <Typography.Text type="secondary">输入</Typography.Text>
                      <pre>{sample.input || "(空)"}</pre>
                      <Typography.Text type="secondary">输出</Typography.Text>
                      <pre>{sample.output || "(空)"}</pre>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty description="暂无样例" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>

            <Card className="atcoderSolutionCard" title="参考思路">
              <Typography.Paragraph>{problem.answer_guidance.solution_outline || problem.answer_guidance.answer}</Typography.Paragraph>
              {problem.programming_solution.code ? (
                <pre className="lightCodeBlock">{problem.programming_solution.code}</pre>
              ) : (
                <Empty description="参考解待补" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </section>
        ) : (
          <Empty description="题目不存在" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>
    </main>
  );
}

export function AtCoderMaintenancePage({ navigateTo, onOpenIde }: { navigateTo: Navigate; onOpenIde: (problemId: string) => void }) {
  const { modal, message } = AntApp.useApp();
  const catalogState = useAtCoderCatalog();
  const { flatProblems, loading, searchQuery, setSearchQuery, difficulty, setDifficulty } = catalogState;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [form, setForm] = useState<AtCoderProblemForm>(() => emptyAtCoderForm());
  const [saving, setSaving] = useState(false);

  async function startEdit(problemId: string) {
    const problem = await fetchAtCoderProblem(problemId);
    setEditingProblemId(problem.id);
    setForm(formFromAtCoderProblem(problem));
    setModalOpen(true);
  }

  function startCreate() {
    setEditingProblemId(null);
    setForm(emptyAtCoderForm());
    setModalOpen(true);
  }

  async function saveProblem() {
    setSaving(true);
    try {
      const payload = payloadFromAtCoderForm(form);
      const saved = editingProblemId
        ? await updateAtCoderProblem(editingProblemId, payload)
        : await createAtCoderProblem(payload);
      setModalOpen(false);
      setEditingProblemId(saved.id);
      await catalogState.reload();
      message.success("AtCoder 题目已保存");
    } catch (currentError) {
      message.error(currentError instanceof Error ? currentError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(problem: AtCoderProblemSummary) {
    modal.confirm({
      title: `确认删除「${problem.title_zh || problem.title}」吗？`,
      content: "删除后会从 AtCoder 题库索引中移除该题。",
      okButtonProps: { danger: true },
      okText: "删除",
      cancelText: "取消",
      onOk: async () => {
        await deleteAtCoderProblem(problem.id);
        await catalogState.reload();
        message.success("题目已删除");
      }
    });
  }

  const columns: ColumnsType<FlatAtCoderProblem> = [
    {
      title: "题目",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{row.problem.title_zh || row.problem.title}</Typography.Text>
          <Typography.Text type="secondary">{row.problem.pid} / {row.problem.title}</Typography.Text>
        </Space>
      )
    },
    { title: "难度", width: 130, render: (_, row) => <Tag color="purple">{row.problem.difficulty_label}</Tag> },
    { title: "算法范畴", width: 150, render: (_, row) => row.domain.domain_label },
    { title: "题型", width: 180, render: (_, row) => row.problemType.problem_type_label },
    {
      title: "通过率",
      width: 130,
      render: (_, row) => formatPercent(row.problem.acceptance_rate)
    },
    {
      title: "操作",
      width: 280,
      render: (_, row) => (
        <Space size={6}>
          <Button icon={<ExternalLink size={14} />} onClick={() => navigateTo(`/atcoder/problems/${encodeURIComponent(row.problem.id)}`)}>详情</Button>
          <Button icon={<Code2 size={14} />} onClick={() => onOpenIde(row.problem.id)}>IDE</Button>
          <Button icon={<Pencil size={14} />} onClick={() => startEdit(row.problem.id)}>编辑</Button>
          <Button danger icon={<Trash2 size={14} />} onClick={() => confirmDelete(row.problem)} />
        </Space>
      )
    }
  ];

  return (
    <main className="pageSurface">
      <AtCoderHeading
        eyebrow="AtCoder 维护"
        icon={<Database size={18} />}
        title="AtCoder 题库维护"
        description="维护 AtCoder 独立题库字段，包括难度、标签、题面 sections、样例和 C++17 参考解。"
        actions={(
          <>
            <Button onClick={() => navigateTo("/atcoder")}>返回题库</Button>
            <Button icon={<Plus size={16} />} onClick={startCreate} type="primary">新增题目</Button>
          </>
        )}
      />
      <AtCoderControlBar
        difficulty={difficulty}
        loading={loading}
        searchQuery={searchQuery}
        onDifficultyChange={setDifficulty}
        onRefresh={() => catalogState.reload()}
        onSearchChange={setSearchQuery}
      />
      <Card className="tableCard" loading={loading}>
        <Table columns={columns} dataSource={flatProblems} pagination={{ pageSize: 10 }} rowKey="key" />
      </Card>
      <AtCoderEditorModal
        form={form}
        onCancel={() => setModalOpen(false)}
        onChange={setForm}
        onSave={saveProblem}
        open={modalOpen}
        saving={saving}
      />
    </main>
  );
}

function useAtCoderCatalog() {
  const [catalog, setCatalog] = useState<AtCoderCatalog | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    if (!catalog?.domains.length) {
      setActiveDomainId(null);
      return;
    }
    if (!catalog.domains.some((domain) => domain.domain_id === activeDomainId)) {
      setActiveDomainId(catalog.domains[0].domain_id);
    }
  }, [activeDomainId, catalog]);

  async function loadCatalog() {
    setLoading(true);
    setError(null);
    try {
      const nextCatalog = await fetchAtCoderCatalog();
      setCatalog(nextCatalog);
      setActiveDomainId(nextCatalog.domains[0]?.domain_id || null);
    } catch (currentError) {
      setCatalog(null);
      setError(currentError instanceof Error ? currentError.message : "AtCoder 题库加载失败");
    } finally {
      setLoading(false);
    }
  }

  const flatProblems = useMemo(() => {
    if (!catalog) {
      return [];
    }
    return catalog.domains.flatMap((domain) => (
      domain.problem_types.flatMap((problemType) => (
        problemType.problems
          .filter((problem) => matchAtCoderProblem(problem, searchQuery, difficulty))
          .map((problem) => ({ key: problem.id, domain, problemType, problem }))
      ))
    ));
  }, [catalog, difficulty, searchQuery]);

  return {
    activeDomain: catalog?.domains.find((domain) => domain.domain_id === activeDomainId) || catalog?.domains[0] || null,
    catalog,
    difficulty,
    error,
    flatProblems,
    loading,
    reload: loadCatalog,
    searchQuery,
    setActiveDomainId,
    setDifficulty,
    setSearchQuery
  };
}

function AtCoderHeading({ actions, description, eyebrow, icon, title }: {
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

function AtCoderControlBar({ difficulty, loading, onDifficultyChange, onRefresh, onSearchChange, searchQuery }: {
  difficulty: string;
  loading: boolean;
  onDifficultyChange: (value: string) => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  searchQuery: string;
}) {
  return (
    <Card className="controlBar" size="small">
      <Flex align="center" gap={12} justify="space-between" wrap="wrap">
        <Space wrap>
          <Select disabled={loading} onChange={onDifficultyChange} options={difficultyOptions} value={difficulty} />
          <Input
            allowClear
            className="searchInput"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索题号、英文题名、中文题名、知识点"
            prefix={<Filter size={15} />}
            value={searchQuery}
          />
        </Space>
        <Button icon={<RefreshCw size={15} />} onClick={onRefresh}>刷新</Button>
      </Flex>
    </Card>
  );
}

function AtCoderStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <ProCard className="statCard">
      <Space align="start" size={12}>
        <span className="statIcon">{icon}</span>
        <Statistic title={label} value={value} />
      </Space>
    </ProCard>
  );
}

function AtCoderProblemCard({ onOpenDetail, onOpenIde, problem }: {
  onOpenDetail: () => void;
  onOpenIde: () => void;
  problem: AtCoderProblemSummary;
}) {
  return (
    <Card className="problemPracticeCard" hoverable onClick={onOpenDetail} size="small">
      <Space direction="vertical" size={8}>
        <Flex align="center" justify="space-between" gap={8}>
          <Tag color="purple">{problem.difficulty_label}</Tag>
          <Tag>{formatPercent(problem.acceptance_rate)}</Tag>
        </Flex>
        <Typography.Text className="problemTitle" strong>{problem.title_zh || problem.title}</Typography.Text>
        <Typography.Text type="secondary">{problem.pid} / {problem.title}</Typography.Text>
        <Flex className="tagWrap" gap={6} wrap="wrap">
          {problem.knowledge_points.slice(0, 3).map((tag) => <Tag key={tag.id}>{tag.label}</Tag>)}
        </Flex>
        <Space size={6}>
          <Button size="small" onClick={(event) => { event.stopPropagation(); onOpenDetail(); }}>详情</Button>
          <Button icon={<Code2 size={13} />} size="small" onClick={(event) => { event.stopPropagation(); onOpenIde(); }}>IDE</Button>
        </Space>
      </Space>
    </Card>
  );
}

function MarkdownBlock({ markdownText }: { markdownText: string }) {
  const html = useMemo(() => markdown.render(markdownText.trim()), [markdownText]);
  return <div className="markdownBody" dangerouslySetInnerHTML={{ __html: html }} />;
}

function AtCoderEditorModal({ form, onCancel, onChange, onSave, open, saving }: {
  form: AtCoderProblemForm;
  onCancel: () => void;
  onChange: (form: AtCoderProblemForm) => void;
  onSave: () => void;
  open: boolean;
  saving: boolean;
}) {
  function update<K extends keyof AtCoderProblemForm>(key: K, value: AtCoderProblemForm[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <Modal
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        <Button key="save" disabled={!form.pid.trim()} loading={saving} onClick={onSave} type="primary">保存</Button>
      ]}
      onCancel={onCancel}
      open={open}
      title={form.pid ? `维护 ${form.pid}` : "新增 AtCoder 题目"}
      width={920}
    >
      <Form className="editorForm" layout="vertical">
        <Space className="formGridTwo" size={12}>
          <Form.Item label="题号" required>
            <Input value={form.pid} onChange={(event) => update("pid", event.target.value)} placeholder="ABC001_A" />
          </Form.Item>
          <Form.Item label="难度">
            <InputNumber min={2} max={5} value={form.difficulty} onChange={(value) => update("difficulty", value || 3)} />
          </Form.Item>
        </Space>
        <Form.Item label="英文标题">
          <Input value={form.title} onChange={(event) => update("title", event.target.value)} />
        </Form.Item>
        <Form.Item label="中文标题">
          <Input value={form.title_zh} onChange={(event) => update("title_zh", event.target.value)} />
        </Form.Item>
        <Form.Item label="来源链接">
          <Input value={form.source_url} onChange={(event) => update("source_url", event.target.value)} />
        </Form.Item>
        <Form.Item label="算法范畴">
          <Input value={form.algorithm_domains} onChange={(event) => update("algorithm_domains", event.target.value)} placeholder="动态规划, 图论" />
        </Form.Item>
        <Form.Item label="题型标签">
          <Input value={form.problem_type_tags} onChange={(event) => update("problem_type_tags", event.target.value)} placeholder="最短路, 区间 DP" />
        </Form.Item>
        <Form.Item label="知识点">
          <Input value={form.knowledge_points} onChange={(event) => update("knowledge_points", event.target.value)} placeholder="Dijkstra, priority_queue" />
        </Form.Item>
        <Form.Item label="题面 Markdown">
          <Input.TextArea rows={6} value={form.statement} onChange={(event) => update("statement", event.target.value)} />
        </Form.Item>
        <Form.Item label="样例">
          <Input.TextArea rows={4} value={form.samples} onChange={(event) => update("samples", event.target.value)} placeholder="输入 => 输出，每行一组" />
        </Form.Item>
        <Form.Item label="参考思路">
          <Input.TextArea rows={4} value={form.solution_outline} onChange={(event) => update("solution_outline", event.target.value)} />
        </Form.Item>
        <Form.Item label="C++17 参考解">
          <Input.TextArea rows={7} value={form.solution_code} onChange={(event) => update("solution_code", event.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function matchAtCoderProblem(problem: AtCoderProblemSummary, query: string, difficulty: string) {
  if (difficulty !== "all" && String(problem.difficulty) !== difficulty) {
    return false;
  }
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return [
    problem.pid,
    problem.title,
    problem.title_zh,
    problem.difficulty_label,
    ...problem.knowledge_points.map((point) => point.label)
  ].filter(Boolean).some((value) => value.toLowerCase().includes(normalized));
}

function formatPercent(value: number | null) {
  if (typeof value !== "number") {
    return "暂无";
  }
  return `${Math.round(value * 100)}%`;
}

function emptyAtCoderForm(): AtCoderProblemForm {
  return {
    pid: "",
    title: "",
    title_zh: "",
    difficulty: 3,
    source_url: "",
    algorithm_domains: "",
    problem_type_tags: "",
    knowledge_points: "",
    statement: "",
    samples: "",
    solution_outline: "",
    solution_code: ""
  };
}

function formFromAtCoderProblem(problem: AtCoderProblem): AtCoderProblemForm {
  return {
    pid: problem.pid,
    title: problem.title,
    title_zh: problem.title_zh,
    difficulty: problem.difficulty,
    source_url: problem.source_url,
    algorithm_domains: problem.algorithm_domains.map((tag) => tag.label).join(", "),
    problem_type_tags: problem.problem_type_tags.map((tag) => tag.label).join(", "),
    knowledge_points: problem.knowledge_points.map((tag) => tag.label).join(", "),
    statement: problem.statement.sections.map((section) => section.markdown).join("\n\n"),
    samples: problem.statement.samples.map((sample) => `${sample.input} => ${sample.output}`).join("\n"),
    solution_outline: problem.answer_guidance.solution_outline || "",
    solution_code: problem.programming_solution.code || ""
  };
}

function payloadFromAtCoderForm(form: AtCoderProblemForm): Partial<AtCoderProblem> {
  const sourceUrl = form.source_url || `https://www.luogu.com.cn/problem/${form.pid}`;
  const knowledgePoints = labelsToTags(form.knowledge_points);
  return {
    id: form.pid,
    pid: form.pid,
    title: form.title || form.pid,
    title_zh: form.title_zh || form.title || form.pid,
    difficulty: normalizeDifficulty(form.difficulty),
    difficulty_label: difficultyLabel(form.difficulty),
    source_url: sourceUrl,
    algorithm_domains: labelsToTags(form.algorithm_domains),
    problem_type_tags: labelsToTags(form.problem_type_tags),
    knowledge_points: knowledgePoints,
    answer_guidance: {
      status: "reference_link",
      answer: form.solution_outline || "学习参考答案待完善。",
      source: "luogu_problem_page",
      source_url: sourceUrl,
      solution_outline: form.solution_outline || "学习参考思路待完善。",
      knowledge_points: knowledgePoints.map((tag) => tag.label),
      review_note: "学习参考内容，请结合样例验证后使用。"
    },
    statement: {
      status: form.statement.trim() ? "source_extracted" : "pending_collection",
      locale: "zh-CN",
      source_terms_status: "needs_review",
      source_url: sourceUrl,
      atcoder_url: null,
      sections: form.statement.trim() ? [{ id: "statement", title: "题面", markdown: form.statement }] : [],
      samples: parseSamples(form.samples),
      limits: { time_ms: null, memory_kb: null },
      notes: []
    },
    programming_solution: {
      status: "needs_review",
      language: "C++17",
      code: form.solution_code || null,
      content_origin: "local_ai_generated_reference",
      ai_generation_notice: "学习参考内容，请结合样例验证后使用。",
      reference_answer: form.solution_outline || "学习参考答案待完善。",
      algorithm: form.algorithm_domains,
      complexity: "",
      verification: null,
      notes: []
    }
  };
}

function labelsToTags(value: string): AtCoderLabel[] {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((label) => ({
      id: label.toLowerCase().replace(/\s+/g, "_"),
      label
    }));
}

function parseSamples(value: string) {
  return value
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [input = "", output = ""] = line.split(/\s*=>\s*/);
      return {
        id: `sample_${index + 1}`,
        input: input.trim(),
        output: output.trim()
      };
    });
}

function normalizeDifficulty(value: number): 2 | 3 | 4 | 5 {
  if (value <= 2) {
    return 2;
  }
  if (value >= 5) {
    return 5;
  }
  return value === 4 ? 4 : 3;
}

function difficultyLabel(value: number) {
  const normalized = normalizeDifficulty(value);
  if (normalized === 2) {
    return "普及-";
  }
  if (normalized === 4) {
    return "普及+/提高";
  }
  if (normalized === 5) {
    return "提高+/省选-";
  }
  return "普及/提高-";
}
