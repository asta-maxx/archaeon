/**
 * lib/api.ts — Archaeon data access layer (Backend-aligned)
 *
 * All calls go to Django backend. Real URLs are workspace-scoped:
 *   /api/workspaces/{workspace_id}/decisions/
 *   /api/workspaces/{workspace_id}/repositories/
 *   /api/workspaces/{workspace_id}/jobs/{id}/
 *   etc.
 *
 * Demo Mode (NEXT_PUBLIC_DEMO_MODE=true) falls back to mock data instantly.
 */

import type {
  Repository,
  ArchitectureDecision,
  Decision,
  DecisionFilters,
  DashboardStats,
  TimelineEvent,
  User,
  RepositoryJob,
  GraphNode,
  GraphEdge,
} from "./types/decision";

import {
  mockRepositories,
  mockDecisions,
  mockDashboardStats,
  mockTimeline,
  mockUser,
  mockRepositoryJobs,
  mockGraphNodes,
  mockGraphEdges,
  mockFileContexts,
  type FileContextResponse,
} from "./mock-data";

import {
  authHeaders,
  setTokens,
  setCurrentUser,
  getActiveWorkspaceId,
  clearTokens,
  getRefreshToken,
  type CurrentUserInfo,
} from "./auth-store";

export type { FileContextResponse };

// ─── Shared response types ────────────────────────────────────────────────────

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Backend paginated envelope
interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── Base URL ─────────────────────────────────────────────────────────────────

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const API_PREFIX = `${API_BASE_URL}/api`;

// ─── Demo Mode ────────────────────────────────────────────────────────────────

let _demoModeRuntime: boolean | null = null;

export function isDemoMode(): boolean {
  if (_demoModeRuntime !== null) return _demoModeRuntime;
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function enableDemoMode(): void {
  _demoModeRuntime = true;
  console.info("[Archaeon] Demo Mode ON — using mock data");
}

export function disableDemoMode(): void {
  _demoModeRuntime = false;
  console.info("[Archaeon] Demo Mode OFF — using real API");
}

// ─── Error types ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public status: number, public endpoint: string, message?: string) {
    super(message ?? `API error ${status} from ${endpoint}`);
    this.name = "ApiError";
  }
}

async function parseResponse<T>(res: Response, endpoint: string): Promise<T> {
  if (!res.ok) throw new ApiError(res.status, endpoint);
  return res.json() as Promise<T>;
}

// ─── Field Adapters (snake_case backend → camelCase frontend) ─────────────────

// Backend Repository schema
interface BackendRepository {
  id: string;
  workspace: string;
  project: string | null;
  name: string;
  full_name: string;
  github_id: string;
  html_url: string;
  clone_url: string;
  default_branch: string;
  sync_branch?: string;
  visibility?: string;
  primary_language?: string;
  installation_id?: string;
  sync_status: "pending" | "syncing" | "synced" | "failed";
  processing_status: "idle" | "queued" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

function adaptRepository(r: BackendRepository): Repository {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: "",
    language: r.primary_language ?? "Unknown",
    stars: 0,
    lastIndexed: r.updated_at,
    indexingStatus:
      r.processing_status === "completed"
        ? "indexed"
        : r.processing_status === "processing" || r.processing_status === "queued"
        ? "indexing"
        : r.processing_status === "failed"
        ? "error"
        : "pending",
    decisionCount: 0,
    filesIndexed: 0,
    prCount: 0,
    adrCount: 0,
    commitCount: 0,
    branch: r.default_branch ?? r.sync_branch ?? "main",
    owner: r.full_name.split("/")[0] ?? "",
    avatarUrl: `https://github.com/${r.full_name.split("/")[0]}.png`,
    topics: [],
    createdAt: r.created_at,
    firstCommit: r.created_at,
  };
}

