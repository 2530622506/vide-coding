import { useRequest } from "ahooks";
import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import "highlight.js/styles/github-dark.css";
import MarkdownIt from "markdown-it";
import mathjax3 from "markdown-it-mathjax3";
import { Alert, App as AntApp, Button, Card, Empty, Flex, Image, Input, Modal, Select, Space, Tabs, Tag, Tooltip, Typography } from "antd";
import { ArrowLeft, BookOpenCheck, Code2, Database, Edit3, ExternalLink, FileText, GitBranch, Image as ImageIcon, ListChecks, Plus, RefreshCw, Trash2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { DomainNav } from "../components/DomainNav";
import { Metric } from "../components/Metric";
import { createAtCoderProblem, deleteAtCoderProblem, fetchAtCoderCatalog, fetchAtCoderProblem, updateAtCoderProblem } from "../services/atcoderCatalog";
import type { AtCoderDomainGroup, AtCoderProblem, AtCoderProblemSummary, AtCoderStatementSection } from "../types/atcoder";

if (!hljs.getLanguage("cpp")) {
  hljs.registerLanguage("cpp", cpp);
}

const statementMarkdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true
}).use(mathjax3);

const defaultLinkOpenRenderer = statementMarkdown.renderer.rules.link_open;
statementMarkdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  token.attrSet("target", "_blank");
  token.attrSet("rel", "noreferrer");
  return defaultLinkOpenRenderer
    ? defaultLinkOpenRenderer(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

type Props = {
  onBack: () => void;
};

type AtCoderWorkspaceStyle = CSSProperties & {
  "--detail-column-width"?: string;
};

const DIFFICULTY_TABS = [
  { key: "普及/提高-", label: "普及/提高-", difficulty: 3 },
  { key: "普及+/提高", label: "普及+/提高", difficulty: 4 },
  { key: "提高+/省选-", label: "提高+/省选-", difficulty: 5 }
] as const;

type EditorMode = "create" | "edit";

type EditorForm = {
  pid: string;
  title: string;
  title_zh: string;
  difficulty_label: string;
  answer: string;
  solution_outline: string;
};

export function AtCoderCatalogPage({ onBack }: Props) {
  const { modal } = AntApp.useApp();
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string>(DIFFICULTY_TABS[0].key);
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editorForm, setEditorForm] = useState<EditorForm>(emptyEditorForm(DIFFICULTY_TABS[0].key));

  const catalogRequest = useRequest(fetchAtCoderCatalog);
  const problemRequest = useRequest(fetchAtCoderProblem, {
    manual: true
  });

  const catalog = catalogRequest.data || null;
  const filteredDomains = useMemo(() => filterDomainsByDifficulty(catalog?.domains || [], activeDifficulty), [activeDifficulty, catalog?.domains]);
  const activeDomain = useMemo(() => {
    if (!filteredDomains.length) {
      return null;
    }
    return filteredDomains.find((domain) => domain.domain_id === activeDomainId) || filteredDomains[0] || null;
  }, [activeDomainId, filteredDomains]);

  useEffect(() => {
    if (!filteredDomains.some((domain) => domain.domain_id === activeDomainId)) {
      setActiveDomainId(filteredDomains[0]?.domain_id || null);
    }
  }, [activeDomainId, filteredDomains]);

  function openProblem(problemId: string) {
    setSelectedProblemId(problemId);
    problemRequest.run(problemId);
  }

  function openCreateModal() {
    setEditorForm(emptyEditorForm(activeDifficulty));
    setEditorMode("create");
  }

  function openEditModal(problem: AtCoderProblem) {
    setEditorForm({
      pid: problem.pid,
      title: problem.title,
      title_zh: problem.title_zh,
      difficulty_label: problem.difficulty_label,
      answer: problem.answer_guidance.answer,
      solution_outline: problem.answer_guidance.solution_outline
    });
    setEditorMode("edit");
  }

  async function submitEditor() {
    const difficulty = DIFFICULTY_TABS.find((tab) => tab.key === editorForm.difficulty_label)?.difficulty || 3;
    const payload: Partial<AtCoderProblem> = {
      pid: editorForm.pid,
      title: editorForm.title,
      title_zh: editorForm.title_zh,
      difficulty,
      difficulty_label: editorForm.difficulty_label as AtCoderProblem["difficulty_label"],
      answer_guidance: {
        ...(problemRequest.data?.answer_guidance || {
          status: "reference_link",
          source: "luogu_problem_page",
          source_url: `https://www.luogu.com.cn/problem/${editorForm.pid}`,
          knowledge_points: [],
          review_note: "当前答案是 AI 生成，仅供参考；不是官方题解。"
        }),
        answer: editorForm.answer,
        solution_outline: editorForm.solution_outline,
        review_note: "当前答案是 AI 生成，仅供参考；不是官方题解。"
      }
    };
    const saved = editorMode === "create"
      ? await createAtCoderProblem(payload)
      : await updateAtCoderProblem(selectedProblemId || editorForm.pid, payload);
    setEditorMode(null);
    setSelectedProblemId(saved.id);
    await catalogRequest.refreshAsync();
    problemRequest.run(saved.id);
  }

  async function confirmDelete(problem: AtCoderProblem) {
    modal.confirm({
      title: "删除题目",
      content: `确认删除 ${problem.pid} ${problem.title_zh || problem.title}？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await deleteAtCoderProblem(problem.id);
        setSelectedProblemId(null);
        problemRequest.mutate(undefined);
        await catalogRequest.refreshAsync();
      }
    });
  }

  const workspaceStyle: AtCoderWorkspaceStyle = {
    "--detail-column-width": "480px"
  };

  return (
    <main className="shell atcoderShell">
      <Flex className="topbar" align="center" justify="space-between" gap={24}>
        <div>
          <Typography.Text className="eyebrow"><Trophy size={16} /> 洛谷 AtCoder 公开题库</Typography.Text>
          <Typography.Title level={1}>AtCoder 算法题库</Typography.Title>
        </div>
        <Space className="actionBar" size={8} wrap>
          <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回 GESP</Button>
          <Button icon={<Plus size={16} />} onClick={openCreateModal} type="primary">新增题目</Button>
          <Button icon={<RefreshCw size={16} />} onClick={catalogRequest.refresh} title="刷新 AtCoder 目录" />
        </Space>
      </Flex>

      {catalogRequest.error ? (
        <Alert className="notice atcoderNotice" showIcon title={catalogRequest.error.message || "AtCoder 目录加载失败"} type="warning" />
      ) : null}

      <section className="metricGrid atcoderMetricGrid">
        <Metric icon={<Database size={18} />} label="目标难度题目" value={catalog?.summary.problem_count ?? 0} />
        <Metric icon={<GitBranch size={18} />} label="算法范畴" value={catalog?.summary.domain_count ?? 0} />
        <Metric icon={<BookOpenCheck size={18} />} label="知识点" value={catalog?.summary.knowledge_point_count ?? 0} />
        <Metric icon={<ListChecks size={18} />} label="来源总题量" value={catalog?.source.total_source_problem_count ?? 0} />
        <Metric icon={<RefreshCw size={18} />} label="爬取间隔 ms" value={catalog?.source.crawl_delay_ms ?? 0} />
        <Metric icon={<Code2 size={18} />} label="样例验证 C++" value={catalog?.summary.ai_sample_verified_solution_count ?? 0} />
        <Metric icon={<FileText size={18} />} label="待生成答案" value={catalog?.summary.pending_ai_generation_count ?? 0} />
      </section>

      <Tabs
        activeKey={activeDifficulty}
        className="difficultyTabs"
        items={DIFFICULTY_TABS.map((tab) => ({
          key: tab.key,
          label: `${tab.label} (${catalog?.summary.difficulty_counts[tab.key] || 0})`
        }))}
        onChange={(key) => {
          setActiveDifficulty(key);
          setSelectedProblemId(null);
          problemRequest.mutate(undefined);
        }}
      />

      <section className="workspace atcoderWorkspace" style={workspaceStyle}>
        <DomainNav
          activeDomainId={activeDomain?.domain_id || null}
          domains={filteredDomains}
          onSelect={setActiveDomainId}
        />

        <Card className="catalogPane" loading={catalogRequest.loading}>
          {!catalogRequest.loading && activeDomain ? (
            <AtCoderDomainPanel
              domain={activeDomain}
              onProblemSelect={openProblem}
              selectedProblemId={selectedProblemId}
            />
          ) : null}
          {!catalogRequest.loading && !activeDomain ? (
            <Empty description="暂无 AtCoder 题目数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : null}
        </Card>

        <Card className="detailPane atcoderDetailPane" loading={problemRequest.loading} size="small" title="题目详情">
          <AtCoderProblemDetail
            onDelete={confirmDelete}
            onEdit={openEditModal}
            problem={problemRequest.data || null}
          />
        </Card>
      </section>
      <AtCoderProblemEditor
        form={editorForm}
        mode={editorMode}
        onCancel={() => setEditorMode(null)}
        onChange={setEditorForm}
        onSubmit={submitEditor}
      />
    </main>
  );
}

function AtCoderDomainPanel({ domain, selectedProblemId, onProblemSelect }: {
  domain: AtCoderDomainGroup;
  selectedProblemId: string | null;
  onProblemSelect: (problemId: string) => void;
}) {
  return (
    <>
      <Flex className="domainHeader" align="center" justify="space-between" gap={16}>
        <div>
          <Typography.Text className="eyebrow"><GitBranch size={16} /> {domain.domain_id}</Typography.Text>
          <Typography.Title level={2}>{domain.domain_label}</Typography.Title>
        </div>
        <Flex gap={6} wrap="wrap" justify="flex-end">
          {Object.entries(domain.difficulty_counts).map(([difficulty, count]) => (
            <Tag color="blue" key={difficulty}>{difficulty}：{count}</Tag>
          ))}
        </Flex>
      </Flex>

      <Space className="typeStack" orientation="vertical" size={14}>
        {domain.problem_types.map((type) => (
          <Card
            key={type.problem_type_id}
            size="small"
            title={
              <div>
                <Typography.Text className="eyebrow"><BookOpenCheck size={16} /> {type.problem_type_id}</Typography.Text>
                <Typography.Title level={3}>{type.problem_type_label}</Typography.Title>
              </div>
            }
            extra={<Tag color="blue">{type.problem_count}</Tag>}
          >
            <Flex className="knowledgeRow" gap={8} wrap="wrap">
              {type.knowledge_points.slice(0, 16).map((point) => (
                <Tag color="green" key={point.id}>{point.label}</Tag>
              ))}
            </Flex>
            <div className="problemList atcoderProblemList" role="list">
              {type.problems.map((problem) => (
                <AtCoderProblemRow
                  key={problem.id}
                  isSelected={selectedProblemId === problem.id}
                  onSelect={onProblemSelect}
                  problem={problem}
                />
              ))}
            </div>
          </Card>
        ))}
      </Space>
    </>
  );
}

function AtCoderProblemRow({ problem, isSelected, onSelect }: {
  problem: AtCoderProblemSummary;
  isSelected: boolean;
  onSelect: (problemId: string) => void;
}) {
  function selectFromKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(problem.id);
    }
  }

  return (
    <div className="problemRowItem" role="listitem">
      <Card
        className={isSelected ? "problemCard atcoderProblemCard active" : "problemCard atcoderProblemCard"}
        hoverable
        onClick={() => onSelect(problem.id)}
        onKeyDown={selectFromKeyboard}
        role="button"
        size="small"
        tabIndex={0}
      >
        <div className="problemRowLayout atcoderProblemRowLayout">
          <div className="problemIndex">
            <span>{problem.difficulty_label}</span>
            <strong>{problem.pid.replace(/^AT_?/, "")}</strong>
          </div>
          <div className="problemMain">
            <Typography.Text className="problemTitle">{problem.title}</Typography.Text>
            <Typography.Text className="problemTitleZh" type="secondary">{problem.title_zh}</Typography.Text>
            <Flex className="problemMeta" gap={6} wrap="wrap">
              <Tag color="purple">{problem.pid}</Tag>
              <Tag>提交 {problem.total_submit}</Tag>
              <Tag>通过 {problem.total_accepted}</Tag>
              {problem.acceptance_rate === null ? null : <Tag>通过率 {(problem.acceptance_rate * 100).toFixed(1)}%</Tag>}
            </Flex>
          </div>
          <Flex className="problemTags" gap={6} wrap="wrap">
            {problem.knowledge_points.slice(0, 4).map((tag) => (
              <Tag key={tag.id}>{tag.label}</Tag>
            ))}
          </Flex>
        </div>
      </Card>
    </div>
  );
}

function AtCoderProblemDetail({ problem, onEdit, onDelete }: {
  problem: AtCoderProblem | null;
  onEdit: (problem: AtCoderProblem) => void;
  onDelete: (problem: AtCoderProblem) => void;
}) {
  if (!problem) {
    return <Empty className="detailEmpty" description="选择一道 AtCoder 题目查看详情" image={<FileText size={28} />} />;
  }

  return (
    <article className="detailCard">
      <Flex className="detailHeader" align="flex-start" justify="space-between" gap={12}>
        <div>
          <Typography.Text className="eyebrow"><FileText size={15} /> {problem.pid} / {problem.difficulty_label}</Typography.Text>
          <Typography.Title level={2}>{problem.title}</Typography.Title>
          <Typography.Text className="detailChineseTitle">{problem.title_zh}</Typography.Text>
        </div>
        <Space size={4}>
          <Tooltip title="编辑题目和答案">
            <Button aria-label="编辑题目和答案" icon={<Edit3 size={14} />} onClick={() => onEdit(problem)} type="text" />
          </Tooltip>
          <Tooltip title="删除题目">
            <Button aria-label="删除题目" danger icon={<Trash2 size={14} />} onClick={() => onDelete(problem)} type="text" />
          </Tooltip>
          <Button href={problem.source_url} icon={<ExternalLink size={14} />} rel="noreferrer" target="_blank" type="link">
            原题
          </Button>
        </Space>
      </Flex>

      <DetailSection icon={<GitBranch size={16} />} title="算法分类">
        <Flex gap={8} wrap="wrap">
          {problem.algorithm_domains.map((domain) => <Tag color="blue" key={domain.id}>{domain.label}</Tag>)}
          {problem.problem_type_tags.map((type) => <Tag key={type.id}>{type.label}</Tag>)}
        </Flex>
      </DetailSection>

      <DetailSection icon={<BookOpenCheck size={16} />} title="知识点">
        <Flex gap={8} wrap="wrap">
          {problem.knowledge_points.map((point) => <Tag color="green" key={point.id}>{point.label}</Tag>)}
        </Flex>
      </DetailSection>

      <DetailSection icon={<FileText size={16} />} title="题面">
        <AtCoderStatementBlock sections={problem.statement.sections} status={problem.statement.status} />
      </DetailSection>

      <DetailSection icon={<ListChecks size={16} />} title="输入输出样例">
        {problem.statement.samples.length ? (
          <Space className="sampleList" orientation="vertical" size={10}>
            {problem.statement.samples.map((sample, index) => (
              <Card className="samplePair" key={sample.id} size="small" title={`样例 ${index + 1}`}>
                <Typography.Text strong>输入</Typography.Text>
                <pre>{sample.input}</pre>
                <Typography.Text strong>输出</Typography.Text>
                <pre>{sample.output}</pre>
              </Card>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">暂无公开样例</Typography.Text>
        )}
      </DetailSection>

      <DetailSection icon={<ImageIcon size={16} />} title="题面图片">
        {problem.visual_assets.assets.length ? (
          <Space className="assetList" orientation="vertical" size={10}>
            {problem.visual_assets.assets.map((asset) => (
              <Card className="assetItem" key={asset.id} size="small">
                {asset.status === "downloaded" ? (
                  <Image alt={asset.alt_text} src={asset.asset_url} />
                ) : (
                  <Button href={asset.source_url} rel="noreferrer" target="_blank" type="link">图片下载失败，打开源图</Button>
                )}
                <Typography.Text type="secondary">{asset.alt_text}</Typography.Text>
              </Card>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">{problem.visual_assets.status === "none_found" ? "当前题面未发现图片" : "图片待抓取"}</Typography.Text>
        )}
      </DetailSection>

      <DetailSection icon={<ListChecks size={16} />} title="参考答案与思路">
        <Space orientation="vertical" size={8}>
          <Typography.Paragraph>{problem.answer_guidance.answer}</Typography.Paragraph>
          <Typography.Paragraph type="secondary">{problem.answer_guidance.solution_outline}</Typography.Paragraph>
          <Alert showIcon title={problem.answer_guidance.review_note} type="info" />
        </Space>
      </DetailSection>

      <DetailSection icon={<Code2 size={16} />} title="C++ 参考解">
        <AtCoderSolutionBlock problem={problem} />
      </DetailSection>

      <DetailSection icon={<Database size={16} />} title="提交统计">
        <Flex gap={8} wrap="wrap">
          <Tag>提交 {problem.total_submit}</Tag>
          <Tag>通过 {problem.total_accepted}</Tag>
          {problem.statement.limits.time_ms ? <Tag>时间 {problem.statement.limits.time_ms} ms</Tag> : null}
          {problem.statement.limits.memory_kb ? <Tag>内存 {problem.statement.limits.memory_kb} KB</Tag> : null}
          {problem.acceptance_rate === null ? null : <Tag>通过率 {(problem.acceptance_rate * 100).toFixed(1)}%</Tag>}
        </Flex>
      </DetailSection>
    </article>
  );
}

function AtCoderStatementBlock({ sections, status }: { sections: AtCoderStatementSection[]; status: string }) {
  if (!sections.length) {
    return <Typography.Text type="secondary">{status === "pending_collection" ? "题面待抓取" : "题面为空"}</Typography.Text>;
  }
  return (
    <Space className="statementSectionList" orientation="vertical" size={12}>
      {sections.map((section) => (
        <Card className="statementSectionCard" key={section.id} size="small" title={section.title}>
          <MarkdownBlock markdown={section.markdown} />
        </Card>
      ))}
    </Space>
  );
}

function MarkdownBlock({ markdown }: { markdown: string }) {
  const html = useMemo(() => statementMarkdown.render(markdown), [markdown]);
  return <div className="markdownBody" dangerouslySetInnerHTML={{ __html: html }} />;
}

function AtCoderSolutionBlock({ problem }: { problem: AtCoderProblem }) {
  const solution = problem.programming_solution;
  if (!solution.code) {
    return (
      <Space orientation="vertical" size={8}>
        <Alert showIcon title={solution.ai_generation_notice} type="warning" />
        <Typography.Text type="secondary">{solution.reference_answer}</Typography.Text>
      </Space>
    );
  }

  return (
    <Space className="solutionBlock" orientation="vertical" size={8}>
      <Alert showIcon title={solution.ai_generation_notice} type="warning" />
      <Flex gap={8} wrap="wrap">
        <Tag>{solution.language}</Tag>
        {solution.algorithm ? <Tag>{solution.algorithm}</Tag> : null}
        {solution.complexity ? <Tag>{solution.complexity}</Tag> : null}
      </Flex>
      {solution.verification ? (
        <Alert showIcon title={`样例验证：${solution.verification.status} / ${solution.verification.sample_count} 组`} type="success" />
      ) : null}
      <HighlightedCppCode code={solution.code} />
    </Space>
  );
}

function HighlightedCppCode({ code }: { code: string }) {
  const highlighted = useMemo(() => {
    return hljs.highlight(code, {
      language: "cpp"
    }).value;
  }, [code]);

  return (
    <pre className="codeBlock">
      <code className="hljs language-cpp" dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
  );
}

function DetailSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="detailSection">
      <Typography.Title level={3}>{icon}{title}</Typography.Title>
      {children}
    </section>
  );
}

function AtCoderProblemEditor({ mode, form, onChange, onCancel, onSubmit }: {
  mode: EditorMode | null;
  form: EditorForm;
  onChange: (form: EditorForm) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      destroyOnHidden
      okText={mode === "create" ? "新增" : "保存"}
      onCancel={onCancel}
      onOk={onSubmit}
      open={Boolean(mode)}
      title={mode === "create" ? "新增 AtCoder 题目" : "编辑题目和答案"}
      width={720}
    >
      <Space className="atcoderEditorForm" orientation="vertical" size={12}>
        <label>
          <Typography.Text strong>题号</Typography.Text>
          <Input disabled={mode === "edit"} value={form.pid} onChange={(event) => onChange({ ...form, pid: event.target.value })} />
        </label>
        <label>
          <Typography.Text strong>原题名</Typography.Text>
          <Input value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
        </label>
        <label>
          <Typography.Text strong>中文名称</Typography.Text>
          <Input value={form.title_zh} onChange={(event) => onChange({ ...form, title_zh: event.target.value })} />
        </label>
        <label>
          <Typography.Text strong>难度</Typography.Text>
          <Select
            options={DIFFICULTY_TABS.map((tab) => ({ label: tab.label, value: tab.key }))}
            value={form.difficulty_label}
            onChange={(value) => onChange({ ...form, difficulty_label: value })}
          />
        </label>
        <label>
          <Typography.Text strong>答案区域</Typography.Text>
          <Input.TextArea rows={4} value={form.answer} onChange={(event) => onChange({ ...form, answer: event.target.value })} />
        </label>
        <label>
          <Typography.Text strong>参考思路</Typography.Text>
          <Input.TextArea rows={6} value={form.solution_outline} onChange={(event) => onChange({ ...form, solution_outline: event.target.value })} />
        </label>
      </Space>
    </Modal>
  );
}

function filterDomainsByDifficulty(domains: AtCoderDomainGroup[], difficultyLabel: string): AtCoderDomainGroup[] {
  return domains
    .map((domain) => {
      const problemTypes = domain.problem_types
        .map((type) => {
          const problems = type.problems.filter((problem) => problem.difficulty_label === difficultyLabel);
          return {
            ...type,
            problem_count: problems.length,
            problems
          };
        })
        .filter((type) => type.problem_count > 0);
      const problemCount = problemTypes.reduce((sum, type) => sum + type.problem_count, 0);
      return {
        ...domain,
        problem_count: problemCount,
        difficulty_counts: { [difficultyLabel]: problemCount },
        problem_types: problemTypes
      };
    })
    .filter((domain) => domain.problem_count > 0)
    .sort((a, b) => {
      if (a.domain_id === "uncategorized") {
        return 1;
      }
      if (b.domain_id === "uncategorized") {
        return -1;
      }
      return b.problem_count - a.problem_count || a.domain_label.localeCompare(b.domain_label, "zh-CN");
    });
}

function emptyEditorForm(difficultyLabel: string): EditorForm {
  return {
    pid: "",
    title: "",
    title_zh: "",
    difficulty_label: difficultyLabel,
    answer: "当前答案是 AI 生成，仅供参考。请在这里补充参考答案或思路。",
    solution_outline: "当前答案是 AI 生成，仅供参考；不是官方题解，正式提交前请复核。"
  };
}
