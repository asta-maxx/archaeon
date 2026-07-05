import { Clock } from "lucide-react";

export default function TimelineLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-4xl animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground/30" />
          <div className="h-7 w-48 bg-muted rounded-md" />
        </div>
        <div className="h-4 w-80 bg-muted/50 rounded-md" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-muted/60" />
            <div className="h-3 w-16 bg-muted/50 rounded" />
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="h-10 bg-muted/30 rounded-lg" />

      {/* Timeline events */}
      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border/40" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="relative pl-10 pb-8">
            {/* Dot */}
            <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full bg-muted/60 border-2 border-background" />
            {/* Card */}
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-48 bg-muted rounded" />
                <div className="h-4 w-20 bg-muted/40 rounded" />
              </div>
              <div className="h-3 w-full bg-muted/40 rounded" />
              <div className="h-3 w-3/4 bg-muted/30 rounded" />
              <div className="flex gap-2 pt-1">
                <div className="h-4 w-14 bg-muted/40 rounded-full" />
                <div className="h-4 w-14 bg-muted/40 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