// Backend ArchitectureDecision schema
interface BackendDecision {
  id: string;
  repository: string;
  title: string;
  status: string;
  rationale?: string;
  module_name?: string;
  adr_source?: string;
  developer_name?: string;
  commit_hash?: string;
  pr_number?: string;
  incident_key?: string;
  superseded_by?: string | null;
  constraints: Array<{ id: string; constraint_text: string }>;
  alternatives: Array<{ id: string; alternative_text: string }>;
  history: Array<{ id: string; action_type: string; description: string; timestamp: string }>;
  created_at: string;
  updated_at: string;
}

function adaptDecision(d: BackendDecision): ArchitectureDecision {
  return {
    id: d.id,
    repositoryId: d.repository,
    title: d.title,
    summary: d.rationale?.split(".")[0] ?? d.title,
    why: d.rationale ?? "",
    status:
      d.status === "superseded" ? "superseded" : d.status === "deprecated" ? "deprecated" : "active",
    author: {
      handle: d.developer_name ?? "unknown",
      displayName: d.developer_name ?? "Unknown",
      avatarUrl: d.developer_name
        ? `https://github.com/${d.developer_name}.png`
        : "https://api.dicebear.com/7.x/initials/svg?seed=UN",
    },
    date: d.created_at,
    files: [],
    module: { name: d.module_name ?? "General" },
    alternatives: d.alternatives.map((a) => ({ name: a.alternative_text, reason: "" })),
    constraints: d.constraints.map((c) => ({ description: c.constraint_text })),
    relatedPRs: d.pr_number ? [parseInt(d.pr_number, 10)].filter((n) => !isNaN(n)) : [],
    confidence: 0.9,
    nodeType: "decision",
    tags: [d.module_name, d.adr_source].filter(Boolean) as string[],
  };
}

// Backend CurrentUser → frontend User
function adaptUser(u: CurrentUserInfo): User {
  return {
    id: u.id,
    name: u.name ?? u.github_username ?? u.email,
    email: u.email,
    avatarUrl: u.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${u.email}`,
    githubHandle: u.github_username ?? "",
    plan: "pro",
  };
}

// Backend ProcessingJob → frontend RepositoryJob
interface BackendJob {
  id: string;
  job_type: string;
  status: "pending" | "queued" | "running" | "success" | "failed" | "cancelled";
  workspace: string;
  project: string | null;
  repository: string | null;
  requested_by: string | null;
  celery_task_id: string;
  progress: number;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

function adaptJob(j: BackendJob): RepositoryJob {
  const statusMap: Record<string, RepositoryJob["status"]> = {
    pending: "queued",
    queued: "queued",
    running: "processing",
    success: "completed",
    failed: "failed",
    cancelled: "failed",
  };
  return {
    jobId: j.id,
    repositoryId: j.repository ?? "",
    status: statusMap[j.status] ?? "queued",
    startedAt: j.started_at ?? j.created_at,
    completedAt: j.completed_at ?? undefined,
    progress: j.progress,
    message: j.error_message || undefined,
  };
}

// ─── Workspace helper ─────────────────────────────────────────────────────────

function workspacePrefix(): string {
  const wsId = getActiveWorkspaceId();
  if (!wsId) throw new Error("No active workspace — user must log in first");
  return `${API_PREFIX}/workspaces/${wsId}`;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Step 1: Get GitHub OAuth URL from backend.
 * Backend: POST /api/auth/github/login/ → { url: string }
 */
export async function getGitHubLoginUrl(): Promise<string> {
  const res = await fetch(`${API_PREFIX}/auth/github/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new ApiError(res.status, "/api/auth/github/login/");
  const data = await res.json() as Record<string, string>;
  // Backend returns the authorization URL — key may vary
  return data.url ?? data.authorization_url ?? data.redirect_url ?? "";
}

/**
 * Step 2: Exchange OAuth code for JWT tokens.
 * Backend: POST /api/auth/github/callback/ → { access, refresh }
 */
export async function githubCallback(
  code: string,
  state?: string
): Promise<{ success: boolean; user?: User }> {
  try {
    const body: Record<string, string> = { code };
    if (state) body.state = state;

    const res = await fetch(`${API_PREFIX}/auth/github/callback/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) return { success: false };

    const data = await res.json() as { access: string; refresh: string };
    setTokens(data.access, data.refresh);

    const user = await getCurrentUser();
    return { success: true, user };
  } catch {
    return { success: false };
  }
}

/**
 * Refresh the access token using the stored refresh token.
 * Backend: POST /api/auth/refresh/ → { access }
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_PREFIX}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json() as { access: string };
    setTokens(data.access, refresh);
    return true;
  } catch {
    return false;
  }
}

/** Clear tokens — call on sign-out. Also blacklists the refresh token. */
export async function logout(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await fetch(`${API_PREFIX}/auth/logout/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ refresh }),
      });
    } catch {
      // ignore network errors on logout
    }
  }
  clearTokens();
}

