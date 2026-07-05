"use client";

import { useState, useMemo } from "react";
import type { Decision, NodeType, DecisionStatus } from "@/lib/types/decision";
import { cn } from "@/lib/utils";
import {
  Brain,
  AlertCircle,
  Layers3,
  XCircle,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Type configs ─────────────────────────────────────────────────────────────

const typeConfig: Record<NodeType, { icon: React.ElementType; color: string; label: string }> = {
  decision: { icon: Brain, color: "text-primary bg-primary/10 border-primary/20", label: "Decision" },
  incident: { icon: AlertCircle, color: "text-red-400 bg-red-400/10 border-red-400/20", label: "Incident" },
  adr: { icon: Layers3, color: "text-green-400 bg-green-400/10 border-green-400/20", label: "ADR" },
  constraint: { icon: XCircle, color: "text-orange-400 bg-orange-400/10 border-orange-400/20", label: "Constraint" },
  module: { icon: Brain, color: "text-blue-400 bg-blue-400/10 border-blue-400/20", label: "Module" },
  developer: { icon: Brain, color: "text-purple-400 bg-purple-400/10 border-purple-400/20", label: "Developer" },
};

const statusConfig: Record<DecisionStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-green-400/10 text-green-400 border-green-400/20" },
  superseded: { label: "Superseded", cls: "bg-muted text-muted-foreground border-border/50" },
  deprecated: { label: "Deprecated", cls: "bg-orange-400/10 text-orange-400 border-orange-400/20" },
};

// ─── Decision row ─────────────────────────────────────────────────────────────

