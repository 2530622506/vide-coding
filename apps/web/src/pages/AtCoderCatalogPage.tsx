import { useRequest } from "ahooks";
import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import "highlight.js/styles/github-dark.css";
import MarkdownIt from "markdown-it";
import mathjax3 from "markdown-it-mathjax3";
import "@uiw/react-md-editor/markdown-editor.css";
import { Alert, App as AntApp, Button, Card, Empty, Flex, FloatButton, Image, Input, Modal, Select, Space, Tabs, Tag, Tooltip, Typography, Upload } from "antd";
import type { UploadProps } from "antd";
import { ArrowLeft, ArrowUp, BookOpenCheck, Check, Code2, Copy, Database, Edit3, ExternalLink, FileText, GitBranch, Image as ImageIcon, ListChecks, Plus, RefreshCw, Trash2, Trophy, Upload as UploadIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
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

const LazyMarkdownEditor = lazy(() => import("@uiw/react-md-editor"));

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
  onOpenIde: (problemId: string) => void;
};

type AtCoderWorkspaceStyle = CSSProperties & {
  "--detail-column-width"?: string;
};

type LabelSelectOption = {
  label: string;
  value: string;
};

type AtCoderLabelOptionGroups = {
  algorithmDomains: LabelSelectOption[];
  problemTypeTags: LabelSelectOption[];
  knowledgePoints: LabelSelectOption[];
};

const DIFFICULTY_TABS = [
  { key: "普及-", label: "普及-", difficulty: 2 },
  { key: "普及/提高-", label: "普及/提高-", difficulty: 3 },
  { key: "普及+/提高", label: "普及+/提高", difficulty: 4 },
  { key: "提高+/省选-", label: "提高+/省选-", difficulty: 5 }
] as const;

type EditorMode = "create" | "edit";

type EditorVisualAsset = AtCoderProblem["visual_assets"]["assets"][number];

type EditorForm = {
  pid: string;
  title: string;
  title_zh: string;
  source_url: string;
  difficulty_label: string;
  total_submit: string;
  total_accepted: string;
  acceptance_rate: string;
  algorithm_domains: AtCoderProblem["algorithm_domains"];
  problem_type_tags: AtCoderProblem["problem_type_tags"];
  knowledge_points: AtCoderProblem["knowledge_points"];
  statement_sections: AtCoderStatementSection[];
  sample_cases: AtCoderProblem["statement"]["samples"];
  time_ms: string;
  memory_kb: string;
  statement_notes: string;
  visual_assets: EditorVisualAsset[];
  visual_notes: string;
  answer: string;
  solution_outline: string;
  review_note: string;
  solution_code: string;
  solution_algorithm: string;
  solution_complexity: string;
  solution_notice: string;
  solution_reference: string;
  solution_notes: string;
};

