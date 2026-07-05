import type { ActivityItem } from "@/lib/types";
import { Brain, GitBranch, Layers3, GitPullRequest } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const iconMap = {
  decision_added: Brain,
  adr_created: Layers3,
  repo_indexed: GitBranch,
  pr_analyzed: GitPullRequest,
};

const colorMap = {
  decision_added: "text-primary bg-primary/10",
  adr_created: "text-green-400 bg-green-400/10",
  repo_indexed: "text-blue-400 bg-blue-400/10",
  pr_analyzed: "text-orange-400 bg-orange-400/10",
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30 overflow-hidden">
      {items.map((item) => {
        const Icon = iconMap[item.type];
        const colors = colorMap[item.type];
        const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });

        return (
          <div key={item.id} className="flex gap-3 p-3 hover:bg-accent/30 transition-colors">
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${colors}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs leading-snug text-foreground line-clamp-2">
                {item.description}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="font-medium text-muted-foreground/80">{item.repositoryName}</span>
                <span>·</span>
                <span>{timeAgo}</span>
                {item.author && (
                  <>
                    <span>·</span>
                    <span>{item.author}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
