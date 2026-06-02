import { Alert, Button, Card, Empty, Flex, List, Space, Tag, Typography } from "antd";
import { AlertTriangle, CheckCircle2, GitBranch, X } from "lucide-react";
import type { ReviewQueueItem, ReviewQueueSummary } from "../types";

type ReviewAction = "confirm" | "reject" | "merge_duplicate";

type Props = {
  busyId: string | null;
  items: ReviewQueueItem[];
  message: string | null;
  onAction: (item: ReviewQueueItem, action: ReviewAction) => void;
  summary: ReviewQueueSummary | null;
};

export function ReviewQueuePane({ busyId, items, message, onAction, summary }: Props) {
  return (
    <Card className="reviewPane" size="small" title="复核队列">
      <Flex gap={8} wrap="wrap">
        <Tag color="red">High {summary?.summary.by_priority.high ?? 0}</Tag>
        <Tag color="gold">Medium {summary?.summary.by_priority.medium ?? 0}</Tag>
        <Tag>Low {summary?.summary.by_priority.low ?? 0}</Tag>
      </Flex>
      {message ? <Alert className="reviewMessage" message={message} showIcon type="success" /> : null}
      <List
        className="queueList"
        dataSource={items}
        locale={{ emptyText: <Empty description="暂无 open 复核项" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        renderItem={(item) => (
          <List.Item className="queueItem">
            <List.Item.Meta
              avatar={<AlertTriangle size={16} />}
              title={(
                <Space size={6} wrap>
                  <Tag color={item.priority === "high" ? "red" : item.priority === "medium" ? "gold" : "default"}>
                    {item.priority.toUpperCase()}
                  </Tag>
                  <Typography.Text>{item.type}</Typography.Text>
                </Space>
              )}
              description={(
                <Space direction="vertical" size={4}>
                  <Typography.Text>{item.title}</Typography.Text>
                  <Typography.Text type="secondary">{item.reason}</Typography.Text>
                  {item.recommended_action ? <Typography.Text type="warning">{item.recommended_action}</Typography.Text> : null}
                  <Space className="queueActions" size={6} wrap>
                    <Button
                      disabled={busyId === item.id}
                      icon={<CheckCircle2 size={15} />}
                      onClick={() => onAction(item, "confirm")}
                      title="确认复核项"
                      type="text"
                    />
                    <Button
                      danger
                      disabled={busyId === item.id}
                      icon={<X size={15} />}
                      onClick={() => onAction(item, "reject")}
                      title="拒绝复核项"
                      type="text"
                    />
                    {item.type === "source_duplicate" ? (
                      <Button
                        disabled={busyId === item.id}
                        icon={<GitBranch size={15} />}
                        onClick={() => onAction(item, "merge_duplicate")}
                        title="记录重复来源合并"
                        type="text"
                      />
                    ) : null}
                  </Space>
                </Space>
              )}
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
