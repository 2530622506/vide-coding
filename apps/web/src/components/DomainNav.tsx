import { Menu, Typography } from "antd";

type Props = {
  activeDomainId: string | null;
  domains: Array<{
    domain_id: string;
    domain_label: string;
    problem_count: number;
  }>;
  onSelect: (domainId: string) => void;
};

export function DomainNav({ activeDomainId, domains, onSelect }: Props) {
  return (
    <aside className="domainNav">
      <Typography.Text className="paneTitle" strong>算法范畴</Typography.Text>
      <Menu
        className="domainMenu"
        mode="inline"
        onClick={(event) => onSelect(event.key)}
        selectedKeys={activeDomainId ? [activeDomainId] : []}
        items={domains.map((domain) => ({
          key: domain.domain_id,
          label: (
            <span className="domainMenuLabel">
              <span>{domain.domain_label}</span>
              <strong>{domain.problem_count}</strong>
            </span>
          )
        }))}
      />
    </aside>
  );
}
