import type { TimelineEvent } from "@/lib/types/decision";
import { cn } from "@/lib/utils";
import {
  Brain,
  AlertCircle,
  Layers3,
  XCircle,
  Star,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface TimelineViewProps {
  events: TimelineEvent[];
  /** If true, hides the repository label (used inside a single-repo context) */
  hideRepo?: boolean;
}

const typeConfig = {
  decision: {
    icon: Brain,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/25",
    dot: "bg-primary",
    label: "Decision",
  },
  adr: {
    icon: Layers3,
    color: "text-green-400",
    bg: "bg-green-400/10 border-green-400/25",
    dot: "bg-green-400",
    label: "ADR",
  },
  incident: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/25",
    dot: "bg-red-400",
    label: "Incident",
  },
  constraint: {
    icon: XCircle,
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/25",
    dot: "bg-orange-400",
    label: "Constraint",
  },
  milestone: {
    icon: Star,
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/25",
    dot: "bg-purple-400",
    label: "Milestone",
  },
};

function groupByYear(events: TimelineEvent[]) {
  const map = new Map<number, TimelineEvent[]>();
  for (const e of events) {
    const yr = e.year;
    if (!map.has(yr)) map.set(yr, []);
    map.get(yr)!.push(e);
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
}

export function TimelineView({ events, hideRepo }: TimelineViewProps) {
  const grouped = groupByYear(events);

  return (
    <div className="relative">
      {/* Vertical rule */}
      <div className="absolute left-[28px] top-0 bottom-0 w-px bg-border/40" />

      <div className="space-y-10">
        {grouped.map(([year, yearEvents]) => (
          <div key={year} className="relative">
            {/* Year marker */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative z-10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-card shadow-sm">
                <div className="flex flex-col items-center leading-none">
                  <Calendar className="h-3 w-3 text-muted-foreground mb-0.5" />
                  <span className="text-xs font-bold text-foreground">{year}</span>
                </div>
              </div>
              <div className="h-px flex-1 bg-border/30" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 pr-1">
                {yearEvents.length} event{yearEvents.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Events for this year */}
            <div className="space-y-3 pl-[70px]">
              {yearEvents.map((event) => {
                const conf = typeConfig[event.type];
                const Icon = conf.icon;
                const dateStr = format(new Date(event.date), "MMM d");
                const ago = formatDistanceToNow(new Date(event.date), { addSuffix: true });

                return (
                  <div
                    key={event.id}
                    className="group relative rounded-xl border border-border/40 bg-card hover:border-primary/20 hover:bg-card/80 transition-all duration-200 overflow-hidden"
                  >
                    {/* Left accent bar */}
                    <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", conf.dot)} />

                    <div className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border", conf.bg)}>
                          <Icon className={cn("h-3.5 w-3.5", conf.color)} />
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold leading-snug">{event.title}</h3>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-[10px] font-medium text-muted-foreground">{dateStr}</div>
                              <div className="text-[9px] text-muted-foreground/60">{ago}</div>
                            </div>
                          </div>

                          {/* Meta row */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", conf.bg, conf.color)}>
                              {conf.label}
                            </span>
                            {!hideRepo && event.repositoryId !== "all" && (
                              <span className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                                {event.repositoryId.replace("repo-", "repo #")}
                              </span>
                            )}
                            {event.author && (
                              <span className="text-[10px] text-muted-foreground">by {event.author}</span>
                            )}
                          </div>

                          {/* Description */}
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                            {event.description}
                          </p>

                          {/* Tags */}
                          {event.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {event.tags.slice(0, 4).map((tag) => (
                                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
