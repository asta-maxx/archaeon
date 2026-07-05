/**
 * auth-store.ts — Client-side auth & workspace context store
 *
 * Holds in-memory JWT access token + the active workspace_id.
 * All workspace-scoped API calls need the workspace_id from here.
 */

export interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
}

export interface CurrentUserInfo {
  id: string;
  name: string;
  email: string;
  github_username: string | null;
  avatar_url: string | null;
  is_staff: boolean;
  memberships: Array<{
    id: string;
    role: string;
    workspace: WorkspaceInfo;
  }>;
}

// ─── In-memory state ─────────────────────────────────────────────────────────

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _activeWorkspaceId: string | null = null;
let _currentUser: CurrentUserInfo | null = null;

// ─── Token management ─────────────────────────────────────────────────────────

export function setTokens(access: string, refresh: string): void {
  _accessToken = access;
  _refreshToken = refresh;
  // Persist refresh token in sessionStorage (not localStorage to limit XSS exposure)
  if (typeof window !== "undefined") {
    sessionStorage.setItem("archaeon_refresh", refresh);
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function getRefreshToken(): string | null {
  if (_refreshToken) return _refreshToken;
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("archaeon_refresh");
  }
  return null;
}

export function clearTokens(): void {
  _accessToken = null;
  _refreshToken = null;
  _activeWorkspaceId = null;
  _currentUser = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("archaeon_refresh");
    sessionStorage.removeItem("archaeon_workspace_id");
  }
}

export function isAuthenticated(): boolean {
  return _accessToken !== null;
}

// ─── Workspace management ──────────────────────────────────────────────────────

export function setActiveWorkspace(workspaceId: string): void {
  _activeWorkspaceId = workspaceId;
  if (typeof window !== "undefined") {
    sessionStorage.setItem("archaeon_workspace_id", workspaceId);
  }
}

export function getActiveWorkspaceId(): string | null {
  if (_activeWorkspaceId) return _activeWorkspaceId;
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("archaeon_workspace_id");
  }
  return null;
}

// ─── User management ──────────────────────────────────────────────────────────

export function setCurrentUser(user: CurrentUserInfo): void {
  _currentUser = user;
  // Auto-select first workspace if none set
  if (!_activeWorkspaceId && user.memberships.length > 0) {
    setActiveWorkspace(user.memberships[0].workspace.id);
  }
}

export function getCurrentUserInfo(): CurrentUserInfo | null {
  return _currentUser;
}

// ─── Auth headers helper ──────────────────────────────────────────────────────

export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }
  return headers;
}
