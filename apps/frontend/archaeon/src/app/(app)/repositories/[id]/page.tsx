import { getRepository, getDecisions, getTimeline, getRepoJob } from "@/lib/api";
import { notFound } from "next/navigation";
import { DecisionCard } from "@/components/repositories/DecisionCard";
import { RepoDetailHeader } from "@/components/repositories/RepoDetailHeader";
import { RepoStats } from "@/components/repositories/RepoStats";
import { AnalyzingState } from "@/components/repositories/AnalyzingState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Brain, FileCode2, Clock } from "lucide-react";
import { RepoTimeline } from "@/components/timeline/RepoTimeline";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const repo = await getRepository(id);
  if (!repo) return { title: "Not Found — Archaeon" };
  return {
    title: `${repo.name} — Archaeon`,
    description: `Architectural decisions for ${repo.fullName}`,
  };
}

export default async function RepositoryDetailPage({ params }: Props) {
  const { id } = await params;
  const [repo, decisions, timeline, job] = await Promise.all([
    getRepository(id),
    getDecisions(id),
    getTimeline(id),
    getRepoJob(id),
  ]);
  if (!repo) notFound();

  // Job is actively running when status is queued/processing/partial.
  // "partial" is special: some decisions may already be present alongside the banner.
  const isProcessing = job && (job.status === "queued" || job.status === "processing");
  const isPartial = job && job.status === "partial";
  const isAnalyzing = isProcessing || isPartial;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <RepoDetailHeader repo={repo} />
      <RepoStats repo={repo} />

      <Tabs defaultValue="decisions" className="space-y-4">
        <TabsList className="bg-muted/40 border border-border/50 p-1 h-9">
          <TabsTrigger value="decisions" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Brain className="h-3.5 w-3.5" />
            Decisions
            {isPartial
              ? ` (${decisions.length} partial)`
              : ` (${decisions.length})`}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <Clock className="h-3.5 w-3.5" />Timeline ({timeline.length})
          </TabsTrigger>
          <TabsTrigger value="files" className="text-xs gap-1.5 data-[state=active]:bg-background">
            <FileCode2 className="h-3.5 w-3.5" />Files ({repo.filesIndexed})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decisions" className="space-y-3 mt-4">
          {/* Show analyzing banner when job is active (processing or partial) */}
          {isAnalyzing && job && (
            <AnalyzingState job={job} decisionsExtracted={decisions.length} />
          )}

          {/* For "partial": show whatever decisions have been extracted so far */}
          {/* For "processing": decisions array will be empty — don't show empty state, banner already explains */}
          {decisions.length > 0 ? (
            <div className={isPartial ? "space-y-3 mt-2" : "space-y-3"}>
              {isPartial && (
                <p className="text-xs text-muted-foreground px-1">
                  Showing {decisions.length} extracted decision{decisions.length !== 1 ? "s" : ""} — more on the way
                </p>
              )}
              {decisions.map((decision) => (
                <DecisionCard key={decision.id} decision={decision} />
              ))}
            </div>
          ) : !isAnalyzing ? (
            // Only show empty state if the job is NOT active (e.g. a completed repo with 0 decisions)
            <EmptyState
              icon={Brain}
              title="No decisions indexed yet"
              description="This repository was indexed but no architectural decisions were detected. Try re-indexing or checking the ADR directory."
            />
          ) : null}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          {timeline.length > 0 ? (
            <RepoTimeline events={timeline} />
          ) : (
            <EmptyState
              icon={Clock}
              title={isAnalyzing ? "Timeline pending" : "No timeline events yet"}
              description={
                isAnalyzing
                  ? "Timeline events will appear once the intelligence pipeline completes analysis."
                  : "Timeline events will appear once the repository is indexed."
              }
            />
          )}
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <EmptyState
            icon={FileCode2}
            title="File explorer — Day 3"
            description="Individual file inspection with 'why this exists' context is coming on Day 3."
            badge="Coming soon"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
