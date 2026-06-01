import {
  AlertTriangle,
  Binary,
  BookOpenCheck,
  CheckCircle2,
  Code2,
  Database,
  ExternalLink,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Layers3,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DomainGroup, EffectiveStatus, LevelCatalog, LevelSummary, ProblemDetailResponse, ProblemMutationPayload, ProblemSummary, ReviewQueueSummary } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const statusLabel: Record<EffectiveStatus, string> = {
  confirmed: "已确认",
  candidate: "候选",
  needs_review: "待复核",
  conflict: "冲突"
};

const typeLabel: Record<string, string> = {
  selection: "选择",
  judgment: "判断",
  programming: "编程"
};

const answerStatusLabel: Record<string, string> = {
  confirmed: "官方答案",
  reference_link: "参考入口",
  needs_review: "答案待复核"
};

function formatConfidence(value?: number) {
  if (typeof value !== "number") {
    return "";
  }
  return `${Math.round(value * 100)}%`;
}

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

type EditorMode = "create" | "edit";
type VisualAsset = NonNullable<ProblemDetailResponse["detail"]>["visual_assets"]["assets"][number];
type PreviewAsset = Pick<VisualAsset, "id" | "asset_url" | "alt_text" | "source_url" | "source_page">;

type ProblemEditorForm = {
  canonical_problem_id: string;
  title: string;
  session: string;
  level: string;
  question_type: ProblemMutationPayload["question_type"];
  question_number: string;
  algorithm_domains: string;
  problem_types: string;
  knowledge_points: string;
  statement: string;
  answer: string;
  explanation: string;
  solution_code: string;
  choice_options: string;
  sample_cases: string;
  visual_assets: string;
  source_url: string;
  source_title: string;
};

function emptyEditorForm(level: number): ProblemEditorForm {
  return {
    canonical_problem_id: "",
    title: "",
    session: "user",
    level: String(level),
    question_type: "programming",
    question_number: "",
    algorithm_domains: "基础程序设计",
    problem_types: "",
    knowledge_points: "",
    statement: "",
    answer: "",
    explanation: "",
    solution_code: "",
    choice_options: "",
    sample_cases: "",
    visual_assets: "",
    source_url: "",
    source_title: ""
  };
}

