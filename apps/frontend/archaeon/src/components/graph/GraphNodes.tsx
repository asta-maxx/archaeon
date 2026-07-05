"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import {
  Brain,
  AlertCircle,
  Layers3,
  ShieldAlert,
  Box,
  User2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeType } from "@/lib/types/decision";

// ─── Node type config ─────────────────────────────────────────────────────────

export const NODE_TYPE_CONFIG: Record<
  NodeType,
  {
    icon: React.ElementType;
    bg: string;
    border: string;
    text: string;
    glow: string;
    label: string;
    shape: "rounded" | "diamond" | "hexagon" | "circle" | "rect" | "pill";
  }
> = {
  decision: {
    icon: Brain,
    bg: "bg-[var(--node-bg-decision)]",
    border: "border-[var(--node-decision)]",
    text: "text-[var(--node-decision)]",
    glow: "shadow-[0_0_16px_color-mix(in_oklch,var(--node-decision)_30%,transparent)]",
    label: "Decision",
    shape: "rounded",
  },
  module: {
    icon: Box,
    bg: "bg-[var(--node-bg-module)]",
    border: "border-[var(--node-module)]",
    text: "text-[var(--node-module)]",
    glow: "shadow-[0_0_16px_color-mix(in_oklch,var(--node-module)_30%,transparent)]",
    label: "Module",
    shape: "rect",
  },
  constraint: {
    icon: ShieldAlert,
    bg: "bg-[var(--node-bg-constraint)]",
    border: "border-[var(--node-constraint)]",
    text: "text-[var(--node-constraint)]",
    glow: "shadow-[0_0_16px_color-mix(in_oklch,var(--node-constraint)_30%,transparent)]",
    label: "Constraint",
    shape: "diamond",
  },
  developer: {
    icon: User2,
    bg: "bg-[var(--node-bg-developer)]",
    border: "border-[var(--node-developer)]",
    text: "text-[var(--node-developer)]",
    glow: "shadow-[0_0_16px_color-mix(in_oklch,var(--node-developer)_30%,transparent)]",
    label: "Developer",
    shape: "circle",
  },
  incident: {
    icon: AlertCircle,
    bg: "bg-[var(--node-bg-incident)]",
    border: "border-[var(--node-incident)]",
    text: "text-[var(--node-incident)]",
    glow: "shadow-[0_0_16px_color-mix(in_oklch,var(--node-incident)_35%,transparent)]",
    label: "Incident",
    shape: "hexagon",
  },
  adr: {
    icon: Layers3,
    bg: "bg-[var(--node-bg-adr)]",
    border: "border-[var(--node-adr)]",
    text: "text-[var(--node-adr)]",
    glow: "shadow-[0_0_16px_color-mix(in_oklch,var(--node-adr)_30%,transparent)]",
    label: "ADR",
    shape: "pill",
  },
};

// ─── Shared handles ───────────────────────────────────────────────────────────

function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ width: 6, height: 6, background: "var(--graph-handle-color)", borderColor: "var(--graph-handle-color)" }} />
      <Handle type="source" position={Position.Bottom} style={{ width: 6, height: 6, background: "var(--graph-handle-color)", borderColor: "var(--graph-handle-color)" }} />
      <Handle type="target" position={Position.Left} style={{ width: 6, height: 6, background: "var(--graph-handle-color)", borderColor: "var(--graph-handle-color)" }} />
      <Handle type="source" position={Position.Right} style={{ width: 6, height: 6, background: "var(--graph-handle-color)", borderColor: "var(--graph-handle-color)" }} />
    </>
  );
}

// ─── Base node wrapper ────────────────────────────────────────────────────────

interface BaseNodeProps {
  nodeType: NodeType;
  label: string;
  selected?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function BaseNode({ nodeType, label, selected, children, className, style }: BaseNodeProps) {
  const cfg = NODE_TYPE_CONFIG[nodeType];
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        "relative border transition-all duration-200",
        cfg.bg, cfg.border,
        selected ? cn(cfg.glow, "border-opacity-100 scale-105") : "border-opacity-60 hover:border-opacity-90",
        className
      )}
      style={style}
    >
      <Handles />
      <div className="flex flex-col items-center gap-1 px-3 py-2">
        <div className={cn("flex h-6 w-6 items-center justify-center rounded-full", cfg.bg)}>
          <Icon className={cn("h-3.5 w-3.5", cfg.text)} />
        </div>
        <span className={cn("text-[10px] font-semibold leading-tight text-center max-w-[100px]", cfg.text)}>
          {label}
        </span>
        <span className="text-[8px] uppercase tracking-widest" style={{ color: "var(--graph-node-label-dim)" }}>{cfg.label}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Decision node — rounded pill, purple glow ────────────────────────────────

