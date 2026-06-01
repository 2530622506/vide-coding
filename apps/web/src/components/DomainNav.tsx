import type { DomainGroup } from "../types";

type Props = {
  activeDomainId: string | null;
  domains: DomainGroup[];
  onSelect: (domainId: string) => void;
};

export function DomainNav({ activeDomainId, domains, onSelect }: Props) {
  return (
    <aside className="domainNav">
      <div className="paneTitle">算法范畴</div>
      <div className="domainNavList">
        {domains.map((domain) => (
          <button
            key={domain.domain_id}
            type="button"
            className={domain.domain_id === activeDomainId ? "domainButton active" : "domainButton"}
            onClick={() => onSelect(domain.domain_id)}
          >
            <span>{domain.domain_label}</span>
            <strong>{domain.problem_count}</strong>
          </button>
        ))}
      </div>
    </aside>
  );
}
