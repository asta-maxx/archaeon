# INTEGRATION.md — Archaeon Team Handoff

> **Who reads this first:** Member 2 (Django / archaeon-backend) and Member 3 (repository-intelligence-service).
> **TL;DR:** Replace the body of each function in `src/lib/api.ts` with a real `fetch()` call. No other file needs to change.

---

## ⚠️  Architecture Update (Day 3) — Corrected System Diagram

The final locked architecture (**Option 2** per `PROJECT_ARCHITECTURE.md`) is a three-tier system:

```
archaeon-web  (Next.js — this repo)
      │
      │  HTTPS + JSON/JWT
      │  (every request from this frontend is authenticated via a short-lived JWT
      │   issued by Django's /auth/token/ endpoint)
      ▼
archaeon-backend  (Django + DRF + Celery)
      │
      │  HTTPS + REST  (internal API key — NOT our concern)
      │
      ▼
repository-intelligence-service  (Member 3's Node service)
```

### What this means for Member 1 (frontend)

- **This frontend (`archaeon-web`) NEVER calls the intelligence service directly.**
- **This frontend NEVER calls Cognee or Neo4j directly.**
- `src/lib/api.ts` has exactly **one** backend: `archaeon-backend` (Django).
- The internal API key between Django and the intelligence service is Member 2's concern. Member 1 only handles **JWT** (frontend ↔ Django).

### What this means for Member 2 (Django)

- Django is the single source of truth for everything the frontend displays.
- Django owns the Postgres/Cognee/Neo4j writes and is the only thing `lib/api.ts` ever points at.
- Django must expose a **public REST API** (protected by JWT) for all the functions listed in the "Proposed API Contract" section below.
- The internal intelligence-service calls happen inside Django/Celery — the frontend never sees them.

---

## 🟢 Day 4 Status — Integration Completion

### What changed in Day 4

**`src/lib/api.ts` is now fully wired to Django.**

Every function now:
1. **Checks Demo Mode** — if `isDemoMode()` returns true, returns mock data instantly
2. **Checks `API_BASE_URL`** — if empty, returns mock data (no env setup needed for local dev without Django)
3. **Makes a real `fetch()` call** to `${NEXT_PUBLIC_API_URL}/api/...` with JWT auth headers
4. **Falls back to mock data** on any network error or non-ok response, with a `console.warn`

### Demo Mode (live demo reliability net)

**`NEXT_PUBLIC_DEMO_MODE=true`** in `.env.local` forces all functions to return mock data.

Runtime toggle (dev only) via:
- The floating "Demo Mode OFF / Using API" toolbar in the bottom-right of the app
- Or programmatically: `import { enableDemoMode } from '@/lib/api'; enableDemoMode();`

**What to do during a live demo if Django goes down:**
1. Click the Demo Mode banner in the bottom-right → toggle to "Using mock"
2. App continues running with known-good data
3. No page refresh required

### Django URL convention used

All endpoints are prefixed with `/api/`. Example:
- `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Frontend calls `http://localhost:8000/api/repositories/`

**⚠️ Member 2 confirm:** Is this `/api/` prefix correct for your Django URL conf, or do you use a different prefix?

---

## Shared Type Contract

All three team members code against the types in **`src/lib/types/decision.ts`**.
Do not add fields to mock data or API responses that aren't in these types — coordinate a types update first.

### `ArchitectureDecision` naming alignment

> **⚠️  Confirm with Member 2 before integration.**

The type formerly called `Decision` is now also exported as **`ArchitectureDecision`** — this matches the name used in `PROJECT_ARCHITECTURE.md` section 4 as the locked cross-team contract type.

- `Decision` is kept as a legacy alias (`export type Decision = ArchitectureDecision`) so all existing import sites compile without changes.
- **New code written after Day 3 should use `ArchitectureDecision`.**
- Django's serializer output is the **actual** source of truth for the field list — `types/decision.ts` is the frontend's best guess until Member 2's API spec exists.

### Core types

