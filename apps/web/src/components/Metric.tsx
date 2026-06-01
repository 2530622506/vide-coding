import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  tone?: "warn";
  value: number;
};

export function Metric({ icon, label, value, tone }: Props) {
  return (
    <div className={tone === "warn" ? "metric warn" : "metric"}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
