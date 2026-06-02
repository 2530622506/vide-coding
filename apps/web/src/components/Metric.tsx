import { Card, Statistic } from "antd";
import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  tone?: "warn";
  value: number;
};

export function Metric({ icon, label, value, tone }: Props) {
  return (
    <Card className={tone === "warn" ? "metric warn" : "metric"} size="small">
      <Statistic prefix={icon} title={label} value={value} />
    </Card>
  );
}