| Type | Description |
|---|---|
| `ArchitectureDecision` | Primary domain object — a single architectural decision (locked contract) |
| `Decision` | Legacy alias for `ArchitectureDecision` — keep existing imports working |
| `Author` | `{ handle, displayName?, avatarUrl }` — structured author |
| `Alternative` | `{ name, reason }` — a considered-and-rejected option |
| `Constraint` | `{ description, category? }` — a constraint that shaped the decision |
| `Module` | `{ name, path? }` — bounded context / module |
| `Repository` | Top-level container with indexing stats |
| `TimelineEvent` | Chronological event (decision/adr/incident/constraint/milestone) |
| `DecisionFilters` | Filter bag for `getDecisions()` — all fields optional |
| `RepositoryJob` | **New (Day 3)** — shape returned by job-status endpoint |
| `JobStatus` | **New (Day 3)** — `"queued" \| "processing" \| "completed" \| "partial" \| "failed"` |

### Key field: `ArchitectureDecision.why`
This is the highest-value field. It's what the AI extraction pipeline (Member 3) produces from PRs, commits, and ADRs. It should be a full natural-language explanation of *why* the decision was made — not just *what*.

---

## Job Status States — UI Mapping

Analysis is **asynchronous** (Celery job). A newly imported repo goes through:

| `JobStatus` | Django trigger | UI state |
|---|---|---|
| `"queued"` | Job created, not yet picked up by worker | Pulsing spinner, "Queued…" badge |
| `"processing"` | Worker is calling the intelligence service | Pulsing spinner + progress bar, "Analysing repository…" banner |
| `"completed"` | All decisions extracted | Full Decision Explorer (no banner) |
| `"partial"` | Some decisions extracted, job still running | Decisions shown + amber "Partial results" banner with progress |
| `"failed"` | Celery job errored | Error state with retry option |

---

## Proposed API Contract for Django (⚠️ Open Questions — needs Member 2 confirmation)

> `lib/api.ts` calls these endpoints. **All prefixed with `/api/`.**
> Confirm the prefix is correct for your URL conf.

```typescript
// Auth (JWT)
POST /api/auth/token/             → { access: string; refresh: string }
GET  /api/auth/me/                → User

// Repositories
GET  /api/repositories/           → Repository[]
GET  /api/repositories/:id/       → Repository
GET  /api/repositories/:id/job/   → RepositoryJob | 404

// Decisions
GET  /api/decisions/?repo=:id     → ArchitectureDecision[]
GET  /api/decisions/              → ArchitectureDecision[] (all)

// Filtering params (all optional):
//   ?q=<text>           full-text search across title/summary/why/tags
//   ?author=<handle>    filter by author handle
//   ?module=<name>      filter by module name
//   ?type=<nodeType>    filter by node type
//   ?status=<status>    filter by decision status
//   ?tag=<tag>          filter by tag

// Timeline
GET  /api/timeline/?repo=:id      → TimelineEvent[]
GET  /api/timeline/               → TimelineEvent[] (all)

// Dashboard
GET  /api/dashboard/stats/        → DashboardStats

// Job status
GET  /api/jobs/:jobId/            → RepositoryJob

// Graph
GET  /api/graph/?repo=:id         → GraphResponse { nodes, edges }

// File context
GET  /api/files/context/?repo=:id&path=:path → FileContextResponse
```

### Auth note
- `lib/api.ts` stores the **access token** in memory (no localStorage, XSS risk).
- The **refresh token** should be issued as an `httpOnly` cookie by Django — not stored by the frontend.
- `login()` in `lib/api.ts` now makes a real `POST /api/auth/token/` call.

### Open questions for Member 2

1. **URL prefix**: Does Django use `/api/` prefix or root-level `/`?
2. **Graph format**: Does `GET /api/graph/?repo=:id` return `{ nodes: GraphNode[], edges: GraphEdge[] }` or Neo4j-native format? If Neo4j-native, the adapter lives in `lib/api.ts → getDecisionGraph()` — let Member 1 know the exact shape.
3. **Decision filtering**: Does Django support the `?q=`, `?author=`, etc. query params on `/api/decisions/`? If not, the frontend does client-side filtering after fetching all decisions (already implemented as fallback).
4. **`/api/auth/me/` endpoint**: Does this exist? Used by `getCurrentUser()`.

---

## `src/lib/api.ts` — Function Status (Day 4)

