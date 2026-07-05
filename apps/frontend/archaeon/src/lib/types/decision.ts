/**
 * Archaeon — Shared Decision Object Schema
 *
 * Single source of truth for all types used across the frontend,
 * and the contract Member 2 (Django/archaeon-backend) and Member 3
 * (repository-intelligence-service) code against.
 *
 * When wiring up real APIs, only lib/api.ts should change.
 * These types should remain stable as the integration contract.
 *
 * ARCHITECTURE NOTE (Day 3 update):
 * archaeon-web (Next.js) → archaeon-backend (Django/DRF) → repository-intelligence-service
 * This frontend NEVER calls the intelligence service or Cognee/Neo4j directly.
 * All data flows through Django only.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core fields below are assumed from PROJECT_ARCHITECTURE.md section 4.
// Confirm exact field list with Member 2 (Django) once archaeon-backend's
// public API spec exists — Django's serializer output is the actual source of
// truth, not this file. The ArchitectureDecision shape flows from the
// intelligence service through Django to the frontend unchanged in spirit;
// Django may add wrapper fields (DB id, workspace, etc.) around it.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Primitive enums ─────────────────────────────────────────────────────────

export type DecisionStatus = "active" | "superseded" | "deprecated";
export type NodeType =
  | "decision"
  | "constraint"
  | "incident"
  | "adr"
  | "module"
  | "developer";
export type IndexingStatus = "indexed" | "indexing" | "pending" | "error";

/**
 * Job status for the async Celery Repository Processing Job in Django.
 * A repo import triggers a job; this status is what getJobStatus() returns.
 * Maps to UI states: queued/processing → "Analyzing…", completed → decisions,
 * partial → some decisions shown + still-in-progress banner, failed → error state.
 */
export type JobStatus = "queued" | "processing" | "completed" | "partial" | "failed";

/** Shape returned by getJobStatus() — mirrors Django's job status endpoint */
export interface RepositoryJob {
  jobId: string;
  repositoryId: string;
  status: JobStatus;
  /** ISO 8601 timestamp when the job was enqueued */
  startedAt: string;
  /** ISO 8601 timestamp when the job completed (undefined while in-progress) */
  completedAt?: string;
  /** Progress 0–100, best-effort (undefined until Django provides it) */
  progress?: number;
  /** Human-readable status message from the intelligence service */
  message?: string;
  /** How many decisions have been extracted so far (useful for "partial" state) */
  decisionsExtracted?: number;
}

// ─── Core domain objects ──────────────────────────────────────────────────────

/**
 * A single author who created or owns a decision.
 * Extracted from git blame, PR authors, or ADR metadata.
 */
export interface Author {
  /** GitHub handle / username */
  handle: string;
  /** Display name, optional (falls back to handle) */
  displayName?: string;
  /** Avatar URL — GitHub CDN or DiceBear */
  avatarUrl: string;
}

/**
 * An alternative approach that was considered and rejected.
 * Each alternative explains *why* it was not chosen.
 */
export interface Alternative {
  /** The technology / approach name */
  name: string;
  /** Why it was not chosen */
  reason: string;
}

/**
 * A constraint that shaped or forced a decision.
 * Can be technical, business, regulatory, or operational.
 */
export interface Constraint {
  /** Human-readable constraint description */
  description: string;
  /**
   * Constraint category for filtering:
   * "technical" | "business" | "regulatory" | "operational" | "incident"
   */
  category?: string;
}

/**
 * A codebase module / bounded context this decision belongs to.
 */
export interface Module {
  /** Module name, e.g. "Payment Processing", "Data Layer" */
  name: string;
  /** Optional path prefix in the repo */
  path?: string;
}

/**
 * Core architectural decision — the primary domain object (locked contract).
 *
 * ⚠️  NAMING: This type is exported both as `Decision` (legacy, keeps existing
 * call sites compiling) and as `ArchitectureDecision` (the name used in
 * PROJECT_ARCHITECTURE.md section 4 as the cross-team contract). Use
 * `ArchitectureDecision` in any new code written after Day 3.
 *
 * This is what the intelligence-service produces, Django stores & serialises,
 * and this frontend consumes. Must never break without a version bump agreed
 * with Member 2 (Django serializer) and Member 3 (intelligence service output).
 */
