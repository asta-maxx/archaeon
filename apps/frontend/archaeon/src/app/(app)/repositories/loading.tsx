export default function RepositoriesLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-muted rounded-md" />
          <div className="h-4 w-60 bg-muted/50 rounded-md" />
        </div>
        <div className="h-8 w-32 bg-muted/40 rounded-lg" />
      </div>

      {/* Section label */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500/40" />
        <div className="h-3 w-20 bg-muted/50 rounded" />
      </div>

      {/* Repository cards grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-muted/60 rounded-lg flex-shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-4 w-36 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted/50 rounded" />
              </div>
              <div className="h-5 w-16 bg-muted/40 rounded-full" />
            </div>
            {/* Description */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-muted/40 rounded" />
              <div className="h-3 w-3/4 bg-muted/30 rounded" />
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="rounded-lg bg-muted/20 px-2 py-2 space-y-1">
                  <div className="h-4 w-8 bg-muted/50 rounded mx-auto" />
                  <div className="h-2.5 w-12 bg-muted/30 rounded mx-auto" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