function DecisionRow({ decision, highlight }: { decision: Decision; highlight?: string }) {
  const [expanded, setExpanded] = useState(false);
  const tc = typeConfig[decision.nodeType];
  const sc = statusConfig[decision.status];
  const Icon = tc.icon;
  const ago = formatDistanceToNow(new Date(decision.date), { addSuffix: true });

  function hl(text: string) {
    if (!highlight) return <>{text}</>;
    const parts = text.split(new RegExp(`(${highlight})`, "gi"));
    return (
      <>
        {parts.map((p, i) =>
          p.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-primary/20 text-primary rounded px-0.5">{p}</mark>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border border-border/40 bg-card overflow-hidden transition-all duration-200",
      "hover:border-primary/25",
    )}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-5 pt-4 pb-3"
        id={`decision-${decision.id}`}
      >
        <div className="flex items-start gap-3">
          <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border", tc.color)}>
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug">{hl(decision.title)}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", sc.cls)}>
                {sc.label}
              </span>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", tc.color)}>
                {tc.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {decision.module.name} · {ago} · by {decision.author.handle}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {hl(decision.summary)}
            </p>
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-1 pl-2">
            <div className="text-[10px] font-bold text-primary">{Math.round(decision.confidence * 100)}%</div>
            <div className="text-[9px] text-muted-foreground">confidence</div>
            {expanded
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground mt-1" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mt-1" />
            }
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border/30 px-5 pb-4 pt-3 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{decision.why}</p>

          {decision.alternatives.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Alternatives Considered</div>
              {decision.alternatives.map((alt, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <XCircle className="h-3 w-3 text-red-400/60 flex-shrink-0 mt-0.5" />
                  <span><span className="font-medium">{alt.name}</span> — {alt.reason}</span>
                </div>
              ))}
            </div>
          )}

          {decision.constraints.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Constraints</div>
              {decision.constraints.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-orange-400/60 flex-shrink-0 mt-0.5" />
                  <span>{c.description}</span>
                  {c.category && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground/60 ml-1">{c.category}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-border/20">
            <div className="flex flex-wrap gap-1">
              {decision.tags.map((tag) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{tag}</span>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">
              PRs: {decision.relatedPRs.map((n) => `#${n}`).join(", ")}
            </div>
          </div>

          {decision.files.length > 0 && (
            <div className="text-[10px] text-muted-foreground/60 font-mono">
              {decision.files.slice(0, 2).join(" · ")}
              {decision.files.length > 2 && ` +${decision.files.length - 2} more`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function Chip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-xs px-2.5 py-1 rounded-full border transition-all duration-150",
        active
          ? "bg-primary/15 text-primary border-primary/30"
          : "bg-muted/40 text-muted-foreground border-border/40 hover:border-border hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

// ─── Main explorer ────────────────────────────────────────────────────────────

interface DecisionExplorerProps {
  decisions: Decision[];
  repos: { id: string; name: string }[];
}

export function DecisionExplorer({ decisions, repos }: DecisionExplorerProps) {
  const [query, setQuery] = useState("");
  const [filterAuthor, setFilterAuthor] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<NodeType | null>(null);
  const [filterStatus, setFilterStatus] = useState<DecisionStatus | null>(null);
  const [filterRepo, setFilterRepo] = useState<string | null>(null);

  // Derive unique filter values
  const authors = useMemo(() => [...new Set(decisions.map((d) => d.author.handle))], [decisions]);
  const modules = useMemo(() => [...new Set(decisions.map((d) => d.module.name))], [decisions]);
  const types: NodeType[] = ["decision", "incident", "adr", "constraint"];
  const statuses: DecisionStatus[] = ["active", "superseded", "deprecated"];

  const filtered = useMemo(() => {
    let res = decisions;
    if (query) {
      const q = query.toLowerCase();
      res = res.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.why.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          d.author.handle.toLowerCase().includes(q)
      );
    }
    if (filterAuthor) res = res.filter((d) => d.author.handle === filterAuthor);
    if (filterModule) res = res.filter((d) => d.module.name === filterModule);
    if (filterType) res = res.filter((d) => d.nodeType === filterType);
    if (filterStatus) res = res.filter((d) => d.status === filterStatus);
    if (filterRepo) res = res.filter((d) => d.repositoryId === filterRepo);
    return res;
  }, [decisions, query, filterAuthor, filterModule, filterType, filterStatus, filterRepo]);

  const hasFilters = !!(query || filterAuthor || filterModule || filterType || filterStatus || filterRepo);

  function clearAll() {
    setQuery("");
    setFilterAuthor(null);
    setFilterModule(null);
    setFilterType(null);
    setFilterStatus(null);
    setFilterRepo(null);
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          id="decision-search"
          type="text"
          placeholder="Search decisions, authors, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-border/50 bg-card pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Type */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 w-14">Type</span>
          {types.map((t) => (
            <Chip key={t} label={typeConfig[t].label} active={filterType === t} onClick={() => setFilterType(filterType === t ? null : t)} />
          ))}
        </div>

        {/* Status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 w-14">Status</span>
          {statuses.map((s) => (
            <Chip key={s} label={statusConfig[s].label} active={filterStatus === s} onClick={() => setFilterStatus(filterStatus === s ? null : s)} />
          ))}
        </div>

        {/* Author */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 w-14">Author</span>
          {authors.map((a) => (
            <Chip key={a} label={a} active={filterAuthor === a} onClick={() => setFilterAuthor(filterAuthor === a ? null : a)} />
          ))}
        </div>

        {/* Module */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 w-14">Module</span>
          {modules.map((m) => (
            <Chip key={m} label={m} active={filterModule === m} onClick={() => setFilterModule(filterModule === m ? null : m)} />
          ))}
        </div>

        {/* Repo */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 w-14">Repo</span>
          {repos.map((r) => (
            <Chip key={r.id} label={r.name} active={filterRepo === r.id} onClick={() => setFilterRepo(filterRepo === r.id ? null : r.id)} />
          ))}
        </div>
      </div>

      {/* Results bar */}
      <div className="flex items-center justify-between py-2 border-b border-border/30">
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
          <span className="font-semibold text-foreground">{decisions.length}</span> decisions
        </span>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
            <X className="h-3 w-3" />Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DecisionRow key={d.id} decision={d} highlight={query || undefined} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-16 text-center space-y-3">
          <Brain className="h-10 w-10 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">No decisions match your filters.</p>
          <button onClick={clearAll} className="text-xs text-primary hover:underline">Clear all filters</button>
        </div>
      )}
    </div>
  );
}
