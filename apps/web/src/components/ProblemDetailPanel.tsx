import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import "highlight.js/styles/github-dark.css";
import MarkdownIt from "markdown-it";
import mathjax3 from "markdown-it-mathjax3";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Flex, Image, List, Space, Tag, Typography } from "antd";
import { BookOpenCheck, CheckCircle2, Code2, ExternalLink, FileText, Image as ImageIcon, ListChecks, X } from "lucide-react";
import type { ProblemDetailResponse } from "../types";
import { AnswerBadge, typeLabel } from "./catalogLabels";
import { ImagePreviewOverlay, type PreviewAsset } from "./ImagePreviewOverlay";

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

export function ProblemDetailPanel({ loading, problem, onClose }: {
  loading: boolean;
  problem: ProblemDetailResponse | null;
  onClose: () => void;
}) {
  const [previewAsset, setPreviewAsset] = useState<PreviewAsset | null>(null);

  useEffect(() => {
    setPreviewAsset(null);
  }, [problem?.id]);

  if (loading) {
    return <Empty className="detailEmpty" description="加载中" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  if (!problem) {
    return <Empty className="detailEmpty" description="未选择题目" image={<FileText size={28} />} />;
  }

  const guidance = problem.answer_guidance;
  const detail = problem.detail;
  const answer = guidance?.reference_answer;
  const example = guidance?.understanding_example;
  const sourceLinks = uniqueSourceLinks(detail?.source_links || guidance?.reference_links || []);

  return (
    <article className="detailCard">
      <Flex className="detailHeader" align="flex-start" justify="space-between" gap={12}>
        <div>
          <Typography.Text className="eyebrow"><FileText size={15} /> {problem.session} / {problem.level} 级 / {typeLabel[problem.question_type]}</Typography.Text>
          <Typography.Title level={2}>{problem.title}</Typography.Title>
        </div>
        <Button icon={<X size={16} />} onClick={onClose} title="关闭" type="text" />
      </Flex>

      <DetailSection icon={<CheckCircle2 size={16} />} title="参考答案">
        {answer && guidance ? <AnswerLine guidance={guidance} /> : <Typography.Text type="secondary">答案待补</Typography.Text>}
        {guidance?.content_origin === "ai_generated_learning_aid" || detail?.ai_generation_notice ? (
          <Alert message={guidance?.ai_generation_notice || detail?.ai_generation_notice} showIcon type="warning" />
        ) : null}
      </DetailSection>

      <DetailSection icon={<FileText size={16} />} title="题面">
        {detail ? <StatementBlock detail={detail} /> : <Typography.Text type="secondary">题面待补</Typography.Text>}
      </DetailSection>

      <DetailSection icon={<ListChecks size={16} />} title="样例">
        {detail ? <SampleCasesBlock detail={detail} /> : <Typography.Text type="secondary">样例待补</Typography.Text>}
      </DetailSection>

      <DetailSection icon={<BookOpenCheck size={16} />} title="知识点讲解">
        {example ? (
          <Space className="explainBlock" direction="vertical" size={8}>
            <Typography.Paragraph>{example.summary}</Typography.Paragraph>
            <Flex gap={8} wrap="wrap">
              {example.knowledge_points.map((point) => <Tag color="green" key={point}>{point}</Tag>)}
            </Flex>
            <ol>
              {example.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <Space className="commentLine" direction="vertical" size={4}>
              {example.chinese_comments.map((comment) => <Typography.Text key={comment} type="secondary">{comment}</Typography.Text>)}
            </Space>
          </Space>
        ) : <Typography.Text type="secondary">讲解待补</Typography.Text>}
      </DetailSection>

      <DetailSection icon={<ListChecks size={16} />} title="选项">
        {detail?.choice_options.options.length ? (
          <>
            {detail.choice_options.status !== "source_extracted" ? (
              <DataGap status={detail.choice_options.status} notes={detail.choice_options.notes} />
            ) : null}
            <List
              className="optionList"
              dataSource={detail.choice_options.options}
              renderItem={(option) => (
                <List.Item className="optionItem">
                  <Tag color="blue">{option.key}</Tag>
                  <Typography.Text>{option.text}</Typography.Text>
                </List.Item>
              )}
            />
          </>
        ) : (
          <DataGap status={detail?.choice_options.status || "pending_collection"} notes={detail?.choice_options.notes || []} />
        )}
      </DetailSection>

      <DetailSection icon={<ImageIcon size={16} />} title="图片">
        {detail?.visual_assets.assets.length ? (
          <Space className="assetList" direction="vertical" size={10}>
            {detail.visual_assets.assets.map((asset) => (
              <Card className="assetItem" key={asset.id} size="small">
                <Button className="assetPreviewButton" onClick={() => setPreviewAsset(asset)} type="text">
                  <Image alt={asset.alt_text} preview={false} src={asset.asset_url} />
                </Button>
                <Typography.Text type="secondary">{asset.alt_text}</Typography.Text>
              </Card>
            ))}
          </Space>
        ) : (
          <DataGap status={detail?.visual_assets.status || "pending_collection"} notes={detail?.visual_assets.notes || []} />
        )}
      </DetailSection>

      {problem.question_type === "programming" ? (
        <DetailSection icon={<Code2 size={16} />} title="C++ 参考解">
          {detail?.programming_solution.code ? (
            <Space className="solutionBlock" direction="vertical" size={8}>
              {detail.programming_solution.ai_generation_notice ? (
                <Alert message={detail.programming_solution.ai_generation_notice} showIcon type="warning" />
              ) : null}
              {detail.programming_solution.algorithm || detail.programming_solution.complexity ? (
                <Flex className="solutionMeta" gap={8} wrap="wrap">
                  {detail.programming_solution.algorithm ? <Tag>{detail.programming_solution.algorithm}</Tag> : null}
                  {detail.programming_solution.complexity ? <Tag>{detail.programming_solution.complexity}</Tag> : null}
                </Flex>
              ) : null}
              {detail.programming_solution.verification ? (
                <Alert
                  message={`样例验证：${detail.programming_solution.verification.status} / ${detail.programming_solution.verification.sample_count} 组`}
                  showIcon
                  type="success"
                />
              ) : null}
              <HighlightedCppCode code={detail.programming_solution.code} />
            </Space>
          ) : (
            <DataGap status={detail?.programming_solution.status || "needs_review"} notes={detail?.programming_solution.notes || []} />
          )}
        </DetailSection>
      ) : null}

      <DetailSection icon={<ExternalLink size={16} />} title="来源">
        <Space className="sourceList" direction="vertical" size={8}>
          {sourceLinks.slice(0, 5).map((source) => (
            source.url || source.source_url ? (
              <Button href={source.url || source.source_url || ""} icon={<ExternalLink size={14} />} key={source.url || source.source_url || source.title || "source"} rel="noreferrer" target="_blank" type="link">
                {source.title || source.role || source.source_kind || "source"}
              </Button>
            ) : null
          ))}
          {detail?.statement.source_page ? <Typography.Text type="secondary">官方 PDF 第 {detail.statement.source_page} 页</Typography.Text> : null}
        </Space>
      </DetailSection>
      <ImagePreviewOverlay asset={previewAsset} onClose={() => setPreviewAsset(null)} />
    </article>
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
      <Typography.Title level={3}>{icon}{title}</Typography.Title>
      {children}
    </section>
  );
}

function AnswerLine({ guidance }: { guidance: NonNullable<ProblemDetailResponse["answer_guidance"]> }) {
  const answer = guidance.reference_answer;
  return (
    <Space className="answerLine" direction="vertical" size={6}>
      <AnswerBadge guidance={guidance} />
      {answer.evidence ? <Typography.Text type="secondary">{answer.evidence}</Typography.Text> : null}
    </Space>
  );
}

function StatementBlock({ detail }: { detail: NonNullable<ProblemDetailResponse["detail"]> }) {
  const sections = detail.statement.sections?.filter((section) => section.markdown.trim()) || [];
  if (sections.length === 0) {
    return <DataGap status={detail.statement.status} notes={detail.statement.notes || []} />;
  }
  return (
    <Space className="statementBlock" direction="vertical" size={10}>
      {detail.statement.source_terms_status ? <Tag>来源条款：{detail.statement.source_terms_status}</Tag> : null}
      {sections.map((section) => (
        <section key={section.id}>
          <Typography.Title level={4}>{section.title}</Typography.Title>
          <MarkdownText value={section.markdown} />
        </section>
      ))}
    </Space>
  );
}

function MarkdownText({ value }: { value: string }) {
  const html = useMemo(() => {
    const normalized = value
      .replace(/^:::[^\n]*(?:\n|$)/gm, "")
      .replace(/^:::$/gm, "")
      .trim();
    return statementMarkdown.render(normalized);
  }, [value]);

  return <div className="markdownBody" dangerouslySetInnerHTML={{ __html: html }} />;
}

function SampleCasesBlock({ detail }: { detail: NonNullable<ProblemDetailResponse["detail"]> }) {
  if (detail.sample_cases.cases.length === 0) {
    return <DataGap status={detail.sample_cases.status} notes={detail.sample_cases.notes || []} />;
  }
  return (
    <List
      className="sampleList"
      dataSource={detail.sample_cases.cases}
      renderItem={(sample, index) => (
        <List.Item className="samplePair">
          <div>
            <Typography.Text strong>输入 {index + 1}</Typography.Text>
            <pre>{sample.input || "(空)"}</pre>
          </div>
          <div>
            <Typography.Text strong>输出 {index + 1}</Typography.Text>
            <pre>{sample.output || "(空)"}</pre>
          </div>
        </List.Item>
      )}
    />
  );
}

function HighlightedCppCode({ code }: { code: string }) {
  const highlighted = useMemo(() => {
    return hljs.highlight(code, {
      language: "cpp",
      ignoreIllegals: true
    }).value;
  }, [code]);

  return (
    <pre className="codeBlock">
      <code className="hljs language-cpp" dangerouslySetInnerHTML={{ __html: highlighted }} />
    </pre>
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
  const visibleNotes = notes.filter(Boolean).slice(0, 2);

  return (
    <Alert
      className="dataGapAlert"
      description={visibleNotes.length ? (
        <Space direction="vertical" size={2}>
          {visibleNotes.map((note) => <Typography.Text key={note} type="secondary">{note}</Typography.Text>)}
        </Space>
      ) : undefined}
      message={statusText[status] || status}
      showIcon
      type="warning"
    />
  );
}
