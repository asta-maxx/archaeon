import { getRepositories } from "@/lib/api";
import { RepositoryCard } from "@/components/repositories/RepositoryCard";
import { Filter, GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Repositories — Archaeon",
  description: "All repositories indexed in your architecture memory graph",
};

export default async function RepositoriesPage() {
  const repos = await getRepositories();
  const indexed = repos.filter((r) => r.indexingStatus === "indexed");
  const others = repos.filter((r) => r.indexingStatus !== "indexed");

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Repositories</h1>
          <p className="text-sm text-muted-foreground">
            {repos.length} repositories connected — {indexed.length} indexed and ready.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/60">
            <Filter className="h-3.5 w-3.5" />Filter
          </Button>
          <Button size="sm" className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />Import Repository
          </Button>
        </div>
      </div>

      {indexed.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Indexed ({indexed.length})
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {indexed.map((repo) => <RepositoryCard key={repo.id} repo={repo} />)}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pending / In Progress ({others.length})
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {others.map((repo) => <RepositoryCard key={repo.id} repo={repo} />)}
          </div>
        </section>
      )}

      {repos.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-20 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <GitBranch className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium">No repositories yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Import a GitHub repository to start building its architectural memory.
            </p>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />Import Repository
          </Button>
        </div>
      )}
    </div>
  );
}
