"use client";

import { X, Brain, AlertCircle, Layers3, ShieldAlert, Box, User2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { GraphNode } from "@/lib/types/decision";
import { NODE_TYPE_CONFIG } from "./GraphNodes";

interface NodeDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
}

const META_LABELS: Record<string, string> = {
  decisionId: "Decision ID",
  status: "Status",
  confidence: "Confidence",
  date: "Date",
  path: "Path",
  fileCount: "Files",
  category: "Category",
  displayName: "Name",
  decisionCount: "Decisions",
  severity: "Severity",
  affected: "Users Affected",
  adrNumber: "ADR #",
};

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute right-4 top-4 z-10 w-72 rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm overflow-hidden"
        >
          {/* Header */}
          {(() => {
            const cfg = NODE_TYPE_CONFIG[node.type];
            const Icon = cfg.icon;
            return (
              <div className={cn("px-4 py-3 flex items-start gap-3 border-b border-border/30", cfg.bg)}>
                <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border", cfg.border)}>
                  <Icon className={cn("h-4 w-4", cfg.text)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-[9px] font-semibold uppercase tracking-widest mb-0.5", cfg.text)}>
                    {cfg.label}
                  </div>
                  <h3 className="text-sm font-semibold leading-snug text-foreground">{node.label}</h3>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })()}

          {/* Metadata */}
          {node.metadata && Object.keys(node.metadata).length > 0 && (
            <div className="px-4 py-3 space-y-2 border-b border-border/20">
              {Object.entries(node.metadata).map(([key, val]) => {
                if (key === "avatarUrl") return null;
                const label = META_LABELS[key] ?? key;
                let displayVal = String(val);
                if (key === "confidence") displayVal = `${Math.round(Number(val) * 100)}%`;
                if (key === "severity") displayVal = (val as string).toUpperCase();
                return (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground/60">{label}</span>
                    <span className="text-[10px] font-medium text-foreground/80 text-right truncate max-w-[140px]">
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Node ID */}
          <div className="px-4 py-2.5">
            <span className="text-[9px] font-mono text-muted-foreground/40">{node.id}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
