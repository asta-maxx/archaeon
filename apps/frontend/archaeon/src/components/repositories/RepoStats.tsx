import type { Repository } from "@/lib/types";
import { Brain, FileCode2, GitPullRequest, Layers3, GitCommit } from "lucide-react";

interface RepoStatsProps {
  repo: Repository;
}

const stats = (repo: Repository) => [
  {
    label: "Decisions",
    value: repo.decisionCount,
    icon: Brain,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Files Indexed",
    value: repo.filesIndexed.toLocaleString(),
    icon: FileCode2,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    label: "Pull Requests",
    value: repo.prCount.toLocaleString(),
    icon: GitPullRequest,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    label: "ADRs",
    value: repo.adrCount,
    icon: Layers3,
    color: "text-green-400",
    bg: "bg-green-400/10",
  },
  {
    label: "Commits",
    value: repo.commitCount.toLocaleString(),
    icon: GitCommit,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
];

export function RepoStats({ repo }: RepoStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {stats(repo).map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-card px-3 py-4 text-center"
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div className="text-lg font-bold tracking-tight">{value}</div>
          <div className="text-[10px] text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}