export interface ArchitectureDecision {
  /** Stable unique ID (e.g. "dec-1", or a UUID from the backend) */
  id: string;
  /** ID of the repository this decision belongs to */
  repositoryId: string;

  /** Short title / headline of the decision */
  title: string;
  /** One-sentence summary */
  summary: string;
  /**
   * Full explanation of *why* this decision was made.
   * This is the high-value field the AI extracts from PRs, commits, ADRs.
   */
  why: string;

  /** Whether this decision is currently in effect */
  status: DecisionStatus;

  /** Primary author (structured) */
  author: Author;

  /** ISO 8601 date string when the decision was made */
  date: string;

  /** Files most closely associated with this decision */
  files: string[];

  /** Module this decision affects */
  module: Module;

  /** Alternatives that were considered and rejected */
  alternatives: Alternative[];

  /** Constraints that shaped this decision */
  constraints: Constraint[];

  /** Related PR numbers */
  relatedPRs: number[];

  /** AI extraction confidence score, 0–1 */
  confidence: number;

  /** Node type in the knowledge graph */
  nodeType: NodeType;

  /** Free-form tags for filtering */
  tags: string[];
}

/**
 * Legacy alias — keeps all existing import sites (`Decision`) compiling.
 * Prefer `ArchitectureDecision` in new code.
 */
export type Decision = ArchitectureDecision;

/**
 * A single event in the architecture timeline.
 * Ordered by date to build the evolution view.
 */
export interface TimelineEvent {
  /** Stable ID */
  id: string;
  /** Repository this event belongs to */
  repositoryId: string;
  /** ISO 8601 date */
  date: string;
  /** Year label for grouping */
  year: number;
  /** Short headline */
  title: string;
  /** Longer description */
  description: string;
  /** Visual type determines icon + color coding */
  type: "decision" | "adr" | "incident" | "constraint" | "milestone";
  /** If this event links to a Decision, its ID */
  decisionId?: string;
  /** Tags inherited or independent */
  tags: string[];
  /** Optional: author handle */
  author?: string;
}

/**
 * Repository — the top-level container for decisions.
 *
 * Populated by Member 3's GitHub ingestion pipeline.
 */
export interface Repository {
  /** e.g. "repo-1" or GitHub node ID */
  id: string;
  /** Short name, e.g. "payment-service" */
  name: string;
  /** owner/repo format */
  fullName: string;
  description: string;
  language: string;
  stars: number;
  /** ISO string — when Archaeon last indexed this repo */
  lastIndexed: string;
  indexingStatus: IndexingStatus;
  decisionCount: number;
  filesIndexed: number;
  prCount: number;
  adrCount: number;
  commitCount: number;
  branch: string;
  owner: string;
  avatarUrl: string;
  topics: string[];
  /** ISO string — when the repo was created on GitHub */
  createdAt: string;
  /** ISO string — date of the first commit */
  firstCommit: string;
}

// ─── Graph types (Day 3) ──────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** e.g. "depends_on" | "introduced_by" | "supersedes" | "caused_by" */
  label: string;
}

// ─── API filter shapes ────────────────────────────────────────────────────────

/**
 * Filter bag for getDecisions().
 * All fields are optional — omit to return all decisions.
 */
export interface DecisionFilters {
  /** Free-text search across title, summary, why, tags */
  query?: string;
  /** Filter by author handle */
  author?: string;
  /** Filter by module name */
  module?: string;
  /** Filter by node type */
  type?: NodeType;
  /** Filter by status */
  status?: DecisionStatus;
  /** Filter by tag */
  tag?: string;
}

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalRepositories: number;
  totalDecisions: number;
  totalADRs: number;
  totalFilesIndexed: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: "decision_added" | "adr_created" | "repo_indexed" | "pr_analyzed";
  description: string;
  repositoryName: string;
  timestamp: string;
  author?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  githubHandle: string;
  plan: "free" | "pro" | "enterprise";
}
