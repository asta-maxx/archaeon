import { getDashboardStats, getRepositories } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { RepositoryCard } from "@/components/repositories/RepositoryCard";
import { GitBranch, Brain, FileCode2, Layers3, Network } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Dashboard — Archaeon",
  description: "Overview of your architecture memory graph",
};

export default async function DashboardPage() {
  const [stats, allRepos] = await Promise.all([
    getDashboardStats(),
    getRepositories(),
  ]);
  const { totalRepositories, totalDecisions, totalADRs, totalFilesIndexed, recentActivity } = stats;
  const recentRepos = allRepos.slice(0, 3);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your architecture&apos;s institutional memory — decisions, constraints, and reasoning at a glance.
        </p>
      </div>

      {/* Stats grid — 2 cols on mobile, 4 on lg */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Repositories" value={totalRepositories} icon={GitBranch} delta="+2 this week" deltaPositive />
        <StatCard label="Decisions Captured" value={totalDecisions} icon={Brain} delta="+14 this week" deltaPositive />
        <StatCard label="ADRs Indexed" value={totalADRs} icon={Layers3} delta="+3 this week" deltaPositive />
        <StatCard label="Files Indexed" value={totalFilesIndexed.toLocaleString()} icon={FileCode2} delta="Across 6 repos" />
      </div>

      {/* Recent Repositories + Activity — stacked on mobile, side-by-side on lg */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px]">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Repositories
            </h2>
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
              <Link href="/repositories">View all →</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {recentRepos.map((repo) => (
              <RepositoryCard key={repo.id} repo={repo} compact />
            ))}
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Activity
          </h2>
          <ActivityFeed items={recentActivity} />
        </div>
      </div>

      {/* Knowledge Graph CTA */}
      <div className="relative rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="grid-bg absolute inset-0 opacity-40" />
        <div className="relative p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Decision Knowledge Graph</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Interactive graph showing relationships between decisions, constraints, modules, and incidents.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="text-xs border-border/60 gap-2 flex-shrink-0 w-full sm:w-auto">
            <Link href="/graph">
              <Network className="h-3.5 w-3.5" />
              Open Graph
            </Link>
          </Button>
        </div>
        <div className="relative h-28 sm:h-32 overflow-hidden">
          <div className="grid-bg absolute inset-0 opacity-60" />
          {[
            { x: "10%", y: "30%", color: "bg-primary/70", size: "h-3 w-3" },
            { x: "25%", y: "60%", color: "bg-green-500/60", size: "h-2 w-2" },
            { x: "45%", y: "25%", color: "bg-orange-500/60", size: "h-4 w-4" },
            { x: "65%", y: "55%", color: "bg-primary/50", size: "h-2.5 w-2.5" },
            { x: "80%", y: "35%", color: "bg-purple-500/60", size: "h-3 w-3" },
            { x: "55%", y: "70%", color: "bg-red-500/50", size: "h-2 w-2" },
          ].map((node, i) => (
            <div key={i} className={`absolute rounded-full ${node.color} ${node.size} ring-2 ring-background`} style={{ left: node.x, top: node.y }} />
          ))}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <line x1="10%" y1="30%" x2="25%" y2="60%" stroke="currentColor" strokeWidth="1" className="text-primary" />
            <line x1="25%" y1="60%" x2="45%" y2="25%" stroke="currentColor" strokeWidth="1" className="text-primary" />
            <line x1="45%" y1="25%" x2="65%" y2="55%" stroke="currentColor" strokeWidth="1" className="text-primary" />
            <line x1="65%" y1="55%" x2="80%" y2="35%" stroke="currentColor" strokeWidth="1" className="text-primary" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
        </div>
      </div>
    </div>
  );
}
