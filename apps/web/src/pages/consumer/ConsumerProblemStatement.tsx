import MarkdownIt from "markdown-it";
import mathjax3 from "markdown-it-mathjax3";
import { useMemo } from "react";
import type { ConsumerProblem } from "./ConsumerMobileData";
import { normalizeQuestionMarkdown } from "../../utils/questionMarkdown";

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

export function ConsumerProblemStatement({ problem }: { problem: ConsumerProblem }) {
  const sampleCases = problem.sample_cases || [];
  const sections = (problem.statement_sections || []).filter((section) => section.markdown.trim());
  const visibleSections = sections.length ? sections : [{
    id: "statement",
    title: "题目描述",
    markdown: problem.statement
  }];

  return (
    <>
      <section className="consumerReadBlock consumerMarkdownBlock">
        <h2>{problem.title}</h2>
        <div className="consumerStatementSections">
          {visibleSections.map((section) => (
            <section className="consumerStatementSection" key={section.id || section.title}>
              <h3>{section.title || "题目描述"}</h3>
              <ConsumerMarkdown value={section.markdown} />
            </section>
          ))}
        </div>
      </section>
      <section className="consumerCard consumerSampleCard">
        <div className="consumerSectionHead">
          <h2>样例</h2>
          <span>{sampleCases.length} 组</span>
        </div>
        {sampleCases.length ? (
          <div className="consumerSampleList">
            {sampleCases.map((sample, index) => (
              <article className="consumerSamplePair" key={`${index}:${sample.input}:${sample.output}`}>
                <div>
                  <strong>输入 {index + 1}</strong>
                  <pre>{sample.input || "(空)"}</pre>
                </div>
                <div>
                  <strong>输出 {index + 1}</strong>
                  <pre>{sample.output || "(空)"}</pre>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>暂无样例。</p>
        )}
      </section>
    </>
  );
}

function ConsumerMarkdown({ value }: { value: string }) {
  const html = useMemo(() => {
    const normalized = normalizeQuestionMarkdown(value);
    return statementMarkdown.render(normalized);
  }, [value]);

  return <div className="consumerMarkdownBody" dangerouslySetInnerHTML={{ __html: html }} />;
}
