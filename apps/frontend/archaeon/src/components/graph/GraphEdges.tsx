"use client";

import type { EdgeProps } from "@xyflow/react";
import { BaseEdge, getStraightPath, getBezierPath, EdgeLabelRenderer } from "@xyflow/react";
import { cn } from "@/lib/utils";

// ─── Edge type config ─────────────────────────────────────────────────────────

// 5 distinct edge types, each with a different visual style:
//   depends_on    → solid blue      (thick, dominant relationship)
//   introduced_by → dashed purple   (authorship provenance)
//   supersedes    → solid green     (evolution / replacement)
//   related_to    → dashed gray     (loose association)
//   caused_by     → dotted red      (incident causality — danger signal)

const EDGE_STYLES: Record<
  string,
  { stroke: string; strokeDash?: string; strokeWidth: number; labelBg: string; labelText: string; displayLabel: string }
> = {
  depends_on: {
    stroke: "var(--node-module)",
    strokeWidth: 2,
    labelBg: "var(--node-bg-module)",
    labelText: "var(--node-module)",
    displayLabel: "depends on",
  },
  introduced_by: {
    stroke: "var(--node-developer)",
    strokeDash: "6 4",
    strokeWidth: 1.5,
    labelBg: "var(--node-bg-developer)",
    labelText: "var(--node-developer)",
    displayLabel: "introduced by",
  },
  supersedes: {
    stroke: "var(--node-adr)",
    strokeWidth: 2.5,
    labelBg: "var(--node-bg-adr)",
    labelText: "var(--node-adr)",
    displayLabel: "supersedes",
  },
  related_to: {
    stroke: "var(--muted-foreground)",
    strokeDash: "4 4",
    strokeWidth: 1,
    labelBg: "var(--muted)",
    labelText: "var(--foreground)",
    displayLabel: "related to",
  },
  caused_by: {
    stroke: "var(--node-incident)",
    strokeDash: "2 4",
    strokeWidth: 2,
    labelBg: "var(--node-bg-incident)",
    labelText: "var(--node-incident)",
    displayLabel: "caused by",
  },
};

const DEFAULT_STYLE = EDGE_STYLES.related_to;

// ─── Archaeon edge component ──────────────────────────────────────────────────

export function ArchaeonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}: EdgeProps) {
  const edgeLabel = (data?.label as string) ?? "related_to";
  const style = EDGE_STYLES[edgeLabel] ?? DEFAULT_STYLE;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: style.stroke,
          strokeWidth: selected ? style.strokeWidth + 1 : style.strokeWidth,
          strokeDasharray: style.strokeDash,
          opacity: selected ? 1 : 0.65,
          transition: "opacity 0.15s, stroke-width 0.15s",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nopan absolute pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            opacity: selected ? 1 : 0,
            transition: "opacity 0.15s",
          }}
        >
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{
              background: style.labelBg,
              color: style.labelText,
              border: `1px solid ${style.stroke}40`,
            }}
          >
            {style.displayLabel}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// ─── Edge legend (for rendering outside the graph) ────────────────────────────

export function EdgeLegend() {
  return (
    <div className="flex flex-col gap-1.5">
      {Object.entries(EDGE_STYLES).map(([key, style]) => (
        <div key={key} className="flex items-center gap-2">
          <svg width="28" height="10" className="flex-shrink-0">
            <line
              x1="0"
              y1="5"
              x2="28"
              y2="5"
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDash}
            />
          </svg>
          <span className="text-[10px] text-muted-foreground capitalize">{style.displayLabel}</span>
        </div>
      ))}
    </div>
  );
}