export default function App() {
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(5);
  const [catalog, setCatalog] = useState<LevelCatalog | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewQueueSummary | null>(null);
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [editorForm, setEditorForm] = useState<ProblemEditorForm>(() => emptyEditorForm(5));
  const [saving, setSaving] = useState(false);
  const editorPaneRef = useRef<HTMLElement | null>(null);
  const detailPaneRef = useRef<HTMLElement | null>(null);
  const pendingSelectionRef = useRef<{ problemId: string; domainId?: string } | null>(null);

  useEffect(() => {
    void loadShell();
  }, []);

  useEffect(() => {
    void loadCatalogLevel(selectedLevel);
  }, [selectedLevel]);

  async function loadShell() {
    return Promise.all([
      fetchJson<{ levels: LevelSummary[] }>("/catalog/levels"),
      fetchJson<ReviewQueueSummary>("/catalog/review-queue/summary")
    ])
      .then(([levelResponse, reviewResponse]) => {
        setLevels(levelResponse.levels);
        setReviewSummary(reviewResponse);
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

  function openProblem(problemId: string) {
    setSelectedProblemId(problemId);
    setDetailLoading(true);
    detailPaneRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
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

  function startCreate() {
    setEditorMode("create");
    setEditorForm(emptyEditorForm(selectedLevel));
    window.setTimeout(() => editorPaneRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  }

  function startEdit() {
    if (!selectedProblem) {
      setError("请先选择一道题目再修改");
      return;
    }
    setEditorMode("edit");
    setEditorForm(formFromProblem(selectedProblem));
    window.setTimeout(() => editorPaneRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 0);
  }

  async function saveEditor() {
    setSaving(true);
    setError(null);
    try {
      const currentForm = readEditorForm(editorPaneRef.current, editorForm);
      setEditorForm(currentForm);
      const payload = formToPayload(currentForm);
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

  async function deleteSelectedProblem() {
    if (!selectedProblem) {
      setError("请先选择一道题目再删除");
      return;
    }
    const confirmed = window.confirm(`确认删除「${selectedProblem.title}」吗？这个操作会从当前 MySQL 目录中移除题目、详情、答案和来源记录。`);
    if (!confirmed) {
      return;
    }
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow"><Database size={16} /> C++ 官方真题分类数据</div>
          <h1>GESP C++ 题型分类目录</h1>
        </div>
        <button className="iconButton" type="button" title="刷新目录" onClick={() => window.location.reload()}>
          <RefreshCw size={18} />
        </button>
      </header>

      <section className="actionBar">
        <button className="textButton" type="button" onClick={startCreate}>
          <Plus size={16} /> 新增题目
        </button>
        <button className="textButton" type="button" disabled={!selectedProblem} onClick={startEdit}>
          <Pencil size={16} /> 修改当前
        </button>
        <button className="textButton danger" type="button" disabled={!selectedProblem || saving} onClick={deleteSelectedProblem}>
          <Trash2 size={16} /> 删除当前
        </button>
      </section>

      <section className="levelRail" aria-label="等级">
        {levels.map((level) => (
          <button
            className={level.level === selectedLevel ? "levelButton active" : "levelButton"}
            key={level.level}
            type="button"
            onClick={() => setSelectedLevel(level.level)}
          >
            <span>{level.level} 级</span>
            <strong>{level.problem_count}</strong>
          </button>
        ))}
      </section>

      {error ? <div className="notice"><AlertTriangle size={18} /> {error}</div> : null}

      <section className="metricGrid">
        <Metric icon={<Layers3 size={18} />} label="题目" value={catalog?.summary.problem_count ?? 0} />
        <Metric icon={<GitBranch size={18} />} label="算法范畴" value={catalog?.domains.length ?? 0} />
        <Metric icon={<Binary size={18} />} label="题型" value={catalog?.summary.problem_type_count ?? 0} />
        <Metric icon={<ListChecks size={18} />} label="知识点" value={catalog?.summary.knowledge_point_count ?? 0} />
        <Metric icon={<AlertTriangle size={18} />} label="复核项" value={reviewSummary?.summary.total_count ?? 0} tone="warn" />
      </section>

      <section className="workspace">
        <aside className="domainNav">
          <div className="paneTitle">算法范畴</div>
          {catalog?.domains.map((domain) => (
            <button
              key={domain.domain_id}
              type="button"
              className={domain.domain_id === activeDomain?.domain_id ? "domainButton active" : "domainButton"}
              onClick={() => setActiveDomainId(domain.domain_id)}
            >
              <span>{domain.domain_label}</span>
              <strong>{domain.problem_count}</strong>
            </button>
          ))}
        </aside>

        <section className="catalogPane">
          {loading ? <div className="empty">加载中</div> : null}
          {!loading && activeDomain ? <DomainPanel domain={activeDomain} selectedProblemId={selectedProblemId} onProblemSelect={openProblem} /> : null}
        </section>

        <aside className="sidePane">
          {editorMode ? (
            <section className="editorPane" ref={editorPaneRef}>
              <ProblemEditorPanel
                form={editorForm}
                mode={editorMode}
                onCancel={() => setEditorMode(null)}
                onChange={setEditorForm}
                onSave={saveEditor}
                saving={saving}
              />
            </section>
          ) : null}

          <section className="detailPane" ref={detailPaneRef}>
            <div className="paneTitle">题目详情</div>
            <ProblemDetailPanel
              loading={detailLoading}
              problem={selectedProblem}
              onClose={() => {
                setSelectedProblemId(null);
                setSelectedProblem(null);
              }}
            />
          </section>

          <section className="reviewPane">
            <div className="paneTitle">复核队列</div>
            <div className="reviewStats">
              <span>High {reviewSummary?.summary.by_priority.high ?? 0}</span>
              <span>Medium {reviewSummary?.summary.by_priority.medium ?? 0}</span>
              <span>Low {reviewSummary?.summary.by_priority.low ?? 0}</span>
            </div>
            <div className="queueList">
              {reviewSummary?.high_priority.map((item) => (
                <div className="queueItem" key={item.id}>
                  <AlertTriangle size={16} />
                  <div>
                    <strong>{item.type}</strong>
                    <span>{item.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function formFromProblem(problem: ProblemDetailResponse): ProblemEditorForm {
  const statement = problem.detail?.statement.sections?.map((section) => section.markdown).join("\n\n")
    || problem.detail?.statement.stem
    || "";
  return {
    canonical_problem_id: problem.id,
    title: problem.title,
    session: problem.session,
    level: String(problem.level),
    question_type: problem.question_type,
    question_number: String(problem.question_number),
    algorithm_domains: problem.resolved_algorithm_domains.map((tag) => tag.label).join(", "),
    problem_types: problem.resolved_problem_type_tags.map((tag) => tag.label).join(", "),
    knowledge_points: problem.resolved_knowledge_point_tags.map((tag) => tag.label).join(", "),
    statement,
    answer: problem.answer_guidance?.reference_answer.answer || "",
    explanation: problem.answer_guidance?.understanding_example.summary || "",
    solution_code: problem.detail?.programming_solution.code || "",
    choice_options: problem.detail?.choice_options.options.map((option) => `${option.key}. ${option.text}`).join("\n") || "",
    sample_cases: problem.detail?.sample_cases.cases.map((sample) => `${sample.input} => ${sample.output}`).join("\n") || "",
    visual_assets: problem.detail?.visual_assets.assets.map((asset) => `${asset.asset_url} | ${asset.alt_text}`).join("\n") || "",
    source_url: problem.detail?.source_links.find((source) => source.url || source.source_url)?.url
      || problem.detail?.source_links.find((source) => source.url || source.source_url)?.source_url
      || "",
    source_title: problem.detail?.source_links.find((source) => source.url || source.source_url)?.title || ""
  };
}

function splitList(value: string) {
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}

function readEditorForm(container: HTMLElement | null, fallback: ProblemEditorForm): ProblemEditorForm {
  if (!container) {
    return fallback;
  }
  const read = (key: keyof ProblemEditorForm) => {
    const element = container.querySelector(`[name="${key}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    return element?.value ?? fallback[key];
  };
  return {
    canonical_problem_id: read("canonical_problem_id"),
    title: read("title"),
    session: read("session"),
    level: read("level"),
    question_type: read("question_type") as ProblemEditorForm["question_type"],
    question_number: read("question_number"),
    algorithm_domains: read("algorithm_domains"),
    problem_types: read("problem_types"),
    knowledge_points: read("knowledge_points"),
    statement: read("statement"),
    answer: read("answer"),
    explanation: read("explanation"),
    solution_code: read("solution_code"),
    choice_options: read("choice_options"),
    sample_cases: read("sample_cases"),
    visual_assets: read("visual_assets"),
    source_url: read("source_url"),
    source_title: read("source_title")
  };
}

function parseChoiceOptions(value: string): ProblemMutationPayload["choice_options"] {
  const lines = value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return undefined;
  }
  return lines.map((line, index) => {
    const matched = line.match(/^([A-Za-z0-9])[\s.．、:：-]+(.+)$/);
    return {
      key: matched?.[1]?.toUpperCase() || String.fromCharCode(65 + index),
      text: (matched?.[2] || line).trim()
    };
  });
}

function parseSampleCases(value: string): ProblemMutationPayload["sample_cases"] {
  const lines = value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return undefined;
  }
  return lines.map((line) => {
    const [input = "", output = ""] = line.split(/\s*=>\s*/);
    return { input: input.trim(), output: output.trim() };
  }).filter((sample) => sample.input || sample.output);
}

function parseVisualAssets(value: string): ProblemMutationPayload["visual_assets"] {
  const lines = value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return undefined;
  }
  return lines.map((line) => {
    const [assetUrl = "", altText = "用户维护的题目图片"] = line.split(/\s*\|\s*/);
    return {
      asset_url: assetUrl.trim(),
      alt_text: altText.trim() || "用户维护的题目图片"
    };
  }).filter((asset) => asset.asset_url);
}

function formToPayload(form: ProblemEditorForm): ProblemMutationPayload {
  return {
    canonical_problem_id: form.canonical_problem_id || undefined,
    title: form.title,
    session: form.session || undefined,
    level: Number(form.level),
    question_type: form.question_type,
    question_number: form.question_number ? Number(form.question_number) : undefined,
    algorithm_domains: splitList(form.algorithm_domains),
    problem_types: splitList(form.problem_types),
    knowledge_points: splitList(form.knowledge_points),
    statement: form.statement || undefined,
    answer: form.answer || undefined,
    explanation: form.explanation || undefined,
    solution_code: form.solution_code || undefined,
    choice_options: parseChoiceOptions(form.choice_options),
    sample_cases: parseSampleCases(form.sample_cases),
    visual_assets: parseVisualAssets(form.visual_assets),
    source_url: form.source_url || undefined,
    source_title: form.source_title || undefined
  };
}

function ProblemEditorPanel({ form, mode, onCancel, onChange, onSave, saving }: {
  form: ProblemEditorForm;
  mode: EditorMode;
  onCancel: () => void;
  onChange: (form: ProblemEditorForm) => void;
  onSave: () => void;
  saving: boolean;
}) {
  function update<K extends keyof ProblemEditorForm>(key: K, value: ProblemEditorForm[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="editorForm">
      <div className="editorHeader">
        <div>
          <div className="paneTitle">{mode === "create" ? "新增题目" : "修改题目"}</div>
          <p>用户维护内容默认保留待复核，不作为官方答案。</p>
        </div>
        <button className="iconButton small" type="button" title="关闭编辑" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>

      <label>
        <span>题目 ID</span>
        <input disabled={mode === "edit"} name="canonical_problem_id" value={form.canonical_problem_id} onChange={(event) => update("canonical_problem_id", event.target.value)} placeholder="留空自动生成" />
      </label>
      <label>
        <span>标题</span>
        <input name="title" value={form.title} onChange={(event) => update("title", event.target.value)} />
      </label>
      <div className="editorGrid">
        <label>
          <span>等级</span>
          <input min={1} max={8} name="level" type="number" value={form.level} onChange={(event) => update("level", event.target.value)} />
        </label>
        <label>
          <span>题号</span>
          <input min={1} name="question_number" type="number" value={form.question_number} onChange={(event) => update("question_number", event.target.value)} />
        </label>
      </div>
      <label>
        <span>题型</span>
        <select name="question_type" value={form.question_type} onChange={(event) => update("question_type", event.target.value as ProblemMutationPayload["question_type"])}>
          <option value="programming">编程</option>
          <option value="selection">选择</option>
          <option value="judgment">判断</option>
        </select>
      </label>
      <label>
        <span>算法范畴</span>
        <input name="algorithm_domains" value={form.algorithm_domains} onChange={(event) => update("algorithm_domains", event.target.value)} placeholder="基础程序设计, 字符串" />
      </label>
      <label>
        <span>题型标签</span>
        <input name="problem_types" value={form.problem_types} onChange={(event) => update("problem_types", event.target.value)} placeholder="数组标记型, 回文判断型" />
      </label>
      <label>
        <span>知识点</span>
        <input name="knowledge_points" value={form.knowledge_points} onChange={(event) => update("knowledge_points", event.target.value)} placeholder="布尔标记, 双指针" />
      </label>
      <label>
        <span>题面</span>
        <textarea name="statement" rows={5} value={form.statement} onChange={(event) => update("statement", event.target.value)} />
      </label>
      <label>
        <span>选择题选项</span>
        <textarea name="choice_options" rows={4} value={form.choice_options} onChange={(event) => update("choice_options", event.target.value)} placeholder={"A. 选项内容\nB. 选项内容"} />
      </label>
      <label>
        <span>样例</span>
        <textarea name="sample_cases" rows={3} value={form.sample_cases} onChange={(event) => update("sample_cases", event.target.value)} placeholder="输入 => 输出，每行一组" />
      </label>
      <label>
        <span>图片</span>
        <textarea name="visual_assets" rows={3} value={form.visual_assets} onChange={(event) => update("visual_assets", event.target.value)} placeholder="图片 URL | 图片说明，每行一张" />
      </label>
      <div className="editorGrid">
        <label>
          <span>来源链接</span>
          <input name="source_url" value={form.source_url} onChange={(event) => update("source_url", event.target.value)} placeholder="https://..." />
        </label>
        <label>
          <span>来源标题</span>
          <input name="source_title" value={form.source_title} onChange={(event) => update("source_title", event.target.value)} />
        </label>
      </div>
      <label>
        <span>参考答案</span>
        <textarea name="answer" rows={3} value={form.answer} onChange={(event) => update("answer", event.target.value)} />
      </label>
      <label>
        <span>知识点讲解</span>
        <textarea name="explanation" rows={4} value={form.explanation} onChange={(event) => update("explanation", event.target.value)} />
      </label>
      <label>
        <span>C++ 参考解</span>
        <textarea name="solution_code" rows={6} value={form.solution_code} onChange={(event) => update("solution_code", event.target.value)} />
      </label>
      <div className="editorActions">
        <button className="textButton" type="button" onClick={onCancel}>取消</button>
        <button className="textButton primary" type="button" disabled={saving || !form.title.trim()} onClick={onSave}>
          <Save size={16} /> {saving ? "保存中" : "保存"}
        </button>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "warn" }) {
  return (
    <div className={tone === "warn" ? "metric warn" : "metric"}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DomainPanel({ domain, selectedProblemId, onProblemSelect }: {
  domain: DomainGroup;
  selectedProblemId: string | null;
  onProblemSelect: (problemId: string) => void;
}) {
  const [previewAsset, setPreviewAsset] = useState<PreviewAsset | null>(null);

  return (
    <div>
      <div className="domainHeader">
        <div>
          <div className="eyebrow"><GitBranch size={16} /> {domain.domain_id}</div>
          <h2>{domain.domain_label}</h2>
        </div>
        <StatusStrip counts={domain.status_counts} />
      </div>

      <div className="typeStack">
        {domain.problem_types.map((type) => (
          <section className="typeSection" key={type.problem_type_id}>
            <div className="typeHeader">
              <div>
                <div className="eyebrow"><BookOpenCheck size={16} /> {type.problem_type_id}</div>
                <h3>{type.problem_type_label}</h3>
              </div>
              <strong>{type.problem_count}</strong>
            </div>
            <div className="knowledgeRow">
              {type.knowledge_points.length > 0
                ? type.knowledge_points.map((point) => <span className="chip" key={point.id}>{point.label}</span>)
                : <span className="muted">待补知识点</span>}
            </div>
            <div className="problemList">
              {type.problems.map((problem) => (
                <ProblemRow
                  isSelected={selectedProblemId === problem.id}
                  key={`${type.problem_type_id}:${problem.id}`}
                  onSelect={onProblemSelect}
                  onPreview={setPreviewAsset}
                  problem={problem}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <ImagePreviewOverlay asset={previewAsset} onClose={() => setPreviewAsset(null)} />
    </div>
  );
}

function ProblemRow({ problem, isSelected, onSelect, onPreview }: {
  problem: ProblemSummary;
  isSelected: boolean;
  onSelect: (problemId: string) => void;
  onPreview: (asset: PreviewAsset) => void;
}) {
  const primaryType = problem.problem_type_tags[0];
  const needsSource = problem.detail_completeness?.needs_source_enrichment;
  return (
    <div className={isSelected ? "problemRow active" : "problemRow"}>
      <button className="problemSelectButton" type="button" onClick={() => onSelect(problem.id)}>
        <div className="problemIndex">
          <span>{typeLabel[problem.question_type] || problem.question_type}</span>
          <strong>{problem.question_number}</strong>
        </div>
        <div className="problemMain">
          <div className="problemTitle">{problem.title}</div>
          <div className="problemMeta">
            <StatusBadge status={problem.status} />
            {problem.answer_guidance ? <AnswerBadge guidance={problem.answer_guidance} /> : null}
            {primaryType ? <span>{formatConfidence(primaryType.final_confidence)}</span> : null}
            {needsSource ? <span>题面待补</span> : null}
            {problem.visual_asset_thumbnails.length ? <span>含图片</span> : null}
            {problem.review_queue_count > 0 ? <span>{problem.review_queue_count} 复核</span> : null}
          </div>
          {problem.answer_guidance ? <UnderstandingBlock problem={problem} /> : null}
        </div>
        <div className="problemTags">
          {problem.knowledge_point_tags.slice(0, 3).map((tag) => <span className="tag" key={tag.value}>{tag.label}</span>)}
        </div>
      </button>
      {problem.visual_asset_thumbnails.length ? (
        <div className="problemThumbList">
          {problem.visual_asset_thumbnails.map((asset) => (
            <button className="problemThumbButton" key={asset.id} type="button" title={asset.alt_text || "预览图片"} onClick={() => onPreview(asset)}>
              <img alt={asset.alt_text} src={asset.asset_url} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProblemDetailPanel({ loading, problem, onClose }: {
  loading: boolean;
  problem: ProblemDetailResponse | null;
  onClose: () => void;
}) {
  const [previewAsset, setPreviewAsset] = useState<PreviewAsset | null>(null);

  useEffect(() => {
    setPreviewAsset(null);
  }, [problem?.id]);

  if (loading) {
    return <div className="detailEmpty">加载中</div>;
  }

  if (!problem) {
    return (
      <div className="detailEmpty">
        <FileText size={22} />
        <span>未选择题目</span>
      </div>
    );
  }

  const guidance = problem.answer_guidance;
  const detail = problem.detail;
  const answer = guidance?.reference_answer;
  const example = guidance?.understanding_example;
  const sourceLinks = uniqueSourceLinks(detail?.source_links || guidance?.reference_links || []);

  return (
    <article className="detailCard">
      <div className="detailHeader">
        <div>
          <div className="eyebrow"><FileText size={15} /> {problem.session} / {problem.level} 级 / {typeLabel[problem.question_type]}</div>
          <h2>{problem.title}</h2>
        </div>
        <button className="iconButton small" type="button" title="关闭" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <DetailSection icon={<CheckCircle2 size={16} />} title="参考答案">
        {answer ? <AnswerLine guidance={guidance} /> : <span className="muted">答案待补</span>}
        {guidance?.content_origin === "ai_generated_learning_aid" || detail?.ai_generation_notice ? (
          <div className="aiNotice">{guidance?.ai_generation_notice || detail?.ai_generation_notice}</div>
        ) : null}
      </DetailSection>

      <DetailSection icon={<FileText size={16} />} title="题面">
        {detail ? <StatementBlock detail={detail} /> : <span className="muted">题面待补</span>}
      </DetailSection>

      <DetailSection icon={<ListChecks size={16} />} title="样例">
        {detail ? <SampleCasesBlock detail={detail} /> : <span className="muted">样例待补</span>}
      </DetailSection>

      <DetailSection icon={<BookOpenCheck size={16} />} title="知识点讲解">
        {example ? (
          <div className="explainBlock">
            <p>{example.summary}</p>
            <div className="knowledgeRow tight">
              {example.knowledge_points.map((point) => <span className="chip" key={point}>{point}</span>)}
            </div>
            <ol>
              {example.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="commentLine">
              {example.chinese_comments.map((comment) => <span key={comment}>{comment}</span>)}
            </div>
          </div>
        ) : <span className="muted">讲解待补</span>}
      </DetailSection>

      <DetailSection icon={<ListChecks size={16} />} title="选项">
        {detail?.choice_options.options.length ? (
          <>
            {detail.choice_options.status !== "source_extracted" ? (
              <DataGap status={detail.choice_options.status} notes={detail.choice_options.notes} />
            ) : null}
            <div className="optionList">
              {detail.choice_options.options.map((option) => (
                <div className="optionItem" key={option.key}>
                  <strong>{option.key}</strong>
                  <span>{option.text}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <DataGap status={detail?.choice_options.status || "pending_collection"} notes={detail?.choice_options.notes || []} />
        )}
      </DetailSection>

      <DetailSection icon={<ImageIcon size={16} />} title="图片">
        {detail?.visual_assets.assets.length ? (
          <div className="assetList">
            {detail.visual_assets.assets.map((asset) => (
              <figure className="assetItem" key={asset.id}>
                <button className="assetPreviewButton" type="button" onClick={() => setPreviewAsset(asset)}>
                  <img alt={asset.alt_text} src={asset.asset_url} />
                </button>
                <figcaption>{asset.alt_text}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <DataGap status={detail?.visual_assets.status || "pending_collection"} notes={detail?.visual_assets.notes || []} />
        )}
      </DetailSection>

      {problem.question_type === "programming" ? (
        <DetailSection icon={<Code2 size={16} />} title="C++ 参考解">
          {detail?.programming_solution.code ? (
            <div className="solutionBlock">
              {detail.programming_solution.ai_generation_notice ? (
                <div className="aiNotice">{detail.programming_solution.ai_generation_notice}</div>
              ) : null}
              {detail.programming_solution.algorithm || detail.programming_solution.complexity ? (
                <div className="solutionMeta">
                  {detail.programming_solution.algorithm ? <span>{detail.programming_solution.algorithm}</span> : null}
                  {detail.programming_solution.complexity ? <span>{detail.programming_solution.complexity}</span> : null}
                </div>
              ) : null}
              {detail.programming_solution.verification ? (
                <div className="verificationLine">
                  样例验证：{detail.programming_solution.verification.status} / {detail.programming_solution.verification.sample_count} 组
                </div>
              ) : null}
              <pre className="codeBlock"><code>{detail.programming_solution.code}</code></pre>
            </div>
          ) : (
            <DataGap status={detail?.programming_solution.status || "needs_review"} notes={detail?.programming_solution.notes || []} />
          )}
        </DetailSection>
      ) : null}

      <DetailSection icon={<ExternalLink size={16} />} title="来源">
        <div className="sourceList">
          {sourceLinks.slice(0, 5).map((source) => (
            source.url || source.source_url ? (
              <a href={source.url || source.source_url || ""} key={source.url || source.source_url || source.title || "source"} rel="noreferrer" target="_blank">
                <ExternalLink size={14} />
                <span>{source.title || source.role || source.source_kind || "source"}</span>
              </a>
            ) : null
          ))}
          {detail?.statement.source_page ? <span className="muted">官方 PDF 第 {detail.statement.source_page} 页</span> : null}
        </div>
      </DetailSection>
      <ImagePreviewOverlay asset={previewAsset} onClose={() => setPreviewAsset(null)} />
    </article>
  );
}

function ImagePreviewOverlay({ asset, onClose }: { asset: PreviewAsset | null; onClose: () => void }) {
  useEffect(() => {
    if (!asset) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [asset, onClose]);

  if (!asset) {
    return null;
  }

  return (
    <div className="imagePreviewOverlay" role="dialog" aria-modal="true" aria-label="图片预览" onClick={onClose}>
      <div className="imagePreviewPanel" onClick={(event) => event.stopPropagation()}>
        <div className="imagePreviewHeader">
          <span>{asset.alt_text || "题目图片"}</span>
          <button className="iconButton small" type="button" title="关闭预览" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <img alt={asset.alt_text} src={asset.asset_url} />
        {asset.source_url ? (
          <a className="imagePreviewSource" href={asset.source_url} rel="noreferrer" target="_blank">
            <ExternalLink size={14} />
            <span>查看来源</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

function uniqueSourceLinks<T extends { url?: string | null; source_url?: string | null }>(sources: T[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const url = source.url || source.source_url;
    if (!url || seen.has(url)) {
      return false;
    }
    seen.add(url);
    return true;
  });
}

function DetailSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="detailSection">
      <h3>{icon}{title}</h3>
      {children}
    </section>
  );
}

function AnswerLine({ guidance }: { guidance: NonNullable<ProblemDetailResponse["answer_guidance"]> }) {
  const answer = guidance.reference_answer;
  return (
    <div className="answerLine">
      <AnswerBadge guidance={guidance} />
      {answer.evidence ? <span>{answer.evidence}</span> : null}
    </div>
  );
}

function StatementBlock({ detail }: { detail: NonNullable<ProblemDetailResponse["detail"]> }) {
  const sections = detail.statement.sections?.filter((section) => section.markdown.trim()) || [];
  if (sections.length === 0) {
    return <DataGap status={detail.statement.status} notes={detail.statement.notes || []} />;
  }
  return (
    <div className="statementBlock">
      {detail.statement.source_terms_status ? <span className="sourceTerms">来源条款：{detail.statement.source_terms_status}</span> : null}
      {sections.map((section) => (
        <section key={section.id}>
          <h4>{section.title}</h4>
          <MarkdownText value={section.markdown} />
        </section>
      ))}
    </div>
  );
}

function MarkdownText({ value }: { value: string }) {
  const blocks = value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, (_match, altText: string) => {
      const alt = altText.trim();
      return alt ? `（图片：${alt}，见下方图片）` : "";
    })
    .replace(/^:::[^\n]*(?:\n|$)/gm, "")
    .replace(/^:::$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  return (
    <>
      {blocks.map((block) => <p key={block}>{block}</p>)}
    </>
  );
}

function SampleCasesBlock({ detail }: { detail: NonNullable<ProblemDetailResponse["detail"]> }) {
  if (detail.sample_cases.cases.length === 0) {
    return <DataGap status={detail.sample_cases.status} notes={detail.sample_cases.notes || []} />;
  }
  return (
    <div className="sampleList">
      {detail.sample_cases.cases.map((sample, index) => (
        <div className="samplePair" key={`${sample.input}:${sample.output}:${index}`}>
          <div>
            <span>输入 {index + 1}</span>
            <pre>{sample.input || "(空)"}</pre>
          </div>
          <div>
            <span>输出 {index + 1}</span>
            <pre>{sample.output || "(空)"}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}

function DataGap({ status, notes }: { status: string; notes: string[] }) {
  const statusText: Record<string, string> = {
    pending_collection: "待采集",
    reference_link: "参考入口",
    needs_review: "待复核",
    not_applicable: "不适用",
    source_extracted: "已抽取",
    none_found: "未发现",
    ready: "已准备"
  };
  return (
    <div className="dataGap">
      <span>{statusText[status] || status}</span>
      {notes.slice(0, 2).map((note) => <p key={note}>{note}</p>)}
    </div>
  );
}

function AnswerBadge({ guidance }: { guidance: NonNullable<ProblemSummary["answer_guidance"]> }) {
  const answer = guidance.reference_answer;
  const label = answerStatusLabel[answer.status] || "参考答案";
  const value = answer.answer ? `：${answer.answer}` : "";
  const suffix = guidance.content_origin === "ai_generated_learning_aid" ? " / AI 辅助" : "";
  return <span className={`answerBadge ${answer.status}`}>{label}{value}{suffix}</span>;
}

function UnderstandingBlock({ problem }: { problem: ProblemSummary }) {
  const guidance = problem.answer_guidance;
  if (!guidance) {
    return null;
  }
  const example = guidance.understanding_example;
  return (
    <div className="understanding">
      <p>{example.summary}</p>
      <ol>
        {example.steps.slice(0, 3).map((step) => <li key={step}>{step}</li>)}
      </ol>
      <div className="commentLine">
        {example.chinese_comments.slice(0, 2).map((comment) => <span key={comment}>{comment}</span>)}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EffectiveStatus }) {
  return <span className={`status ${status}`}>{statusLabel[status]}</span>;
}

function StatusStrip({ counts }: { counts: Record<EffectiveStatus, number> }) {
  return (
    <div className="statusStrip">
      <span className="candidate">{counts.candidate}</span>
      <span className="needs_review">{counts.needs_review}</span>
      <span className="conflict">{counts.conflict}</span>
    </div>
  );
}
