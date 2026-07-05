/**
 * RepoTimeline — lightweight wrapper used inside the repo-detail Tabs panel.
 * Delegates rendering to TimelineView with hideRepo=true.
 */
import type { TimelineEvent } from "@/lib/types/decision";
import { TimelineView } from "./TimelineView";

interface RepoTimelineProps {
  events: TimelineEvent[];
}

export function RepoTimeline({ events }: RepoTimelineProps) {
  return (
    <div className="pt-2">
      <TimelineView events={events} hideRepo />
    </div>
  );
}
