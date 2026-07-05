import type { Repository } from "@/lib/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Brain, FileCode2, GitPullRequest, Layers3, Clock, AlertCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface RepositoryCardProps {
  repo: Repository;
  compact?: boolean;
}

const statusConfig = {
  indexed: { label: "Indexed", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  // "indexing" = a Celery job is actively running; we use "Analysing…" in UI
  // to match the async job vocabulary from PROJECT_ARCHITECTURE.md
  indexing: { label: "Analysing…", color: "text-primary bg-primary/10 border-primary/20" },
  pending: { label: "Pending", color: "text-muted-foreground bg-muted/50 border-border/50" },
  error: { label: "Error", color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

const languageColors: Record<string, string> = {
  TypeScript: "bg-blue-400",
  JavaScript: "bg-yellow-400",
  Python: "bg-green-400",
  Go: "bg-cyan-400",
  Java: "bg-orange-400",
  Rust: "bg-orange-600",
};

export function RepositoryCard({ repo, compact = false }: RepositoryCardProps) {
  const status = statusConfig[repo.indexingStatus];
  const lastIndexed = repo.lastIndexed
    ? formatDistanceToNow(new Date(repo.lastIndexed), { addSuffix: true })
    : "Never";
  const langColor = languageColors[repo.language] ?? "bg-muted-foreground";

  // Clickable when indexed OR when a job is actively running (indexing/partial)
  // so users can navigate to the detail page and see the AnalyzingState banner.
  // Error and pending are not yet navigable.
  const isClickable = repo.indexingStatus === "indexed" || repo.indexingStatus === "indexing";

  const content = (
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card p-4 transition-all duration-200",
        isClickable
          ? "hover:border-primary/30 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
          : "opacity-70 cursor-default",
        compact ? "flex items-center gap-4" : "space-y-3"
      )}
    >
      {/* Subtle glow on hover */}
      {isClickable && (
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/3 to-transparent pointer-events-none" />
      )}

      {compact ? (
        <>
          {/* Compact layout */}
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold text-muted-foreground">
            {repo.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{repo.name}</span>
              <span
                className={cn(
                  "flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border",
                  status.color
                )}
              >
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {repo.decisionCount} decisions
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {lastIndexed}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Full card layout */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold truncate">{repo.name}</h3>
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-1",
                    status.color
                  )}
                >
                  {repo.indexingStatus === "indexing" && (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  )}
                  {repo.indexingStatus === "error" && <AlertCircle className="h-2.5 w-2.5" />}
                  {status.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{repo.fullName}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {repo.description}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Brain className="h-3 w-3 text-primary/70" />
              {repo.decisionCount}
            </span>
            <span className="flex items-center gap-1">
              <FileCode2 className="h-3 w-3" />
              {repo.filesIndexed}
            </span>
            <span className="flex items-center gap-1">
              <GitPullRequest className="h-3 w-3" />
              {repo.prCount}
            </span>
            <span className="flex items-center gap-1">
              <Layers3 className="h-3 w-3 text-green-400/70" />
              {repo.adrCount} ADRs
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", langColor)} />
              <span className="text-[11px] text-muted-foreground">{repo.language}</span>
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastIndexed}
            </span>
          </div>
        </>
      )}
    </div>
  );

  if (isClickable) {
    return <Link href={`/repositories/${repo.id}`}>{content}</Link>;
  }

  return content;
}
