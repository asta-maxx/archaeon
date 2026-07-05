"use client";

import type { Repository } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Star, GitBranch, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  indexed: "text-green-400 bg-green-400/10 border-green-400/20",
  indexing: "text-primary bg-primary/10 border-primary/20",
  pending: "text-muted-foreground bg-muted/50 border-border/50",
  error: "text-red-400 bg-red-400/10 border-red-400/20",
};

export function RepoDetailHeader({ repo }: { repo: Repository }) {
  const lastIndexed = repo.lastIndexed
    ? formatDistanceToNow(new Date(repo.lastIndexed), { addSuffix: true })
    : "Never";

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/repositories"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Repositories
        </Link>
        <span>/</span>
        <span className="text-foreground">{repo.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{repo.name}</h1>
            <span
              className={cn(
                "text-[11px] font-medium px-2 py-1 rounded-md border",
                statusConfig[repo.indexingStatus]
              )}
            >
              {repo.indexingStatus.charAt(0).toUpperCase() + repo.indexingStatus.slice(1)}
            </span>
          </div>
          <p className="text-xs font-mono text-muted-foreground">{repo.fullName}</p>
          <p className="text-sm text-muted-foreground max-w-2xl">{repo.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {repo.stars.toLocaleString()} stars
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {repo.branch}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Indexed {lastIndexed}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-border/60 flex-shrink-0"
          asChild
        >
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on GitHub
          </a>
        </Button>
      </div>

      {/* Topics */}
      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {repo.topics.map((topic) => (
            <span
              key={topic}
              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary/80 border border-primary/15"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
