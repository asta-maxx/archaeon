"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";

import type { GraphResponse } from "@/lib/api";
import type { GraphNode } from "@/lib/types/decision";
import { NODE_TYPE_CONFIG, DecisionNode, ModuleNode, ConstraintNode, DeveloperNode, IncidentNode, AdrNode } from "./GraphNodes";
import { ArchaeonEdge, EdgeLegend } from "./GraphEdges";
import { NodeDetailPanel } from "./NodeDetailPanel";
import { cn } from "@/lib/utils";

// ─── Node / edge type registries ─────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  decision: DecisionNode,
  module: ModuleNode,
  constraint: ConstraintNode,
  developer: DeveloperNode,
  incident: IncidentNode,
  adr: AdrNode,
};

const edgeTypes: EdgeTypes = {
  archaeon: ArchaeonEdge,
};

// ─── Layout: simple force-directed positioning (deterministic for SSR safety) ─

function layoutNodes(graphNodes: GraphNode[]): { x: number; y: number }[] {
  // Group by type and space out in a rough radial layout
  const typeOrder = ["developer", "decision", "module", "constraint", "incident", "adr"] as const;
  const byType: Record<string, GraphNode[]> = {};
  for (const n of graphNodes) {
    if (!byType[n.type]) byType[n.type] = [];
    byType[n.type].push(n);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  const cx = 500, cy = 350;
  const rings: Record<string, number> = {
    developer: 0,
    decision: 1,
    module: 2,
    constraint: 2,
    incident: 1.5,
    adr: 2.5,
  };

  for (const type of typeOrder) {
    const nodes = byType[type] ?? [];
    const r = rings[type] * 220;
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1) + (typeOrder.indexOf(type) * 0.4);
      positions[n.id] = {
        x: r === 0 ? cx + i * 120 - ((nodes.length - 1) * 60) : cx + r * Math.cos(angle) - 55,
        y: r === 0 ? cy - 260 : cy + r * Math.sin(angle) - 35,
      };
    });
  }

  return graphNodes.map((n) => positions[n.id] ?? { x: 100, y: 100 });
}

// ─── Adapter: GraphNode[] → React Flow Node[] ─────────────────────────────────

function adaptNodes(graphNodes: GraphNode[]): Node[] {
  const positions = layoutNodes(graphNodes);
  return graphNodes.map((n, i) => ({
    id: n.id,
    type: n.type,
    position: positions[i],
    data: { label: n.label, nodeType: n.type, ...n.metadata },
  }));
}

function adaptEdges(graphEdges: { id: string; source: string; target: string; label: string }[]): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "archaeon",
    data: { label: e.label },
    animated: e.label === "caused_by",
  }));
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function GraphLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute bottom-4 left-4 z-10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg px-2.5 py-1.5 hover:text-foreground transition-colors"
      >
        Legend
        <span className="text-[8px] opacity-50">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-8 left-0 w-56 rounded-xl border border-border/50 bg-card/95 backdrop-blur-sm p-3 space-y-3"
        >
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Nodes</div>
            <div className="flex flex-col gap-1">
              {(["decision", "module", "constraint", "developer", "incident", "adr"] as const).map((type) => {
                const cfg = NODE_TYPE_CONFIG[type];
                const Icon = cfg.icon;
                return (
                  <div key={type} className="flex items-center gap-2">
                    <div className={cn("flex h-5 w-5 items-center justify-center rounded border flex-shrink-0", cfg.bg, cfg.border)}>
                      <Icon className={cn("h-3 w-3", cfg.text)} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border/20 pt-2">
            <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Edges</div>
            <EdgeLegend />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main graph component ─────────────────────────────────────────────────────

interface DecisionGraphProps {
  data: GraphResponse;
  repoName?: string;
}

/** Returns whether the current OS/class preference is dark. Updates live. */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    mq.addEventListener("change", handler);
    // Also watch for class mutations in case ThemeProvider fires after first render
    const mo = new MutationObserver(handler);
    mo.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => {
      mq.removeEventListener("change", handler);
      mo.disconnect();
    };
  }, []);

  return isDark;
}

export function DecisionGraph({ data, repoName }: DecisionGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(adaptNodes(data.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(adaptEdges(data.edges));
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const isDark = useIsDark();

  // Re-adapt when data changes
  useEffect(() => {
    setNodes(adaptNodes(data.nodes));
    setEdges(adaptEdges(data.edges));
  }, [data, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const graphNode = data.nodes.find((n) => n.id === node.id) ?? null;
      setSelectedNode(graphNode);
    },
    [data.nodes]
  );

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        colorMode={isDark ? "dark" : "light"}
        defaultEdgeOptions={{ type: "archaeon" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color={isDark ? "oklch(1 0 0 / 5%)" : "oklch(0 0 0 / 6%)"}
        />
        <Controls
          className="!backdrop-blur-sm !rounded-xl !shadow-none"
        />
        <MiniMap
          className="!backdrop-blur-sm !rounded-xl !overflow-hidden"
          nodeColor={(n) => {
            const type = (n.data?.nodeType as string) || "decision";
            if (isDark) {
              const colors: Record<string, string> = {
                decision: "oklch(0.72 0.2 265)",
                module: "oklch(0.65 0.18 220)",
                constraint: "oklch(0.72 0.18 45)",
                developer: "oklch(0.72 0.18 300)",
                incident: "oklch(0.65 0.22 25)",
                adr: "oklch(0.72 0.18 145)",
              };
              return colors[type] ?? "oklch(0.72 0.2 265)";
            } else {
              const colors: Record<string, string> = {
                decision: "oklch(0.55 0.22 265)",
                module: "oklch(0.52 0.2 220)",
                constraint: "oklch(0.58 0.2 45)",
                developer: "oklch(0.55 0.2 300)",
                incident: "oklch(0.55 0.22 25)",
                adr: "oklch(0.52 0.18 145)",
              };
              return colors[type] ?? "oklch(0.55 0.22 265)";
            }
          }}
          maskColor={isDark ? "oklch(0.09 0.005 265 / 70%)" : "oklch(0.97 0.004 265 / 75%)"}
        />
      </ReactFlow>

      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      <GraphLegend />

      {/* Node / edge counts */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm border border-border/40 rounded-full px-2.5 py-1">
          {data.nodes.length} nodes · {data.edges.length} edges
          {repoName && <> · <span className="text-foreground/60">{repoName}</span></>}
        </span>
      </div>
    </div>
  );
}
