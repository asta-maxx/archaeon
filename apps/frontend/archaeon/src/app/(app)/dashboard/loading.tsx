/**
 * Loading skeleton for the Dashboard page.
 * Shown while getDashboardStats() and getRepositories() are in-flight.
 * Matches the Dashboard layout exactly so there's no layout shift on load.
 */
export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-32 bg-muted rounded-md" />
        <div className="h-4 w-80 bg-muted/60 rounded-md" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-muted/60 rounded" />
              <div className="h-8 w-8 bg-muted/40 rounded-lg" />
            </div>
            <div className="h-8 w-16 bg-muted rounded-md" />
            <div className="h-3 w-24 bg-muted/40 rounded" />
          </div>
        ))}
      </div>

      {/* Repos + activity */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="h-3 w-36 bg-muted/60 rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-muted/60 rounded-lg flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-36 bg-muted rounded" />
                  <div className="h-3 w-52 bg-muted/50 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-3 w-28 bg-muted/60 rounded" />
          <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 py-1.5">
                <div className="h-7 w-7 bg-muted/60 rounded-full flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-full bg-muted/50 rounded" />
                  <div className="h-2.5 w-24 bg-muted/30 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graph CTA */}
      <div className="rounded-xl border border-border/40 bg-card h-40" />
    </div>
  );
}