| Function | Status | Notes |
|---|---|---|
| `login()` | ✅ Real — `POST /api/auth/token/` | Falls back to mock in dev if network fails |
| `logout()` | ✅ Complete — clears in-memory token | No API call needed |
| `isAuthenticated()` | ✅ Complete — checks in-memory token | No API call needed |
| `getRepositories()` | ✅ Real — `GET /api/repositories/` | Falls back to mock |
| `getRepository(id)` | ✅ Real — `GET /api/repositories/:id/` | Falls back to mock |
| `getDecisions(repoId)` | ✅ Real — `GET /api/decisions/?repo=:id` | Falls back to mock |
| `getAllDecisions()` | ✅ Real — `GET /api/decisions/` | Falls back to mock |
| `getTimeline(repoId?)` | ✅ Real — `GET /api/timeline/?repo=:id` | Falls back to mock |
| `getDashboardStats()` | ✅ Real — `GET /api/dashboard/stats/` | Falls back to mock |
| `getCurrentUser()` | ✅ Real — `GET /api/auth/me/` | Falls back to mock |
| `getJobStatus(jobId)` | ✅ Real — `GET /api/jobs/:jobId/` | Falls back to mock |
| `getRepoJob(repoId)` | ✅ Real — `GET /api/repositories/:id/job/` | Falls back to mock |
| `getDecisionGraph(repoId)` | ✅ Real — `GET /api/graph/?repo=:id` | Falls back to mock |
| `getFileContext(repoId, path)` | ✅ Real — `GET /api/files/context/?repo=:id&path=:path` | Falls back to mock |
| `isDemoMode()` | ✅ New (Day 4) | Read `NEXT_PUBLIC_DEMO_MODE` env var |
| `enableDemoMode()` | ✅ New (Day 4) | Runtime toggle for live demo safety |
| `disableDemoMode()` | ✅ New (Day 4) | Runtime toggle to restore real calls |

---

## Expected API Response Shapes

Responses from the real backend must conform to the TypeScript types in `src/lib/types/decision.ts`.

### `ArchitectureDecision`
```json
{
  "id": "dec-uuid",
  "repositoryId": "repo-uuid",
  "title": "Short headline",
  "summary": "One sentence",
  "why": "Full explanation of the reasoning...",
  "status": "active",
  "author": { "handle": "sarah.k", "avatarUrl": "https://..." },
  "date": "2022-01-18T00:00:00Z",
  "files": ["src/services/payment.service.ts"],
  "module": { "name": "Payment Processing" },
  "alternatives": [{ "name": "Kafka", "reason": "Too complex" }],
  "constraints": [{ "description": "UI requires sync", "category": "technical" }],
  "relatedPRs": [142, 187],
  "confidence": 0.97,
  "nodeType": "decision",
  "tags": ["architecture", "kafka"]
}
```

### `RepositoryJob`
```json
{
  "jobId": "celery-task-uuid",
  "repositoryId": "repo-uuid",
  "status": "partial",
  "startedAt": "2024-01-16T08:00:00Z",
  "progress": 61,
  "message": "Partial extraction complete — processing remaining ADRs…",
  "decisionsExtracted": 4
}
```

### `GraphResponse`
```typescript
interface GraphResponse {
  nodes: GraphNode[];   // { id, type, label, metadata? }
  edges: GraphEdge[];   // { id, source, target, label }
}
```

> ⚠️ **Open question for Member 2:** If Django proxies Neo4j's native format instead of this flat shape, the adapter lives in `lib/api.ts → getDecisionGraph()` — Member 1 needs the exact response shape to write the adapter.

### `FileContextResponse`
```json
{
  "filePath": "src/services/transaction.service.ts",
  "why": "Full explanation of why this file exists...",
  "author": { "handle": "sarah.k", "displayName": "Sarah Kim", "avatarUrl": "https://..." },
  "decision": { "id": "dec-1", "title": "Keep payment processing synchronous...", "summary": "..." },
  "constraints": [{ "description": "UI requires sync confirmation", "category": "technical" }],
  "alternatives": [{ "name": "Kafka", "reason": "Ops overhead too high" }],
  "relatedFiles": ["src/controllers/payment.controller.ts"]
}
```

---

## File Map

