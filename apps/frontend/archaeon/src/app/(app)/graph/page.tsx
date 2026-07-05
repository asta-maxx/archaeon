"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Network, ChevronDown, AlertTriangle, RefreshCw } from "lucide-react";
import { getDecisionGraph, getRepositories } from "@/lib/api";
import type { GraphResponse } from "@/lib/api";
import type { Repository } from "@/lib/types/decision";
import { DecisionGraph } from "@/components/graph/DecisionGraph";
import { Button } from "@/components/ui/button";

export default function GraphPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState("repo-1");
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRepositories()
      .then((r) => {
        setRepos(r.filter((repo) => repo.indexingStatus === "indexed" || repo.decisionCount > 0));
      })
      .catch(() => {
        // Non-critical — repos list is just for the selector
      });
  }, []);

  function loadGraph(repoId: string) {
    setLoading(true);
    setError(null);
    setGraphData(null);
    getDecisionGraph(repoId)
      .then((data) => {
        setGraphData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[Archaeon] Graph load failed:", err);
        setError("Failed to load the decision graph. Check the backend connection or enable Demo Mode.");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadGraph(selectedRepoId);
  }, [selectedRepoId]);

  const selectedRepo = repos.find((r) => r.id === selectedRepoId);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-xl sm:text-2xl font-semibold tracking-tight"
          >
            Decision Graph
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs sm:text-sm text-muted-foreground"
          >
            Interactive knowledge graph — decisions, modules, constraints, developers, incidents, and ADRs.
          </motion.p>
        </div>

        {/* Repo selector */}
        <div className="relative flex-shrink-0">
          <select
            id="graph-repo-select"
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="appearance-none rounded-lg border border-border/50 bg-card text-sm text-foreground pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
          >
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            {repos.length === 0 && (
              <option value="repo-1">payment-service</option>
            )}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 mx-4 sm:mx-6 mb-4 sm:mb-6 rounded-xl border border-border/40 bg-card overflow-hidden relative min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Network className="h-10 w-10 text-primary/30 animate-pulse" />
              <p className="text-sm text-muted-foreground">Loading graph…</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-sm">Graph unavailable</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => loadGraph(selectedRepoId)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && graphData && (
          <motion.div
            key={selectedRepoId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <DecisionGraph data={graphData} repoName={selectedRepo?.name} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
