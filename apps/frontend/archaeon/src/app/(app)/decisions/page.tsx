import { getAllDecisions, getRepositories } from "@/lib/api";
import { DecisionExplorer } from "@/components/decisions/DecisionExplorer";
import { Brain } from "lucide-react";

export const metadata = {
  title: "Decision Explorer — Archaeon",
  description: "Search and filter all architectural decisions across your repositories",
};

export default async function DecisionsPage() {
  const [decisions, repos] = await Promise.all([getAllDecisions(), getRepositories()]);
  const repoList = repos.map((r) => ({ id: r.id, name: r.name }));

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Decision Explorer</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Search and filter every architectural decision, constraint, ADR, and incident across all repositories.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: decisions.length },
          { label: "Active", value: decisions.filter((d) => d.status === "active").length },
          { label: "ADRs", value: decisions.filter((d) => d.nodeType === "adr").length },
          { label: "Incidents", value: decisions.filter((d) => d.nodeType === "incident").length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border/40 bg-card px-4 py-3 text-center">
            <div className="text-xl font-bold text-foreground">{value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Explorer (client component) */}
      <DecisionExplorer decisions={decisions} repos={repoList} />
    </div>
  );
}