/** Returns true if an access token is held in memory. */
export { isAuthenticated } from "./auth-store";

// Legacy username/password login (demo mode only)
export async function login(
  username: string,
  _password: string
): Promise<{ success: boolean; user?: User }> {
  if (isDemoMode()) {
    return { success: true, user: { ...mockUser, name: username } };
  }
  return { success: false };
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<User> {
  if (isDemoMode()) return mockUser;
  if (!API_BASE_URL) return mockUser;

  try {
    const res = await fetch(`${API_PREFIX}/auth/me/`, { headers: authHeaders() });
    const raw = await parseResponse<CurrentUserInfo>(res, "/api/auth/me/");
    setCurrentUser(raw);
    return adaptUser(raw);
  } catch (err) {
    console.warn("[Archaeon] getCurrentUser() failed, using mock:", err);
    return mockUser;
  }
}

// ─── Repositories ─────────────────────────────────────────────────────────────

export async function getRepositories(): Promise<Repository[]> {
  if (isDemoMode()) return mockRepositories;
  if (!API_BASE_URL) return mockRepositories;

  try {
    const res = await fetch(`${workspacePrefix()}/repositories/`, {
      headers: authHeaders(),
      next: { revalidate: 30 },
    });
    const data = await parseResponse<Paginated<BackendRepository>>(res, "/repositories/");
    return data.results.map(adaptRepository);
  } catch (err) {
    console.warn("[Archaeon] getRepositories() failed, using mock:", err);
    return mockRepositories;
  }
}

export async function getRepository(id: string): Promise<Repository | null> {
  if (isDemoMode()) return mockRepositories.find((r) => r.id === id) ?? null;
  if (!API_BASE_URL) return mockRepositories.find((r) => r.id === id) ?? null;

  try {
    const res = await fetch(`${workspacePrefix()}/repositories/${id}/`, {
      headers: authHeaders(),
      next: { revalidate: 30 },
    });
    if (res.status === 404) return null;
    const raw = await parseResponse<BackendRepository>(res, `/repositories/${id}/`);
    return adaptRepository(raw);
  } catch (err) {
    console.warn("[Archaeon] getRepository() failed, using mock:", err);
    return mockRepositories.find((r) => r.id === id) ?? null;
  }
}

/** Trigger a manual repository refresh (sync). */
export async function refreshRepository(id: string): Promise<void> {
  if (isDemoMode()) return;
  try {
    await fetch(`${workspacePrefix()}/repositories/${id}/refresh/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
  } catch (err) {
    console.warn("[Archaeon] refreshRepository() failed:", err);
  }
}

// ─── Decisions ────────────────────────────────────────────────────────────────

function applyDecisionFilters(
  results: ArchitectureDecision[],
  filters?: DecisionFilters
): ArchitectureDecision[] {
  if (!filters) return results;
  if (filters.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.why.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (filters.author) results = results.filter((d) => d.author.handle === filters.author);
  if (filters.module) results = results.filter((d) => d.module.name === filters.module);
  if (filters.type) results = results.filter((d) => d.nodeType === filters.type);
  if (filters.status) results = results.filter((d) => d.status === filters.status);
  if (filters.tag) results = results.filter((d) => d.tags.includes(filters.tag!));
  return results;
}

export async function getDecisions(
  repoId: string,
  filters?: DecisionFilters
): Promise<Decision[]> {
  if (isDemoMode()) {
    return applyDecisionFilters(mockDecisions.filter((d) => d.repositoryId === repoId), filters);
  }
  if (!API_BASE_URL) {
    return applyDecisionFilters(mockDecisions.filter((d) => d.repositoryId === repoId), filters);
  }

  try {
    // Backend filters by repository via query param or module; we get all and filter client-side
    const res = await fetch(`${workspacePrefix()}/decisions/`, {
      headers: authHeaders(),
      next: { revalidate: 30 },
    });
    const data = await parseResponse<Paginated<BackendDecision>>(res, "/decisions/");
    const adapted = data.results
      .filter((d) => d.repository === repoId)
      .map(adaptDecision);
    return applyDecisionFilters(adapted, filters);
  } catch (err) {
    console.warn("[Archaeon] getDecisions() failed, using mock:", err);
    return applyDecisionFilters(mockDecisions.filter((d) => d.repositoryId === repoId), filters);
  }
}

export async function getAllDecisions(
  filters?: DecisionFilters
): Promise<ArchitectureDecision[]> {
  if (isDemoMode()) return applyDecisionFilters([...mockDecisions], filters);
  if (!API_BASE_URL) return applyDecisionFilters([...mockDecisions], filters);

  try {
    const res = await fetch(`${workspacePrefix()}/decisions/`, {
      headers: authHeaders(),
      next: { revalidate: 30 },
    });
    const data = await parseResponse<Paginated<BackendDecision>>(res, "/decisions/");
    return applyDecisionFilters(data.results.map(adaptDecision), filters);
  } catch (err) {
    console.warn("[Archaeon] getAllDecisions() failed, using mock:", err);
    return applyDecisionFilters([...mockDecisions], filters);
  }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export async function getTimeline(repoId?: string): Promise<TimelineEvent[]> {
  const fallback = () => {
    const events = repoId
      ? mockTimeline.filter((e) => e.repositoryId === repoId || e.repositoryId === "all")
      : mockTimeline;
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (isDemoMode()) return fallback();
  if (!API_BASE_URL) return fallback();

  try {
    // Backend returns DecisionHistory list via /decisions/timeline/
    const res = await fetch(`${workspacePrefix()}/decisions/timeline/`, {
      headers: authHeaders(),
      next: { revalidate: 30 },
    });
    // Timeline returns PaginatedDecisionHistoryList — adapt to TimelineEvent
    type BackendHistoryItem = { id: string; action_type: string; description: string; timestamp: string };
    const data = await parseResponse<{ results: BackendHistoryItem[] }>(res, "/decisions/timeline/");
    const events: TimelineEvent[] = data.results.map((h, i) => ({
      id: h.id,
      repositoryId: repoId ?? "all",
      date: h.timestamp,
      year: new Date(h.timestamp).getFullYear(),
      title: h.action_type.replace(/_/g, " "),
      description: h.description,
      type: "decision" as const,
      tags: [],
    }));
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (err) {
    console.warn("[Archaeon] getTimeline() failed, using mock:", err);
    return fallback();
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  if (isDemoMode()) return mockDashboardStats;
  if (!API_BASE_URL) return mockDashboardStats;

  try {
    const res = await fetch(`${workspacePrefix()}/analytics/summary/`, {
      headers: authHeaders(),
      next: { revalidate: 30 },
    });
    type BackendSummary = {
      total_decisions: number;
      status_distribution: { active: number; superseded: number; deprecated: number };
      total_constraints: number;
      total_alternatives: number;
      total_incidents_mitigated: number;
    };
    const raw = await parseResponse<BackendSummary>(res, "/analytics/summary/");
    return {
      totalRepositories: 0, // no endpoint — would need GET /repositories/ count
      totalDecisions: raw.total_decisions,
      totalADRs: 0,
      totalFilesIndexed: 0,
      recentActivity: [],
    };
  } catch (err) {
    console.warn("[Archaeon] getDashboardStats() failed, using mock:", err);
    return mockDashboardStats;
  }
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function getJobStatus(jobId: string): Promise<RepositoryJob | null> {
  if (isDemoMode()) return mockRepositoryJobs.find((j) => j.jobId === jobId) ?? null;
  if (!API_BASE_URL) return mockRepositoryJobs.find((j) => j.jobId === jobId) ?? null;

  try {
    const res = await fetch(`${workspacePrefix()}/jobs/${jobId}/`, {
      headers: authHeaders(),
    });
    if (res.status === 404) return null;
    const raw = await parseResponse<BackendJob>(res, `/jobs/${jobId}/`);
    return adaptJob(raw);
  } catch (err) {
    console.warn("[Archaeon] getJobStatus() failed, using mock:", err);
    return mockRepositoryJobs.find((j) => j.jobId === jobId) ?? null;
  }
}

export async function getRepoJob(repoId: string): Promise<RepositoryJob | null> {
  if (isDemoMode()) return mockRepositoryJobs.find((j) => j.repositoryId === repoId) ?? null;
  if (!API_BASE_URL) return mockRepositoryJobs.find((j) => j.repositoryId === repoId) ?? null;

  try {
    // List jobs and find the latest one for this repo
    const res = await fetch(`${workspacePrefix()}/jobs/`, { headers: authHeaders() });
    const data = await parseResponse<Paginated<BackendJob>>(res, "/jobs/");
    const job = data.results.find((j) => j.repository === repoId);
    return job ? adaptJob(job) : null;
  } catch (err) {
    console.warn("[Archaeon] getRepoJob() failed, using mock:", err);
    return mockRepositoryJobs.find((j) => j.repositoryId === repoId) ?? null;
  }
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export async function getDecisionGraph(_repoId: string): Promise<GraphResponse> {
  if (isDemoMode()) return { nodes: mockGraphNodes, edges: mockGraphEdges };
  if (!API_BASE_URL) return { nodes: mockGraphNodes, edges: mockGraphEdges };

  try {
    // Backend: GET /api/workspaces/{workspace_id}/decisions/graph/
    const res = await fetch(`${workspacePrefix()}/decisions/graph/`, {
      headers: authHeaders(),
    });
    const raw = await parseResponse<GraphResponse>(res, "/decisions/graph/");
    return raw;
  } catch (err) {
    console.warn("[Archaeon] getDecisionGraph() failed, using mock:", err);
    return { nodes: mockGraphNodes, edges: mockGraphEdges };
  }
}

// ─── File Context ─────────────────────────────────────────────────────────────

export async function getFileContext(
  _repoId: string,
  filePath: string
): Promise<FileContextResponse | null> {
  if (isDemoMode()) {
    return (
      mockFileContexts.find((f) => f.filePath === filePath) ??
      mockFileContexts.find(
        (f) => filePath.includes(f.filePath.split("/").pop()!.split(".")[0])
      ) ??
      null
    );
  }
  if (!API_BASE_URL) {
    return (
      mockFileContexts.find((f) => f.filePath === filePath) ?? null
    );
  }

  // No direct backend endpoint for file context — fall back to mock
  return (
    mockFileContexts.find((f) => f.filePath === filePath) ??
    mockFileContexts.find(
      (f) => filePath.includes(f.filePath.split("/").pop()!.split(".")[0])
    ) ??
    null
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface BackendNotification {
  id: string;
  workspace: string;
  user: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export async function getNotifications(): Promise<BackendNotification[]> {
  if (isDemoMode() || !API_BASE_URL) return [];

  try {
    const res = await fetch(`${workspacePrefix()}/notifications/`, {
      headers: authHeaders(),
    });
    const data = await parseResponse<Paginated<BackendNotification>>(res, "/notifications/");
    return data.results;
  } catch {
    return [];
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  if (isDemoMode() || !API_BASE_URL) return;
  try {
    await fetch(`${workspacePrefix()}/notifications/${notificationId}/read/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
  } catch {}
}

export async function markAllNotificationsRead(): Promise<void> {
  if (isDemoMode() || !API_BASE_URL) return;
  try {
    await fetch(`${workspacePrefix()}/notifications/read-all/`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
  } catch {}
}

// ─── Internal utilities ───────────────────────────────────────────────────────
export { API_BASE_URL, authHeaders };
