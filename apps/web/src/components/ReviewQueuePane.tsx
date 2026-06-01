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
    <section className="reviewPane">
      <div className="paneTitle">复核队列</div>
      <div className="reviewStats">
        <span>High {summary?.summary.by_priority.high ?? 0}</span>
        <span>Medium {summary?.summary.by_priority.medium ?? 0}</span>
        <span>Low {summary?.summary.by_priority.low ?? 0}</span>
      </div>
      {message ? <div className="reviewMessage">{message}</div> : null}
      <div className="queueList">
        {items.map((item) => (
          <div className="queueItem" key={item.id}>
            <AlertTriangle size={16} />
            <div>
              <strong>{item.priority.toUpperCase()} / {item.type}</strong>
              <span>{item.title}</span>
              <small>{item.reason}</small>
              {item.recommended_action ? <em>{item.recommended_action}</em> : null}
              <div className="queueActions">
                <button
                  className="iconButton small"
                  disabled={busyId === item.id}
                  onClick={() => onAction(item, "confirm")}
                  title="确认复核项"
                  type="button"
                >
                  <CheckCircle2 size={15} />
                </button>
                <button
                  className="iconButton small dangerIcon"
                  disabled={busyId === item.id}
                  onClick={() => onAction(item, "reject")}
                  title="拒绝复核项"
                  type="button"
                >
                  <X size={15} />
                </button>
                {item.type === "source_duplicate" ? (
                  <button
                    className="iconButton small"
                    disabled={busyId === item.id}
                    onClick={() => onAction(item, "merge_duplicate")}
                    title="记录重复来源合并"
                    type="button"
                  >
                    <GitBranch size={15} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 ? <div className="empty smallEmpty">暂无 open 复核项</div> : null}
      </div>
    </section>
  );
}
