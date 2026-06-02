import { BookOpenCheck, GitBranch, Image as ImageIcon } from "lucide-react"
import { Card, Empty, Flex, List, Space, Tag, Typography } from "antd"
import type { KeyboardEvent } from "react"
import type { DomainGroup, ProblemSummary } from "../types"
import {
  AnswerBadge,
  formatConfidence,
  StatusBadge,
  StatusStrip,
  typeLabel,
} from "./catalogLabels"

type Props = {
  domain: DomainGroup
  selectedProblemId: string | null
  onProblemSelect: (problemId: string) => void
}

export function DomainPanel({
  domain,
  selectedProblemId,
  onProblemSelect,
}: Props) {
  return (
    <>
      <Flex
        className="domainHeader"
        align="center"
        justify="space-between"
        gap={16}
      >
        <div>
          <Typography.Text className="eyebrow">
            <GitBranch size={16} /> {domain.domain_id}
          </Typography.Text>
          <Typography.Title level={2}>{domain.domain_label}</Typography.Title>
        </div>
        <StatusStrip counts={domain.status_counts} />
      </Flex>

      <Space className="typeStack" direction="vertical" size={14}>
        {domain.problem_types.map(type => (
          <Card
            key={type.problem_type_id}
            size="small"
            title={
              <div>
                <Typography.Text className="eyebrow">
                  <BookOpenCheck size={16} /> {type.problem_type_id}
                </Typography.Text>
                <Typography.Title level={3}>
                  {type.problem_type_label}
                </Typography.Title>
              </div>
            }
            extra={<Tag color="blue">{type.problem_count}</Tag>}
          >
            <Flex className="knowledgeRow" gap={8} wrap="wrap">
              {type.knowledge_points.length > 0 ? (
                type.knowledge_points.map(point => (
                  <Tag color="green" key={point.id}>
                    {point.label}
                  </Tag>
                ))
              ) : (
                <Typography.Text type="secondary">待补知识点</Typography.Text>
              )}
            </Flex>
            <List
              className="problemList"
              dataSource={type.problems}
              locale={{
                emptyText: (
                  <Empty
                    description="暂无题目"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
              renderItem={problem => (
                <ProblemRow
                  isSelected={selectedProblemId === problem.id}
                  onSelect={onProblemSelect}
                  problem={problem}
                />
              )}
            />
          </Card>
        ))}
      </Space>
    </>
  )
}

function ProblemRow({
  problem,
  isSelected,
  onSelect,
}: {
  problem: ProblemSummary
  isSelected: boolean
  onSelect: (problemId: string) => void
}) {
  const primaryType = problem.problem_type_tags[0]
  const needsSource = problem.detail_completeness?.needs_source_enrichment

  function selectFromKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(problem.id)
    }
  }

  return (
    <List.Item className="problemRowItem">
      <Card
        className={isSelected ? "problemCard active" : "problemCard"}
        hoverable
        onClick={() => onSelect(problem.id)}
        onKeyDown={selectFromKeyboard}
        role="button"
        size="small"
        tabIndex={0}
      >
        <div className="problemRowLayout">
          <div className="problemIndex">
            <span>
              {typeLabel[problem.question_type] || problem.question_type}
            </span>
            <strong>#{problem.question_number}</strong>
          </div>
          <div className="problemMain">
            <Typography.Text className="problemTitle">
              {problem.title}
            </Typography.Text>
            <Flex className="problemMeta" gap={6} wrap="wrap">
              <StatusBadge status={problem.status} />
              {problem.answer_guidance ? (
                <AnswerBadge guidance={problem.answer_guidance} />
              ) : null}
              {primaryType ? (
                <Tag>{formatConfidence(primaryType.final_confidence)}</Tag>
              ) : null}
              {needsSource ? <Tag color="gold">题面待补</Tag> : null}
              {problem.visual_asset_thumbnails.length ? (
                <Tag icon={<ImageIcon size={12} />}>含图片</Tag>
              ) : null}
              {problem.review_queue_count > 0 ? (
                <Tag color="red">{problem.review_queue_count} 复核</Tag>
              ) : null}
            </Flex>
          </div>
          <Flex className="problemTags" gap={6} wrap="wrap">
            {problem.knowledge_point_tags.slice(0, 3).map(tag => (
              <Tag key={tag.value}>{tag.label}</Tag>
            ))}
          </Flex>
          {problem.answer_guidance ? (
            <div className="understandingArea">
              <UnderstandingBlock problem={problem} />
            </div>
          ) : null}
        </div>
      </Card>
    </List.Item>
  )
}

function UnderstandingBlock({ problem }: { problem: ProblemSummary }) {
  const guidance = problem.answer_guidance
  if (!guidance) {
    return null
  }
  const example = guidance.understanding_example
  return (
    <Card className="understanding" size="small">
      <Typography.Paragraph>{example.summary}</Typography.Paragraph>
      <ol>
        {example.steps.slice(0, 3).map(step => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <Space className="commentLine" direction="vertical" size={4}>
        {example.chinese_comments.slice(0, 1).map(comment => (
          <Typography.Text key={comment} type="secondary">
            {comment}
          </Typography.Text>
        ))}
      </Space>
    </Card>
  )
}