| File | Owner | Purpose |
|---|---|---|
| `src/lib/types/decision.ts` | Shared | Type contract — all teams |
| `src/lib/api.ts` | Frontend (M1) | **Real Django fetch calls — Day 4 complete** |
| `src/lib/mock-data.ts` | Frontend (M1) | Mock data conforming to shared types (Demo Mode fallback) |
| `.env.local` | Frontend (M1) | `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DEMO_MODE` |
| `src/components/layout/DemoModeBanner.tsx` | Frontend (M1) | **New Day 4** — Floating dev toolbar for Demo Mode toggle |
| `src/app/(app)/error.tsx` | Frontend (M1) | **New Day 4** — Route-level error boundary with contextual messages |
| `src/app/(app)/dashboard/loading.tsx` | Frontend (M1) | **New Day 4** — Loading skeleton for dashboard |
| `src/app/(app)/decisions/loading.tsx` | Frontend (M1) | **New Day 4** — Loading skeleton for decisions |
| `src/app/(app)/repositories/loading.tsx` | Frontend (M1) | **New Day 4** — Loading skeleton for repositories |
| `src/app/(app)/timeline/loading.tsx` | Frontend (M1) | **New Day 4** — Loading skeleton for timeline |
| `src/components/repositories/AnalyzingState.tsx` | Frontend (M1) | Processing/partial job UI banner |
| `src/app/(app)/decisions/page.tsx` | Frontend (M1) | Decision Explorer UI |
| `src/app/(app)/timeline/page.tsx` | Frontend (M1) | Architecture Timeline UI |
| `src/app/(app)/dashboard/page.tsx` | Frontend (M1) | Dashboard UI |
| `src/app/(app)/repositories/[id]/page.tsx` | Frontend (M1) | Repository detail (job-status aware) |
| `src/app/(app)/graph/page.tsx` | Frontend (M1) | Decision Graph page (with error state + retry) |
| `src/app/(app)/files/page.tsx` | Frontend (M1) | File Inspector page (with error state + retry) |
| `src/components/graph/DecisionGraph.tsx` | Frontend (M1) | React Flow graph wrapper |
| `src/components/graph/GraphNodes.tsx` | Frontend (M1) | 6 custom node types |
| `src/components/graph/GraphEdges.tsx` | Frontend (M1) | 5 custom edge types |
| `src/components/files/FileInspector.tsx` | Frontend (M1) | File Inspector component |

---

## Integration Checklist (Day 4 — final)

### ✅ Completed (Member 1 — frontend)
- [x] All `lib/api.ts` functions make real fetch calls to Django
- [x] All functions fall back to mock data gracefully on error
- [x] Demo Mode (`NEXT_PUBLIC_DEMO_MODE=true` or runtime toggle) tested and working
- [x] System-based light/dark mode (OS `prefers-color-scheme`, no manual toggle)
- [x] Responsive layout — phone/tablet/desktop (hamburger menu, 2-col stats on mobile)
- [x] Loading skeletons for all server-component pages (real latency is now visible)
- [x] Error boundary (`error.tsx`) with contextual messages for network/auth/generic errors
- [x] Graph page — error state with retry button if `getDecisionGraph()` fails
- [x] File Inspector page — error state with retry button if `getFileContext()` fails
- [x] `ApiError` class in `lib/api.ts` for structured error propagation

### ⬜ Pending (needs Member 2 — Django)
- [ ] Confirm `/api/` URL prefix is correct
- [ ] Confirm `GET /api/graph/?repo=:id` returns flat `{ nodes, edges }` shape (not Neo4j-native)
- [ ] Confirm `GET /api/auth/me/` endpoint exists for `getCurrentUser()`
- [ ] Confirm decision filtering query params (`?q=`, `?author=`, `?module=`, `?type=`, `?status=`, `?tag=`)
- [ ] Confirm `ArchitectureDecision` field names match Django's serializer output exactly
- [ ] Set `NEXT_PUBLIC_API_URL` in `.env.local` pointing at the real Django instance
- [ ] Test `login()` against real `POST /api/auth/token/` endpoint
- [ ] Verify `getJobStatus()` / `getRepoJob()` against real Django endpoints

### ⬜ Pending (needs Member 3 — intelligence service)
- [ ] Confirm `RepositoryJob.status` updates flow through Django to the frontend
- [ ] Confirm `ArchitectureDecision.why` field is populated by the extraction pipeline

---

## How to connect to the real backend

1. Copy `.env.local.example` (or edit `.env.local`) and set:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_DEMO_MODE=false
   ```
2. Start Django: `python manage.py runserver`
3. Start Next.js: `npm run dev`
4. Open `http://localhost:3000/dashboard` — real data should flow

If the Django backend isn't available during a demo:
1. Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` and restart, OR
2. Click the "Demo Mode OFF" banner in the bottom-right → toggle to "Using mock"
