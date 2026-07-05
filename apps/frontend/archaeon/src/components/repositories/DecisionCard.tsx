import type { Decision } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertCircle, Layers3, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface DecisionCardProps {
  decision: Decision;
}

const nodeTypeConfig = {
  decision: {
    icon: Brain,
    color: "text-primary bg-primary/10 border-primary/20",
    label: "Decision",
  },
  incident: {
    icon: AlertCircle,
    color: "text-red-400 bg-red-400/10 border-red-400/20",
    label: "Incident",
  },
  adr: {
    icon: Layers3,
    color: "text-green-400 bg-green-400/10 border-green-400/20",
    label: "ADR",
  },
  constraint: {
    icon: XCircle,
    color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    label: "Constraint",
  },
  module: {
    icon: Brain,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    label: "Module",
  },
  developer: {
    icon: Brain,
    color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    label: "Developer",
  },
};

const statusConfig = {
  active: { label: "Active", className: "bg-green-400/10 text-green-400 border-green-400/20" },
  superseded: {
    label: "Superseded",
    className: "bg-muted text-muted-foreground border-border/50",
  },
  deprecated: {
    label: "Deprecated",
    className: "bg-orange-400/10 text-orange-400 border-orange-400/20",
  },
};

export function DecisionCard({ decision }: DecisionCardProps) {
  const typeConf = nodeTypeConfig[decision.nodeType];
  const statusConf = statusConfig[decision.status];
  const TypeIcon = typeConf.icon;
  const confidencePct = Math.round(decision.confidence * 100);
  const dateAgo = formatDistanceToNow(new Date(decision.date), { addSuffix: true });

  return (
    <div className="group rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-all duration-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border",
              typeConf.color
            )}
          >
            <TypeIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold leading-snug">{decision.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                  statusConf.className
                )}
              >
                {statusConf.label}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                  typeConf.color
                )}
              >
                {typeConf.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {decision.module.name} · {dateAgo} · by {decision.author.handle}
              </span>
            </div>
          </div>
          {/* Confidence */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <div className="text-[10px] text-muted-foreground">confidence</div>
            <div className="text-xs font-bold text-primary">{confidencePct}%</div>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {decision.why}
        </p>
      </div>

      {/* Alternatives & Constraints */}
      <div className="px-5 pb-4 space-y-3">
        {decision.alternatives.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Alternatives Considered
            </div>
            <div className="space-y-1">
              {decision.alternatives.slice(0, 2).map((alt, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <XCircle className="h-3 w-3 text-red-400/60 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug"><span className="font-medium">{alt.name}</span> — {alt.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {decision.constraints.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Constraints
            </div>
            <div className="space-y-1">
              {decision.constraints.slice(0, 2).map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-orange-400/60 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{c.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files & tags */}
        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <div className="flex flex-wrap gap-1">
            {decision.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground">
            PRs: {decision.relatedPRs.map((n) => `#${n}`).join(", ")}
          </div>
        </div>
      </div>
    </div>
  );
}
