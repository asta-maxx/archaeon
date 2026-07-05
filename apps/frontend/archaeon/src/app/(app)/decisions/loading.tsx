export default function DecisionsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-muted/60 rounded" />
          <div className="h-7 w-44 bg-muted rounded-md" />
        </div>
        <div className="h-4 w-80 bg-muted/50 rounded-md" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border/40 bg-card px-4 py-3 text-center space-y-2">
            <div className="h-6 w-10 bg-muted rounded mx-auto" />
            <div className="h-2.5 w-12 bg-muted/50 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-muted/50 rounded-lg" />
        <div className="h-9 w-28 bg-muted/40 rounded-lg" />
        <div className="h-9 w-28 bg-muted/40 rounded-lg" />
      </div>

      {/* Decision cards */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-64 bg-muted rounded-md" />
                <div className="h-4 w-full bg-muted/50 rounded" />
              </div>
              <div className="h-5 w-16 bg-muted/40 rounded-full flex-shrink-0" />
            </div>
            <div className="h-16 bg-muted/30 rounded-lg" />
            <div className="flex gap-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-4 w-16 bg-muted/40 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
