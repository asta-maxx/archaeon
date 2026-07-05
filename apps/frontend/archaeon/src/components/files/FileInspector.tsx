"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCode2,
  Search,
  X,
  Brain,
  User2,
  ShieldAlert,
  XCircle,
  FileSymlink,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileContextResponse } from "@/lib/api";

// ─── Category badge ───────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  technical: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  operational: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  business: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  regulatory: "bg-orange-400/10 text-orange-400 border-orange-400/20",
  incident: "bg-red-400/10 text-red-400 border-red-400/20",
};

function CategoryBadge({ cat }: { cat?: string }) {
  if (!cat) return null;
  return (
    <span className={cn("text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border", CATEGORY_STYLES[cat] ?? "bg-muted/60 text-muted-foreground border-border/50")}>
      {cat}
    </span>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="h-3.5 w-3.5 text-primary/60" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</span>
    </div>
  );
}

// ─── File context panel ───────────────────────────────────────────────────────

interface FileContextPanelProps {
  context: FileContextResponse;
}

function FileContextPanel({ context }: FileContextPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-5 p-5 h-full overflow-y-auto scrollbar-thin"
    >
      {/* File path */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border/30 px-3 py-2">
        <FileCode2 className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
        <span className="text-xs font-mono text-foreground/80 truncate">{context.filePath}</span>
      </div>

      {/* Why this exists — the hero field */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <SectionHeading icon={Sparkles} label="Why this exists" />
        <p className="text-sm text-foreground/80 leading-relaxed">{context.why}</p>
      </div>

      {/* Author */}
      <div>
        <SectionHeading icon={User2} label="Author" />
        <div className="flex items-center gap-2.5">
          <img
            src={context.author.avatarUrl}
            alt={context.author.displayName}
            className="h-7 w-7 rounded-full border border-border/40"
          />
          <div>
            <div className="text-sm font-medium">{context.author.displayName}</div>
            <div className="text-[10px] text-muted-foreground">@{context.author.handle}</div>
          </div>
        </div>
      </div>

      {/* Decision */}
      {context.decision && (
        <div>
          <SectionHeading icon={Brain} label="Architectural Decision" />
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <div className="text-xs font-semibold text-primary leading-snug">{context.decision.title}</div>
            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{context.decision.summary}</div>
          </div>
        </div>
      )}

      {/* Constraints */}
      {context.constraints.length > 0 && (
        <div>
          <SectionHeading icon={ShieldAlert} label="Constraints" />
          <div className="space-y-1.5">
            {context.constraints.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-3 w-3 text-orange-400/60 flex-shrink-0 mt-0.5" />
                <span className="flex-1 leading-snug">{c.description}</span>
                <CategoryBadge cat={c.category} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternatives */}
      {context.alternatives.length > 0 && (
        <div>
          <SectionHeading icon={XCircle} label="Alternatives Considered" />
          <div className="space-y-1.5">
            {context.alternatives.map((alt, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 text-red-400/60 flex-shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground/70">{alt.name}</span>
                  {" — "}{alt.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related files */}
      {context.relatedFiles.length > 0 && (
        <div>
          <SectionHeading icon={FileSymlink} label="Related Files" />
          <div className="space-y-1">
            {context.relatedFiles.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground rounded-md px-2 py-1 hover:bg-muted/30 transition-colors group cursor-pointer">
                <FileCode2 className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                <span className="font-mono flex-1 truncate group-hover:text-foreground transition-colors">{f}</span>
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyPanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div className="h-12 w-12 rounded-2xl border border-dashed border-border/40 flex items-center justify-center">
        <FileCode2 className="h-5 w-5 text-muted-foreground/30" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Select a file</p>
        <p className="text-xs text-muted-foreground/60">See why it exists, who wrote it, and the architectural decisions behind it.</p>
      </div>
    </div>
  );
}

// ─── File Inspector (full component) ─────────────────────────────────────────

const ALL_FILES = [
  "src/services/transaction.service.ts",
  "src/services/idempotency.service.ts",
  "src/database/database.module.ts",
  "src/auth/token.service.ts",
  "middleware/rate-limit.go",
  "workers/notification_worker.py",
  "deploy/envoy/envoy.yaml",
  // extra files without context (for realistic feel)
  "src/controllers/payment.controller.ts",
  "src/middleware/idempotency.middleware.ts",
  "src/utils/hash.util.ts",
  "src/entities/transaction.entity.ts",
  "src/auth/refresh.strategy.ts",
  "src/auth/jwt.guard.ts",
  "config/limits.yaml",
  "config/celery.py",
];

interface FileInspectorProps {
  repoId: string;
  onSelectFile: (filePath: string) => void;
  selectedFile: string | null;
  fileContext: FileContextResponse | null;
  loading: boolean;
}

export function FileInspector({
  repoId: _repoId,
  onSelectFile,
  selectedFile,
  fileContext,
  loading,
}: FileInspectorProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return ALL_FILES;
    return ALL_FILES.filter((f) => f.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  return (
    <div className="grid grid-cols-[280px_1fr] h-full rounded-xl border border-border/40 bg-card overflow-hidden">
      {/* File list */}
      <div className="flex flex-col border-r border-border/30">
        <div className="flex-shrink-0 px-3 py-2.5 border-b border-border/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              id="file-inspector-search"
              type="text"
              placeholder="Search files…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-border/30 bg-muted/30 pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
          {filtered.map((file) => {
            const hasContext = [
              "src/services/transaction.service.ts",
              "src/services/idempotency.service.ts",
              "src/database/database.module.ts",
              "src/auth/token.service.ts",
              "middleware/rate-limit.go",
              "workers/notification_worker.py",
              "deploy/envoy/envoy.yaml",
            ].includes(file);

            return (
              <button
                key={file}
                onClick={() => onSelectFile(file)}
                className={cn(
                  "w-full text-left flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors group",
                  selectedFile === file
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
              >
                <FileCode2 className="h-3 w-3 flex-shrink-0 opacity-60" />
                <span className="flex-1 font-mono truncate">{file.split("/").pop()}</span>
                {hasContext && (
                  <Sparkles className="h-2.5 w-2.5 text-primary/50 flex-shrink-0" />
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground/50">
              No files match
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-3 py-2 border-t border-border/20">
          <p className="text-[9px] text-muted-foreground/40">
            <Sparkles className="inline h-2.5 w-2.5 mr-1 text-primary/40" />
            Sparkle = Archaeon has context
          </p>
        </div>
      </div>

      {/* Detail panel */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-2">
                <Brain className="h-8 w-8 text-primary/30 animate-pulse" />
                <p className="text-xs text-muted-foreground">Analysing file…</p>
              </div>
            </motion.div>
          ) : fileContext ? (
            <FileContextPanel key={selectedFile} context={fileContext} />
          ) : selectedFile ? (
            <motion.div
              key="no-context"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center"
            >
              <AlertCircle className="h-8 w-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No Archaeon context for this file yet.</p>
              <p className="text-xs text-muted-foreground/50">
                Full analysis available for files marked with{" "}
                <Sparkles className="inline h-2.5 w-2.5 text-primary/50" />.
              </p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
