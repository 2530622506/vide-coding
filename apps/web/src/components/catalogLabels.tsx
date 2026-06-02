import { Badge, Flex, Tag } from "antd";
import type { EffectiveStatus, ProblemSummary, StatusCounts } from "../types";

export const statusLabel: Record<EffectiveStatus, string> = {
  confirmed: "已确认",
  candidate: "候选",
  needs_review: "待复核",
  conflict: "冲突"
};

export const typeLabel: Record<string, string> = {
  selection: "选择",
  judgment: "判断",
  programming: "编程"
};

const statusColor: Record<EffectiveStatus, string> = {
  confirmed: "blue",
  candidate: "green",
  needs_review: "gold",
  conflict: "red"
};

const answerStatusLabel: Record<string, string> = {
  confirmed: "官方答案",
  reference_link: "参考入口",
  needs_review: "答案待复核"
};

const answerColor: Record<string, string> = {
  confirmed: "blue",
  reference_link: "green",
  needs_review: "gold"
};

export function formatConfidence(value?: number) {
  if (typeof value !== "number") {
    return "";
  }
  return `${Math.round(value * 100)}%`;
}

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  return <Tag color={statusColor[status]}>{statusLabel[status]}</Tag>;
}

export function StatusStrip({ counts }: { counts: StatusCounts }) {
  return (
    <Flex gap={8} wrap="wrap">
      <Badge color="green" count={counts.candidate} overflowCount={999} title="候选" />
      <Badge color="gold" count={counts.needs_review} overflowCount={999} title="待复核" />
      <Badge color="red" count={counts.conflict} overflowCount={999} title="冲突" />
    </Flex>
  );
}

export function AnswerBadge({ guidance }: { guidance: NonNullable<ProblemSummary["answer_guidance"]> }) {
  const answer = guidance.reference_answer;
  const label = answerStatusLabel[answer.status] || "参考答案";
  const value = answer.answer ? `：${answer.answer}` : "";
  const suffix = guidance.content_origin === "ai_generated_learning_aid" ? " / AI 辅助" : "";
  return <Tag color={answerColor[answer.status] || "default"}>{label}{value}{suffix}</Tag>;
}