export function DecisionNode({ data, selected }: NodeProps) {
  const label = (data.label as string) || "Decision";
  return (
    <BaseNode nodeType="decision" label={label} selected={selected} className="rounded-xl min-w-[130px]" />
  );
}

// ─── Module node — rectangle, blue, flat ─────────────────────────────────────

export function ModuleNode({ data, selected }: NodeProps) {
  const label = (data.label as string) || "Module";
  return (
    <BaseNode nodeType="module" label={label} selected={selected} className="rounded-lg min-w-[110px]">
      <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-lg" style={{ background: "color-mix(in oklch, var(--node-module) 50%, transparent)" }} />
    </BaseNode>
  );
}

// ─── Constraint node — rotated diamond ───────────────────────────────────────

export function ConstraintNode({ data, selected }: NodeProps) {
  const cfg = NODE_TYPE_CONFIG.constraint;
  const Icon = cfg.icon;
  const label = (data.label as string) || "Constraint";
  return (
    <div
      className={cn(
        "relative w-[110px] h-[110px] border transition-all duration-200",
        cfg.bg, cfg.border,
        selected ? cn(cfg.glow, "border-opacity-100 scale-105") : "border-opacity-60 hover:border-opacity-90",
      )}
      style={{ transform: "rotate(45deg)" }}
    >
      <Handles />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-0.5"
        style={{ transform: "rotate(-45deg)" }}
      >
        <Icon className={cn("h-4 w-4", cfg.text)} />
        <span className={cn("text-[9px] font-semibold leading-tight text-center max-w-[70px]", cfg.text)}>
          {label}
        </span>
        <span className="text-[7px] uppercase tracking-widest" style={{ color: "var(--graph-node-label-dim)" }}>{cfg.label}</span>
      </div>
    </div>
  );
}

// ─── Developer node — circle ──────────────────────────────────────────────────

export function DeveloperNode({ data, selected }: NodeProps) {
  const cfg = NODE_TYPE_CONFIG.developer;
  const Icon = cfg.icon;
  const label = (data.label as string) || "Developer";
  return (
    <div
      className={cn(
        "relative w-[90px] h-[90px] rounded-full border flex flex-col items-center justify-center gap-0.5 transition-all duration-200",
        cfg.bg, cfg.border,
        selected ? cn(cfg.glow, "border-opacity-100 scale-105") : "border-opacity-60 hover:border-opacity-90",
      )}
    >
      <Handles />
      <Icon className={cn("h-4 w-4", cfg.text)} />
      <span className={cn("text-[9px] font-semibold leading-tight text-center max-w-[72px]", cfg.text)}>
        {label}
      </span>
      <span className="text-[7px] uppercase tracking-widest" style={{ color: "var(--graph-node-label-dim)" }}>{cfg.label}</span>
    </div>
  );
}

// ─── Incident node — hexagon (via clip-path) ──────────────────────────────────

export function IncidentNode({ data, selected }: NodeProps) {
  const cfg = NODE_TYPE_CONFIG.incident;
  const Icon = cfg.icon;
  const label = (data.label as string) || "Incident";
  return (
    <div className="relative" style={{ width: 120, height: 104 }}>
      <Handles />
      <div
        className={cn(
          "absolute inset-0 border-0 transition-all duration-200",
          selected ? cfg.glow : "",
        )}
        style={{
          background: selected ? "var(--node-bg-incident-selected)" : "var(--node-bg-incident)",
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
          outline: `1.5px solid color-mix(in oklch, var(--node-incident) ${selected ? "100%" : "60%"}, transparent)`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 mt-1">
        <Icon className={cn("h-4 w-4", cfg.text)} />
        <span className={cn("text-[9px] font-semibold leading-tight text-center max-w-[80px]", cfg.text)}>
          {label}
        </span>
        <span className="text-[7px] uppercase tracking-widest" style={{ color: "var(--graph-node-label-dim)" }}>{cfg.label}</span>
      </div>
    </div>
  );
}

// ─── ADR node — pill / stadium ────────────────────────────────────────────────

export function AdrNode({ data, selected }: NodeProps) {
  const label = (data.label as string) || "ADR";
  return (
    <BaseNode nodeType="adr" label={label} selected={selected} className="rounded-full min-w-[130px]" />
  );
}
