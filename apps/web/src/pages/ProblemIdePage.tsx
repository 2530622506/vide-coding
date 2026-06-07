import Editor from "@monaco-editor/react";
import { Alert, App as AntApp, Button, Card, Empty, Flex, Input, List, Space, Spin, Tag, Typography } from "antd";
import { ArrowLeft, CheckCircle2, FileText, Play, RotateCcw, Terminal, XCircle } from "lucide-react";
import MarkdownIt from "markdown-it";
import mathjax3 from "markdown-it-mathjax3";
import { useEffect, useMemo, useState } from "react";
import { runCppCode, type CodeRunResponse, type CodeRunStatus } from "../services/codeRun";
import type { ProblemDetailResponse } from "../types";
import type { AtCoderProblem } from "../types/atcoder";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

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

const defaultCppTemplate = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    return 0;
}
`;

const statusLabel: Record<CodeRunStatus, string> = {
  accepted: "通过",
  wrong_answer: "答案不一致",
  compile_error: "编译错误",
  runtime_error: "运行错误",
  time_limit_exceeded: "超时",
  judge_error: "运行服务异常"
};

const statusColor: Record<CodeRunStatus, string> = {
  accepted: "green",
  wrong_answer: "orange",
  compile_error: "red",
  runtime_error: "red",
  time_limit_exceeded: "volcano",
  judge_error: "default"
};

type IdeSource = "gesp" | "atcoder";

type IdeProblem = {
  id: string;
  title: string;
  subtitle: string;
  sourceLabel: string;
  statementSections: Array<{ id: string; title: string; markdown: string }>;
  sampleCases: Array<{ id?: string; input: string; output: string }>;
  referenceCode: string | null;
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export function ProblemIdePage({ problemId, source = "gesp", onBack }: { problemId: string; source?: IdeSource; onBack: () => void }) {
  const { message } = AntApp.useApp();
  const [problem, setProblem] = useState<IdeProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState(defaultCppTemplate);
  const [stdin, setStdin] = useState("");
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [result, setResult] = useState<CodeRunResponse | null>(null);
  const [batchResults, setBatchResults] = useState<Array<CodeRunResponse & { sampleIndex: number }>>([]);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchIdeProblem(source, problemId)
      .then((nextProblem) => {
        const referenceCode = nextProblem.referenceCode || defaultCppTemplate;
        const firstSample = nextProblem.sampleCases[0];
        setProblem(nextProblem);
        setCode(referenceCode);
        setStdin(firstSample?.input || "");
        setSelectedSampleIndex(firstSample ? 0 : null);
        setResult(null);
        setBatchResults([]);
      })
      .catch((error: unknown) => {
        setProblem(null);
        setLoadError(error instanceof Error ? error.message : "题目加载失败");
      })
      .finally(() => setLoading(false));
  }, [problemId, source]);

  const sampleCases = problem?.sampleCases || [];
  const expectedOutput = selectedSampleIndex === null ? undefined : sampleCases[selectedSampleIndex]?.output;
  const hasReferenceCode = Boolean(problem?.referenceCode);
  const statementSections = useMemo(() => {
    return problem?.statementSections.filter((section) => section.markdown.trim()) || [];
  }, [problem]);

  function selectSample(index: number) {
    const sample = sampleCases[index];
    setSelectedSampleIndex(index);
    setStdin(sample.input || "");
    setResult(null);
  }

  function resetReferenceCode() {
    setCode(problem?.referenceCode || defaultCppTemplate);
    message.success("已重置代码");
  }

  async function runCurrentInput() {
    if (!problem) {
      return;
    }
    setRunning(true);
    setRunError(null);
    setBatchResults([]);
    try {
      const nextResult = await runCppCode({
        problemId: problem.id,
        code,
        stdin,
        expectedOutput
      });
      setResult(nextResult);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "运行失败");
    } finally {
      setRunning(false);
    }
  }

  async function runAllSamples() {
    if (!problem || sampleCases.length === 0) {
      return;
    }
    setBatchRunning(true);
    setRunError(null);
    setResult(null);
    setBatchResults([]);
    const nextResults: Array<CodeRunResponse & { sampleIndex: number }> = [];
    try {
      for (let index = 0; index < sampleCases.length; index += 1) {
        const sample = sampleCases[index];
        const sampleResult = await runCppCode({
          problemId: problem.id,
          code,
          stdin: sample.input || "",
          expectedOutput: sample.output || ""
        });
        nextResults.push({ ...sampleResult, sampleIndex: index });
        setBatchResults([...nextResults]);
      }
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "运行全部样例失败");
    } finally {
      setBatchRunning(false);
    }
  }

  if (loading) {
    return (
      <main className="ideShell">
        <div className="ideRouteLoading"><Spin /> IDE 加载中</div>
      </main>
    );
  }

  if (loadError || !problem) {
    return (
      <main className="ideShell">
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>返回目录</Button>
        <Empty className="ideEmpty" description={loadError || "题目不存在"} image={<FileText size={32} />} />
      </main>
    );
  }

  return (
    <main className="ideShell">
      <header className="ideTopbar">
        <Button className="ideBackButton" icon={<ArrowLeft size={16} />} onClick={onBack}>返回目录</Button>
        <div className="ideTitleGroup">
          <Flex className="ideTitleActionRow" align="center" justify="space-between" gap={12}>
            <Typography.Text className="eyebrow"><Terminal size={15} /> C++17 在线 IDE</Typography.Text>
            <Space className="ideTopActions" size={8} wrap>
              <Button icon={<RotateCcw size={16} />} onClick={resetReferenceCode}>重置为参考解</Button>
              <Button disabled={sampleCases.length === 0 || batchRunning || running} loading={batchRunning} onClick={runAllSamples}>
                运行全部样例
              </Button>
              <Button icon={<Play size={16} />} loading={running} onClick={runCurrentInput} type="primary">
                运行
              </Button>
            </Space>
          </Flex>
          <Typography.Title level={1}>{problem.title}</Typography.Title>
        </div>
      </header>

      {runError ? <Alert className="ideNotice" message={runError} showIcon type="error" /> : null}
      {!hasReferenceCode ? <Alert className="ideNotice" message="当前题目没有参考解，已使用空 C++ 模板。" showIcon type="warning" /> : null}

      <section className="ideWorkspace">
        <aside className="ideProblemPane">
          <Card className="idePanel" size="small" title="题面">
            <Space direction="vertical" size={12}>
              <Typography.Text type="secondary">{problem.subtitle}</Typography.Text>
              {statementSections.length ? (
                statementSections.map((section) => (
                  <section className="ideStatementSection" key={section.id}>
                    <Typography.Title level={4}>{section.title}</Typography.Title>
                    <MarkdownBlock markdown={section.markdown} />
                  </section>
                ))
              ) : (
                <Typography.Paragraph>题面待补</Typography.Paragraph>
              )}
            </Space>
          </Card>

          <Card className="idePanel" size="small" title="样例">
            {sampleCases.length ? (
              <List
                className="ideSampleList"
                dataSource={sampleCases}
                renderItem={(sample, index) => (
                  <List.Item>
                    <Button className="ideSampleButton" onClick={() => selectSample(index)} type={selectedSampleIndex === index ? "primary" : "default"}>
                      样例 {index + 1}
                    </Button>
                    <div className="ideSamplePreview">
                      <Typography.Text type="secondary">输入</Typography.Text>
                      <pre>{sample.input || "(空)"}</pre>
                      <Typography.Text type="secondary">输出</Typography.Text>
                      <pre>{sample.output || "(空)"}</pre>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无样例" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </aside>

        <section className="ideEditorPane">
          <div className="ideEditorHeader">
            <Typography.Text strong>C++17</Typography.Text>
            <Typography.Text type="secondary">可直接修改参考解后运行</Typography.Text>
          </div>
          <Editor
            height="100%"
            language="cpp"
            onChange={(value) => setCode(value || "")}
            options={{
              automaticLayout: true,
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              tabSize: 2,
              wordWrap: "on"
            }}
            theme="vs-dark"
            value={code}
          />
        </section>

        <aside className="ideRunPane">
          <Card className="idePanel" size="small" title="输入">
            <Space direction="vertical" size={8}>
              <Flex align="center" justify="space-between">
                <Typography.Text type="secondary">
                  {selectedSampleIndex === null ? "自定义输入" : `样例 ${selectedSampleIndex + 1}`}
                </Typography.Text>
                <Button size="small" onClick={() => setSelectedSampleIndex(null)}>改为自定义</Button>
              </Flex>
              <Input.TextArea
                className="ideStdin"
                onChange={(event) => {
                  setSelectedSampleIndex(null);
                  setStdin(event.target.value);
                }}
                rows={8}
                value={stdin}
              />
            </Space>
          </Card>

          <Card className="idePanel" size="small" title="运行结果">
            <RunResult result={result} />
          </Card>

          <Card className="idePanel" size="small" title="全部样例">
            {batchResults.length ? (
              <List
                className="ideBatchList"
                dataSource={batchResults}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={6}>
                      <Flex align="center" gap={8}>
                        {item.passed ? <CheckCircle2 className="idePassedIcon" size={16} /> : <XCircle className="ideFailedIcon" size={16} />}
                        <Typography.Text strong>样例 {item.sampleIndex + 1}</Typography.Text>
                        <Tag color={statusColor[item.status]}>{statusLabel[item.status]}</Tag>
                      </Flex>
                      <Typography.Text type="secondary">{item.judgeStatus.description}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description={batchRunning ? "正在运行" : "尚未运行全部样例"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </aside>
      </section>
    </main>
  );
}

async function fetchIdeProblem(source: IdeSource, problemId: string): Promise<IdeProblem> {
  if (source === "atcoder") {
    const problem = await fetchJson<AtCoderProblem>(`/atcoder-catalog/problems/${encodeURIComponent(problemId)}`);
    return {
      id: problem.id,
      title: problem.title_zh || problem.title,
      subtitle: `${problem.pid} / ${problem.difficulty_label} / AtCoder`,
      sourceLabel: "AtCoder",
      statementSections: problem.statement.sections,
      sampleCases: problem.statement.samples,
      referenceCode: problem.programming_solution.code
    };
  }
  const problem = await fetchJson<ProblemDetailResponse>(`/catalog/problems/${encodeURIComponent(problemId)}`);
  return {
    id: problem.id,
    title: problem.title,
    subtitle: `${problem.session} / ${problem.level} 级 / #${problem.question_number}`,
    sourceLabel: "GESP",
    statementSections: problem.detail?.statement.sections?.length
      ? problem.detail.statement.sections
      : [{ id: "statement", title: "题目描述", markdown: problem.detail?.statement.stem || "" }],
    sampleCases: problem.detail?.sample_cases.cases || [],
    referenceCode: problem.detail?.programming_solution.code || null
  };
}

