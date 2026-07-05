/**
 * AnalyzingState — shown when a repository's Celery job is still running.
 *
 * Distinct from EmptyState: this is NOT an error, it's an expected intermediate
 * state driven by `getJobStatus()` returning "queued" | "processing" | "partial".
 */

import type { RepositoryJob } from "@/lib/types/decision";
import { Loader2, Cpu, GitBranch, AlertCircle } from "lucide-react";

interface Props {
  job: RepositoryJob;
  /** If partial, pass in how many decisions have been extracted so far */
  decisionsExtracted?: number;
  className?: string;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

export function AnalyzingState({ job, decisionsExtracted, className = "" }: Props) {
  const isPartial = job.status === "partial";

  return (
    <div
      className={`rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 space-y-5 ${className}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex-shrink-0">
          {isPartial ? (
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full bg-amber-500/15 ring-1 ring-amber-500/30" />
              <Cpu className="absolute inset-0 m-auto h-4.5 w-4.5 text-amber-400" />
            </div>
          ) : (
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full bg-primary/10 ring-1 ring-primary/25 animate-pulse" />
              <Loader2 className="absolute inset-0 m-auto h-4.5 w-4.5 text-primary animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {isPartial ? "Partial results available" : "Analysing repository…"}
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                isPartial
                  ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                  : "bg-primary/10 text-primary ring-1 ring-primary/20"
              }`}
            >
              {isPartial ? "Partial" : job.status === "queued" ? "Queued" : "Processing"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {job.message ??
              (isPartial
                ? "The intelligence service has extracted some decisions. Analysis is still running — more results will appear automatically."
                : "The Django backend is running the repository intelligence pipeline. This typically takes 2–5 minutes. Decisions will appear once extraction is complete.")}
          </p>
        </div>
      </div>

      {/* Progress bar + stats */}
      {typeof job.progress === "number" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <GitBranch className="h-3 w-3" />
              {isPartial
                ? `${decisionsExtracted ?? job.decisionsExtracted ?? 0} decisions extracted so far`
                : "Scanning commits, PRs, and ADRs"}
            </span>
            <span className="tabular-nums">{job.progress}%</span>
          </div>
          <ProgressBar value={job.progress} />
        </div>
      )}

      {/* Info footer */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border/40 px-3 py-2.5">
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {isPartial ? (
            <>
              Showing <strong className="text-foreground">{decisionsExtracted ?? job.decisionsExtracted ?? 0} of the extracted decisions</strong> below. The remaining decisions will appear as the intelligence pipeline continues.
            </>
          ) : (
            <>
              This page will update automatically. The analysis is running as a background job (
              <code className="font-mono text-[10px] text-primary/80">{job.jobId}</code>
              ) in the Django backend.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