export function AtCoderCatalogPage({ onBack, onOpenIde }: Props) {
  const { message, modal } = AntApp.useApp();
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string>(DIFFICULTY_TABS[0].key);
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editorForm, setEditorForm] = useState<EditorForm>(emptyEditorForm(DIFFICULTY_TABS[0].key));
  const [detailColumnWidth, setDetailColumnWidth] = useState(480);

  const catalogRequest = useRequest(fetchAtCoderCatalog);
  const problemRequest = useRequest(fetchAtCoderProblem, {
    manual: true
  });

  const catalog = catalogRequest.data || null;
  const filteredDomains = useMemo(() => filterDomainsByDifficulty(catalog?.domains || [], activeDifficulty), [activeDifficulty, catalog?.domains]);
  const labelOptions = useMemo(() => collectAtCoderLabelOptions(catalog?.domains || []), [catalog?.domains]);
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
    setEditorForm(problemToEditorForm(problem));
    setEditorMode("edit");
  }

  async function submitEditor() {
    try {
      const payload = editorFormToProblemPayload(editorForm, problemRequest.data || null);
      const saved = editorMode === "create"
        ? await createAtCoderProblem(payload)
        : await updateAtCoderProblem(selectedProblemId || editorForm.pid, payload);
      setEditorMode(null);
      setSelectedProblemId(saved.id);
      await catalogRequest.refreshAsync();
      problemRequest.run(saved.id);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "题目信息格式不正确");
    }
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

  function startDetailResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    document.body.classList.add("isResizingDetailPane");
    const workspaceElement = event.currentTarget.closest<HTMLElement>(".atcoderWorkspace");
    const startX = event.clientX;
    const startWidth = detailColumnWidth;
    let nextWidth = startWidth;
    let animationFrame: number | null = null;

    function applyWidth() {
      animationFrame = null;
      workspaceElement?.style.setProperty("--detail-column-width", `${nextWidth}px`);
    }

    function resize(moveEvent: PointerEvent) {
      moveEvent.preventDefault();
      nextWidth = Math.min(920, Math.max(360, startWidth - (moveEvent.clientX - startX)));
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(applyWidth);
      }
    }

    function stopResize() {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
        applyWidth();
      }
      setDetailColumnWidth(nextWidth);
      document.body.classList.remove("isResizingDetailPane");
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
    }

    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize, { once: true });
  }

  const workspaceStyle: AtCoderWorkspaceStyle = {
    "--detail-column-width": `${detailColumnWidth}px`
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

        <Card
          className="detailPane atcoderDetailPane"
          loading={problemRequest.loading}
          size="small"
          title="题目详情"
        >
          <button
            aria-label="拖动调整题目详情宽度"
            className="paneResizeHandle atcoderPaneResizeHandle"
            onPointerDown={startDetailResize}
            type="button"
          />
          <AtCoderProblemDetail
            onDelete={confirmDelete}
            onEdit={openEditModal}
            onOpenIde={onOpenIde}
            problem={problemRequest.data || null}
          />
        </Card>
      </section>
      <FloatButton
        className="backToTopButton"
        icon={<ArrowUp size={18} />}
        onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
        tooltip="回到顶部"
      />
      <AtCoderProblemEditor
        form={editorForm}
        labelOptions={labelOptions}
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

function AtCoderProblemDetail({ problem, onEdit, onDelete, onOpenIde }: {
  problem: AtCoderProblem | null;
  onEdit: (problem: AtCoderProblem) => void;
  onDelete: (problem: AtCoderProblem) => void;
  onOpenIde: (problemId: string) => void;
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
          <Tooltip title="进入 IDE 模式">
            <Button aria-label="进入 IDE 模式" icon={<Code2 size={14} />} onClick={() => onOpenIde(problem.id)} type="text" />
          </Tooltip>
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
  const verificationMessage = solution.verification?.status === "not_verified_by_request"
    ? "未验证：按用户要求跳过编译和样例验证"
    : `样例验证：${solution.verification?.status} / ${solution.verification?.sample_count ?? 0} 组`;
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
        <Alert
          showIcon
          title={verificationMessage}
          type={solution.verification.status === "not_verified_by_request" ? "info" : "success"}
        />
      ) : null}
      <HighlightedCppCode code={solution.code} />
    </Space>
  );
}

function HighlightedCppCode({ code }: { code: string }) {
  const { message } = AntApp.useApp();
  const [copied, setCopied] = useState(false);
  const highlighted = useMemo(() => {
    return hljs.highlight(code, {
      language: "cpp"
    }).value;
  }, [code]);

  async function copyCode() {
    try {
      await copyTextToClipboard(code);
      setCopied(true);
      message.success("代码已复制");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      message.error("复制失败，请手动选择代码");
    }
  }

  return (
    <div className="codeBlockFrame">
      <div className="codeToolbar">
        <Button icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={copyCode} size="small" type="text">
          {copied ? "已复制" : "复制代码"}
        </Button>
      </div>
      <pre className="codeBlock">
        <code className="hljs language-cpp" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) {
    throw new Error("Copy command failed");
  }
}