function MarkdownBlock({ markdown }: { markdown: string }) {
  const html = useMemo(() => statementMarkdown.render(markdown), [markdown]);
  return <div className="markdownBody" dangerouslySetInnerHTML={{ __html: html }} />;
}

function RunResult({ result }: { result: CodeRunResponse | null }) {
  if (!result) {
    return <Empty description="尚未运行" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  return (
    <Space className="ideResult" direction="vertical" size={10}>
      <Flex align="center" gap={8} wrap="wrap">
        <Tag color={statusColor[result.status]}>{statusLabel[result.status]}</Tag>
        <Typography.Text type="secondary">{result.judgeStatus.description}</Typography.Text>
        {result.time ? <Tag>耗时 {result.time}s</Tag> : null}
        {result.memory ? <Tag>内存 {result.memory} KB</Tag> : null}
      </Flex>
      {result.expectedOutput !== null ? (
        <Alert
          message={result.passed ? "输出与样例一致" : "输出与样例不一致"}
          showIcon
          type={result.passed ? "success" : "warning"}
        />
      ) : null}
      <ResultBlock title="stdout" value={result.stdout} />
      <ResultBlock title="stderr" value={result.stderr} />
      <ResultBlock title="compile output" value={result.compileOutput} />
      <ResultBlock title="expected output" value={result.expectedOutput || ""} />
    </Space>
  );
}

function ResultBlock({ title, value }: { title: string; value: string }) {
  if (!value) {
    return null;
  }
  return (
    <div className="ideOutputBlock">
      <Typography.Text strong>{title}</Typography.Text>
      <pre>{value}</pre>
    </div>
  );
}
