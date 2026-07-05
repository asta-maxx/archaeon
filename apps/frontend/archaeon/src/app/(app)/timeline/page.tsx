import { getTimeline, getRepositories } from "@/lib/api";
import { TimelineView } from "@/components/timeline/TimelineView";
import { Clock } from "lucide-react";

export const metadata = {
  title: "Architecture Timeline — Archaeon",
  description: "Chronological view of how your architecture evolved across all repositories",
};

export default async function TimelinePage() {
  const [events, repos] = await Promise.all([getTimeline(), getRepositories()]);

  const repoMap = Object.fromEntries(repos.map((r) => [r.id, r.name]));

  // Enrich events with repo names for display
  const enriched = events.map((e) => ({
    ...e,
    _repoName: repoMap[e.repositoryId] ?? e.repositoryId,
  }));

  const yearSpan =
    enriched.length > 0
      ? `${enriched[0].year} – ${enriched[enriched.length - 1].year}`
      : "";

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-4xl">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Architecture Timeline</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Chronological evolution of your architecture — decisions, ADRs, incidents, and milestones
          {yearSpan ? ` (${yearSpan})` : ""}.
        </p>
      </div>

      {/* Legend — wraps on mobile */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {[
          { label: "Decision", dot: "bg-primary" },
          { label: "ADR", dot: "bg-green-400" },
          { label: "Incident", dot: "bg-red-400" },
          { label: "Constraint", dot: "bg-orange-400" },
          { label: "Milestone", dot: "bg-purple-400" },
        ].map(({ label, dot }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${dot} flex-shrink-0`} />
            {label}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{enriched.length}</span> events across{" "}
        <span className="font-semibold text-foreground">{repos.length}</span> repositories.
        Per-repository timelines are available in each repository&apos;s detail view.
      </div>

      {/* Timeline */}
      {enriched.length > 0 ? (
        <TimelineView events={enriched} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-16 sm:py-20 text-center space-y-3">
          <Clock className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No timeline events yet — index a repository to get started.</p>
        </div>
      )}
    </div>
  );
}