function RichMarkdownEditor({ ariaLabel, height, onChange, preview = "live", value }: {
  ariaLabel: string;
  height: number;
  onChange: (value: string) => void;
  preview?: "edit" | "live" | "preview";
  value: string;
}) {
  return (
    <div className="richMarkdownEditor" data-color-mode="light">
      <Suspense fallback={<div className="richMarkdownEditorFallback" style={{ height }}>编辑器加载中</div>}>
        <LazyMarkdownEditor
          height={height}
          preview={preview}
          textareaProps={{ "aria-label": ariaLabel }}
          value={value}
          onChange={(nextValue) => onChange(nextValue || "")}
        />
      </Suspense>
    </div>
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

function AtCoderProblemEditor({ mode, form, labelOptions, onChange, onCancel, onSubmit }: {
  mode: EditorMode | null;
  form: EditorForm;
  labelOptions: AtCoderLabelOptionGroups;
  onChange: (form: EditorForm) => void;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  const { message } = AntApp.useApp();
  const algorithmDomainOptions = mergeSelectedLabelOptions(labelOptions.algorithmDomains, form.algorithm_domains);
  const problemTypeOptions = mergeSelectedLabelOptions(labelOptions.problemTypeTags, form.problem_type_tags);
  const knowledgePointOptions = mergeSelectedLabelOptions(labelOptions.knowledgePoints, form.knowledge_points);
  const imageUploadProps: UploadProps = {
    accept: "image/*",
    beforeUpload(file) {
      void addUploadedImage(file);
      return Upload.LIST_IGNORE;
    },
    showUploadList: false
  };

  function updateStatementSection(index: number, patch: Partial<AtCoderStatementSection>) {
    onChange({
      ...form,
      statement_sections: form.statement_sections.map((section, currentIndex) => currentIndex === index ? { ...section, ...patch } : section)
    });
  }

  function addStatementSection() {
    onChange({
      ...form,
      statement_sections: [
        ...form.statement_sections,
        { id: createEditorId("section"), title: "补充说明", markdown: "" }
      ]
    });
  }

  function removeStatementSection(index: number) {
    onChange({
      ...form,
      statement_sections: form.statement_sections.filter((_, currentIndex) => currentIndex !== index)
    });
  }

  function updateSampleCase(index: number, patch: Partial<AtCoderProblem["statement"]["samples"][number]>) {
    onChange({
      ...form,
      sample_cases: form.sample_cases.map((sample, currentIndex) => currentIndex === index ? { ...sample, ...patch } : sample)
    });
  }

  function addSampleCase() {
    onChange({
      ...form,
      sample_cases: [
        ...form.sample_cases,
        { id: createEditorId("sample"), input: "", output: "" }
      ]
    });
  }

  function removeSampleCase(index: number) {
    onChange({
      ...form,
      sample_cases: form.sample_cases.filter((_, currentIndex) => currentIndex !== index)
    });
  }

  async function addUploadedImage(file: File) {
    try {
      const dataUrl = await fileToDataUrl(file);
      onChange({
        ...form,
        visual_assets: [
          ...form.visual_assets,
          {
            id: createEditorId("asset"),
            section_id: "",
            source_url: dataUrl,
            alt_text: stripFileExtension(file.name) || "题目图片",
            status: "downloaded",
            local_path: null,
            asset_url: dataUrl,
            content_type: file.type || null,
            size_bytes: file.size
          }
        ]
      });
    } catch {
      message.error("图片读取失败，请重新选择文件");
    }
  }

  function updateVisualAsset(index: number, patch: Partial<EditorVisualAsset>) {
    onChange({
      ...form,
      visual_assets: form.visual_assets.map((asset, currentIndex) => currentIndex === index ? { ...asset, ...patch } : asset)
    });
  }

  function removeVisualAsset(index: number) {
    onChange({
      ...form,
      visual_assets: form.visual_assets.filter((_, currentIndex) => currentIndex !== index)
    });
  }

  return (
    <Modal
      afterOpenChange={handleEditorOpenChange}
      destroyOnHidden
      okText={mode === "create" ? "新增" : "保存"}
      onCancel={onCancel}
      onOk={onSubmit}
      open={Boolean(mode)}
      title={mode === "create" ? "新增 AtCoder 题目" : "编辑题目和答案"}
      width={980}
    >
      <Tabs
        items={[
          {
            key: "basic",
            label: "基础信息",
            children: (
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
                  <Typography.Text strong>来源链接</Typography.Text>
                  <Input value={form.source_url} onChange={(event) => onChange({ ...form, source_url: event.target.value })} />
                </label>
                <Flex gap={12} wrap="wrap">
                  <label className="atcoderEditorInlineField">
                    <Typography.Text strong>难度</Typography.Text>
                    <Select
                      options={DIFFICULTY_TABS.map((tab) => ({ label: tab.label, value: tab.key }))}
                      value={form.difficulty_label}
                      onChange={(value) => onChange({ ...form, difficulty_label: value })}
                    />
                  </label>
                  <label className="atcoderEditorInlineField">
                    <Typography.Text strong>提交数</Typography.Text>
                    <Input value={form.total_submit} onChange={(event) => onChange({ ...form, total_submit: event.target.value })} />
                  </label>
                  <label className="atcoderEditorInlineField">
                    <Typography.Text strong>通过数</Typography.Text>
                    <Input value={form.total_accepted} onChange={(event) => onChange({ ...form, total_accepted: event.target.value })} />
                  </label>
                  <label className="atcoderEditorInlineField">
                    <Typography.Text strong>通过率</Typography.Text>
                    <Input placeholder="0.5 或留空" value={form.acceptance_rate} onChange={(event) => onChange({ ...form, acceptance_rate: event.target.value })} />
                  </label>
                </Flex>
                <label>
                  <Typography.Text strong>算法范畴</Typography.Text>
                  <Select
                    mode="multiple"
                    optionFilterProp="label"
                    options={algorithmDomainOptions}
                    placeholder="选择算法范畴"
                    value={form.algorithm_domains.map((item) => item.id)}
                    onChange={(values) => onChange({
                      ...form,
                      algorithm_domains: labelsFromSelectedValues(values, algorithmDomainOptions)
                    })}
                  />
                </label>
                <label>
                  <Typography.Text strong>题型标签</Typography.Text>
                  <Select
                    mode="multiple"
                    optionFilterProp="label"
                    options={problemTypeOptions}
                    placeholder="选择题型标签"
                    value={form.problem_type_tags.map((item) => item.id)}
                    onChange={(values) => onChange({
                      ...form,
                      problem_type_tags: labelsFromSelectedValues(values, problemTypeOptions)
                    })}
                  />
                </label>
                <label>
                  <Typography.Text strong>知识点</Typography.Text>
                  <Select
                    mode="multiple"
                    optionFilterProp="label"
                    options={knowledgePointOptions}
                    placeholder="选择知识点"
                    value={form.knowledge_points.map((item) => item.id)}
                    onChange={(values) => onChange({
                      ...form,
                      knowledge_points: labelsFromSelectedValues(values, knowledgePointOptions)
                    })}
                  />
                </label>
              </Space>
            )
          },
          {
            key: "statement",
            label: "题面样例",
            children: (
              <Space className="atcoderEditorForm" orientation="vertical" size={12}>
                <Flex align="center" justify="space-between" gap={12}>
                  <Typography.Text strong>题面段落</Typography.Text>
                  <Button icon={<Plus size={14} />} onClick={addStatementSection} size="small">添加段落</Button>
                </Flex>
                <Space className="editorListBlock" orientation="vertical" size={10}>
                  {form.statement_sections.map((section, index) => (
                    <Card
                      className="editorItemCard"
                      key={section.id || index}
                      size="small"
                      title={`段落 ${index + 1}`}
                      extra={(
                        <Button
                          aria-label="删除段落"
                          disabled={form.statement_sections.length <= 1}
                          icon={<Trash2 size={14} />}
                          onClick={() => removeStatementSection(index)}
                          size="small"
                          type="text"
                        />
                      )}
                    >
                      <Space orientation="vertical" size={8}>
                        <label>
                          <Typography.Text strong>标题</Typography.Text>
                          <Input value={section.title} onChange={(event) => updateStatementSection(index, { title: event.target.value })} />
                        </label>
                        <label>
                          <Typography.Text strong>内容</Typography.Text>
                          <RichMarkdownEditor
                            ariaLabel={`段落 ${index + 1} 内容`}
                            height={260}
                            value={section.markdown}
                            onChange={(markdown) => updateStatementSection(index, { markdown })}
                          />
                        </label>
                      </Space>
                    </Card>
                  ))}
                </Space>
                <Flex gap={12} wrap="wrap">
                  <label className="atcoderEditorInlineField">
                    <Typography.Text strong>时间限制 ms</Typography.Text>
                    <Input placeholder="留空表示未知" value={form.time_ms} onChange={(event) => onChange({ ...form, time_ms: event.target.value })} />
                  </label>
                  <label className="atcoderEditorInlineField">
                    <Typography.Text strong>内存限制 KB</Typography.Text>
                    <Input placeholder="留空表示未知" value={form.memory_kb} onChange={(event) => onChange({ ...form, memory_kb: event.target.value })} />
                  </label>
                </Flex>
                <Flex align="center" justify="space-between" gap={12}>
                  <Typography.Text strong>输入输出样例</Typography.Text>
                  <Button icon={<Plus size={14} />} onClick={addSampleCase} size="small">添加样例</Button>
                </Flex>
                {form.sample_cases.length ? (
                  <Space className="editorListBlock" orientation="vertical" size={10}>
                    {form.sample_cases.map((sample, index) => (
                      <Card
                        className="editorItemCard"
                        key={sample.id || index}
                        size="small"
                        title={`样例 ${index + 1}`}
                        extra={(
                          <Button aria-label="删除样例" icon={<Trash2 size={14} />} onClick={() => removeSampleCase(index)} size="small" type="text" />
                        )}
                      >
                        <Flex gap={12} wrap="wrap">
                          <label className="editorHalfField">
                            <Typography.Text strong>输入</Typography.Text>
                            <RichMarkdownEditor
                              ariaLabel={`样例 ${index + 1} 输入`}
                              height={180}
                              preview="edit"
                              value={sample.input}
                              onChange={(input) => updateSampleCase(index, { input })}
                            />
                          </label>
                          <label className="editorHalfField">
                            <Typography.Text strong>输出</Typography.Text>
                            <RichMarkdownEditor
                              ariaLabel={`样例 ${index + 1} 输出`}
                              height={180}
                              preview="edit"
                              value={sample.output}
                              onChange={(output) => updateSampleCase(index, { output })}
                            />
                          </label>
                        </Flex>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无样例" />
                )}
                <Flex align="center" justify="space-between" gap={12}>
                  <Typography.Text strong>题目图片</Typography.Text>
                  <Upload {...imageUploadProps}>
                    <Button icon={<UploadIcon size={14} />} size="small">上传图片</Button>
                  </Upload>
                </Flex>
                {form.visual_assets.length ? (
                  <Space className="editorListBlock" orientation="vertical" size={10}>
                    {form.visual_assets.map((asset, index) => (
                      <Card
                        className="editorItemCard"
                        key={asset.id || index}
                        size="small"
                        title={`图片 ${index + 1}`}
                        extra={<Button aria-label="删除图片" icon={<Trash2 size={14} />} onClick={() => removeVisualAsset(index)} size="small" type="text" />}
                      >
                        <Flex className="editorImageRow" gap={12} wrap="wrap">
                          <Image alt={asset.alt_text || "题目图片"} className="editorImagePreview" src={asset.asset_url} />
                          <Space className="editorImageFields" orientation="vertical" size={8}>
                            <label>
                              <Typography.Text strong>图片说明</Typography.Text>
                              <Input value={asset.alt_text} onChange={(event) => updateVisualAsset(index, { alt_text: event.target.value })} />
                            </label>
                            <label>
                              <Typography.Text strong>来源链接</Typography.Text>
                              <Input value={asset.source_url} onChange={(event) => updateVisualAsset(index, { source_url: event.target.value })} />
                            </label>
                          </Space>
                        </Flex>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无图片" />
                )}
                <label>
                  <Typography.Text strong>题面备注</Typography.Text>
                  <Input.TextArea rows={3} value={form.statement_notes} onChange={(event) => onChange({ ...form, statement_notes: event.target.value })} />
                </label>
                <label>
                  <Typography.Text strong>图片备注</Typography.Text>
                  <Input.TextArea rows={2} value={form.visual_notes} onChange={(event) => onChange({ ...form, visual_notes: event.target.value })} />
                </label>
              </Space>
            )
          },
          {
            key: "answer",
            label: "答案代码",
            children: (
              <Space className="atcoderEditorForm" orientation="vertical" size={12}>
                <label>
                  <Typography.Text strong>答案区域</Typography.Text>
                  <Input.TextArea rows={4} value={form.answer} onChange={(event) => onChange({ ...form, answer: event.target.value })} />
                </label>
                <label>
                  <Typography.Text strong>参考思路</Typography.Text>
                  <Input.TextArea rows={5} value={form.solution_outline} onChange={(event) => onChange({ ...form, solution_outline: event.target.value })} />
                </label>
                <label>
                  <Typography.Text strong>复核提示</Typography.Text>
                  <Input.TextArea rows={3} value={form.review_note} onChange={(event) => onChange({ ...form, review_note: event.target.value })} />
                </label>
                <Flex gap={12} wrap="wrap">
                  <label className="atcoderEditorInlineField">
                    <Typography.Text strong>算法</Typography.Text>
                    <Input value={form.solution_algorithm} onChange={(event) => onChange({ ...form, solution_algorithm: event.target.value })} />
                  </label>
                  <label className="atcoderEditorInlineField">
                    <Typography.Text strong>复杂度</Typography.Text>
                    <Input value={form.solution_complexity} onChange={(event) => onChange({ ...form, solution_complexity: event.target.value })} />
                  </label>
                </Flex>
                <label>
                  <Typography.Text strong>C++ 参考解</Typography.Text>
                  <Input.TextArea rows={16} value={form.solution_code} onChange={(event) => onChange({ ...form, solution_code: event.target.value })} />
                </label>
                <label>
                  <Typography.Text strong>AI 生成提示</Typography.Text>
                  <Input.TextArea rows={3} value={form.solution_notice} onChange={(event) => onChange({ ...form, solution_notice: event.target.value })} />
                </label>
                <label>
                  <Typography.Text strong>参考答案说明</Typography.Text>
                  <Input.TextArea rows={3} value={form.solution_reference} onChange={(event) => onChange({ ...form, solution_reference: event.target.value })} />
                </label>
                <label>
                  <Typography.Text strong>代码备注，每行一条</Typography.Text>
                  <Input.TextArea rows={4} value={form.solution_notes} onChange={(event) => onChange({ ...form, solution_notes: event.target.value })} />
                </label>
              </Space>
            )
          }
        ]}
      />
    </Modal>
  );

  function handleEditorOpenChange(open: boolean) {
    if (!open) {
      restoreDocumentScrollAfterModalClose();
    }
  }
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

function collectAtCoderLabelOptions(domains: AtCoderDomainGroup[]): AtCoderLabelOptionGroups {
  const algorithmDomains = new Map<string, string>();
  const problemTypeTags = new Map<string, string>();
  const knowledgePoints = new Map<string, string>();

  for (const domain of domains) {
    algorithmDomains.set(domain.domain_id, domain.domain_label);
    for (const type of domain.problem_types) {
      problemTypeTags.set(type.problem_type_id, type.problem_type_label);
      for (const point of type.knowledge_points) {
        knowledgePoints.set(point.id, point.label);
      }
      for (const problem of type.problems) {
        for (const item of problem.knowledge_points) {
          knowledgePoints.set(item.id, item.label);
        }
      }
    }
  }

  if (!algorithmDomains.size) {
    algorithmDomains.set("user_custom", "自定义");
  }
  if (!problemTypeTags.size) {
    problemTypeTags.set("user_custom", "自定义");
  }
  if (!knowledgePoints.size) {
    knowledgePoints.set("user_custom", "自定义维护");
  }

  return {
    algorithmDomains: mapToSortedOptions(algorithmDomains),
    problemTypeTags: mapToSortedOptions(problemTypeTags),
    knowledgePoints: mapToSortedOptions(knowledgePoints)
  };
}

function mapToSortedOptions(values: Map<string, string>): LabelSelectOption[] {
  return [...values.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => {
      if (a.value === "uncategorized") {
        return 1;
      }
      if (b.value === "uncategorized") {
        return -1;
      }
      return a.label.localeCompare(b.label, "zh-CN");
    });
}

function mergeSelectedLabelOptions(options: LabelSelectOption[], selected: AtCoderProblem["knowledge_points"]): LabelSelectOption[] {
  const merged = new Map(options.map((option) => [option.value, option.label]));
  for (const item of selected) {
    merged.set(item.id, item.label);
  }
  return mapToSortedOptions(merged);
}

function labelsFromSelectedValues(values: string[], options: LabelSelectOption[]): AtCoderProblem["knowledge_points"] {
  const optionLabelByValue = new Map(options.map((option) => [option.value, option.label]));
  return values.map((value) => ({
    id: value,
    label: optionLabelByValue.get(value) || value
  }));
}

function emptyEditorForm(difficultyLabel: string): EditorForm {
  const pid = "";
  const sourceUrl = "https://www.luogu.com.cn/problem/";
  return {
    pid,
    title: "",
    title_zh: "",
    source_url: sourceUrl,
    difficulty_label: difficultyLabel,
    total_submit: "0",
    total_accepted: "0",
    acceptance_rate: "",
    algorithm_domains: [{ id: "user_custom", label: "自定义" }],
    problem_type_tags: [{ id: "user_custom", label: "自定义" }],
    knowledge_points: [{ id: "user_custom", label: "自定义维护" }],
    statement_sections: [
      { id: "description", title: "题目描述", markdown: "" },
      { id: "input", title: "输入格式", markdown: "" },
      { id: "output", title: "输出格式", markdown: "" },
      { id: "hint", title: "说明/提示", markdown: "" }
    ],
    sample_cases: [],
    time_ms: "",
    memory_kb: "",
    statement_notes: "用户新增题目，题面待完善。",
    visual_assets: [],
    visual_notes: "",
    answer: "当前答案是 AI 生成，仅供参考。请在这里补充参考答案或思路。",
    solution_outline: "当前答案是 AI 生成，仅供参考；不是官方题解，正式提交前请复核。",
    review_note: "当前答案是 AI 生成，仅供参考；不是官方题解。",
    solution_code: "",
    solution_algorithm: "",
    solution_complexity: "",
    solution_notice: "当前答案是 AI 生成，仅供参考；不是官方题解。",
    solution_reference: "当前答案是 AI 生成，仅供参考。",
    solution_notes: "正式使用前建议继续用洛谷或 AtCoder 评测。"
  };
}

function problemToEditorForm(problem: AtCoderProblem): EditorForm {
  return {
    pid: problem.pid,
    title: problem.title,
    title_zh: problem.title_zh,
    source_url: problem.source_url,
    difficulty_label: problem.difficulty_label,
    total_submit: String(problem.total_submit),
    total_accepted: String(problem.total_accepted),
    acceptance_rate: problem.acceptance_rate === null ? "" : String(problem.acceptance_rate),
    algorithm_domains: problem.algorithm_domains,
    problem_type_tags: problem.problem_type_tags,
    knowledge_points: problem.knowledge_points,
    statement_sections: problem.statement.sections.length ? problem.statement.sections : [{ id: "description", title: "题目描述", markdown: "" }],
    sample_cases: problem.statement.samples,
    time_ms: problem.statement.limits.time_ms === null ? "" : String(problem.statement.limits.time_ms),
    memory_kb: problem.statement.limits.memory_kb === null ? "" : String(problem.statement.limits.memory_kb),
    statement_notes: problem.statement.notes.join("\n"),
    visual_assets: problem.visual_assets.assets,
    visual_notes: problem.visual_assets.notes.join("\n"),
    answer: problem.answer_guidance.answer,
    solution_outline: problem.answer_guidance.solution_outline,
    review_note: problem.answer_guidance.review_note,
    solution_code: problem.programming_solution.code || "",
    solution_algorithm: problem.programming_solution.algorithm,
    solution_complexity: problem.programming_solution.complexity,
    solution_notice: problem.programming_solution.ai_generation_notice,
    solution_reference: problem.programming_solution.reference_answer,
    solution_notes: problem.programming_solution.notes.join("\n")
  };
}

function editorFormToProblemPayload(form: EditorForm, currentProblem: AtCoderProblem | null): Partial<AtCoderProblem> {
  const difficulty = DIFFICULTY_TABS.find((tab) => tab.key === form.difficulty_label)?.difficulty || 3;
  const sourceUrl = form.source_url.trim() || `https://www.luogu.com.cn/problem/${form.pid}`;
  const statementSections = normalizeStatementSections(form.statement_sections);
  const sampleCases = normalizeSampleCases(form.sample_cases);
  const visualAssets = normalizeVisualAssets(form.visual_assets);
  const solutionCode = form.solution_code.trim();

  return {
    pid: form.pid.trim(),
    title: form.title.trim(),
    title_zh: form.title_zh.trim(),
    title_zh_source: currentProblem?.title_zh_source || "user_input",
    source_url: sourceUrl,
    difficulty: difficulty as AtCoderProblem["difficulty"],
    difficulty_label: form.difficulty_label as AtCoderProblem["difficulty_label"],
    total_submit: parseIntegerField(form.total_submit, "提交数"),
    total_accepted: parseIntegerField(form.total_accepted, "通过数"),
    acceptance_rate: form.acceptance_rate.trim() ? Number(form.acceptance_rate) : null,
    algorithm_domains: form.algorithm_domains,
    problem_type_tags: form.problem_type_tags,
    knowledge_points: form.knowledge_points,
    tags: currentProblem?.tags || [],
    statement: {
      ...(currentProblem?.statement || {
        status: "source_extracted",
        locale: "zh-CN",
        source_terms_status: "needs_review",
        atcoder_url: null
      }),
      status: "source_extracted",
      locale: currentProblem?.statement.locale || "zh-CN",
      source_terms_status: "needs_review",
      source_url: sourceUrl,
      atcoder_url: currentProblem?.statement.atcoder_url || null,
      sections: statementSections,
      samples: sampleCases,
      limits: {
        time_ms: parseOptionalIntegerField(form.time_ms, "时间限制"),
        memory_kb: parseOptionalIntegerField(form.memory_kb, "内存限制")
      },
      notes: splitEditorLines(form.statement_notes)
    },
    visual_assets: {
      ...(currentProblem?.visual_assets || {}),
      status: visualAssets.length ? "source_extracted" : "none_found",
      assets: visualAssets,
      notes: splitEditorLines(form.visual_notes)
    },
    answer_guidance: {
      ...(currentProblem?.answer_guidance || {
        status: "reference_link",
        source: "luogu_problem_page",
        knowledge_points: []
      }),
      answer: form.answer,
      source: "luogu_problem_page",
      source_url: sourceUrl,
      solution_outline: form.solution_outline,
      review_note: form.review_note || "当前答案是 AI 生成，仅供参考；不是官方题解。"
    },
    programming_solution: {
      ...(currentProblem?.programming_solution || {
        status: "needs_review",
        language: "C++17",
        content_origin: "local_ai_generated_reference",
        verification: null
      }),
      status: "needs_review",
      language: "C++17",
      code: solutionCode || null,
      content_origin: solutionCode
        ? currentProblem?.programming_solution.content_origin === "ai_generated_sample_verified"
          ? "ai_generated_sample_verified"
          : "local_ai_generated_reference"
        : "local_ai_generated_reference",
      ai_generation_notice: form.solution_notice || "当前答案是 AI 生成，仅供参考；不是官方题解。",
      reference_answer: form.solution_reference || "当前答案是 AI 生成，仅供参考。",
      algorithm: form.solution_algorithm,
      complexity: form.solution_complexity,
      verification: solutionCode ? currentProblem?.programming_solution.verification || null : null,
      notes: form.solution_notes.split("\n").map((line) => line.trim()).filter(Boolean)
    }
  };
}

function parseIntegerField(value: string, label: string) {
  const numeric = Number(value || 0);
  if (!Number.isInteger(numeric) || numeric < 0) {
    throw new Error(`${label} 必须是非负整数`);
  }
  return numeric;
}

function parseOptionalIntegerField(value: string, label: string) {
  if (!value.trim()) {
    return null;
  }
  return parseIntegerField(value, label);
}

function normalizeStatementSections(sections: AtCoderStatementSection[]) {
  const normalized = sections
    .map((section, index) => ({
      id: section.id || `section_${index + 1}`,
      title: section.title.trim() || `段落 ${index + 1}`,
      markdown: section.markdown
    }))
    .filter((section) => section.title.trim() || section.markdown.trim());

  return normalized.length ? normalized : [{ id: "description", title: "题目描述", markdown: "" }];
}

function normalizeSampleCases(samples: AtCoderProblem["statement"]["samples"]) {
  return samples
    .map((sample, index) => ({
      id: sample.id || `sample_${index + 1}`,
      input: sample.input,
      output: sample.output
    }))
    .filter((sample) => sample.input.trim() || sample.output.trim());
}

function normalizeVisualAssets(assets: EditorVisualAsset[]) {
  return assets
    .map((asset, index) => ({
      ...asset,
      id: asset.id || `asset_${index + 1}`,
      section_id: asset.section_id || "",
      source_url: asset.source_url || asset.asset_url,
      alt_text: asset.alt_text.trim() || `题目图片 ${index + 1}`,
      status: asset.status || "downloaded",
      local_path: asset.local_path ?? null,
      asset_url: asset.asset_url
    }))
    .filter((asset) => asset.asset_url.trim());
}

function splitEditorLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function createEditorId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function stripFileExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, "");
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("FileReader result is not a string"));
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}

function restoreDocumentScrollAfterModalClose() {
  const restore = () => {
    if (document.querySelector(".ant-modal-wrap") || document.querySelector(".ant-modal-mask")) {
      return;
    }
    if (document.body.style.overflow.includes("hidden")) {
      document.body.style.overflow = "";
    }
    if (document.body.style.width) {
      document.body.style.width = "";
    }
    if (document.body.style.paddingRight) {
      document.body.style.paddingRight = "";
    }
  };

  window.setTimeout(restore, 0);
  window.setTimeout(restore, 180);
}
