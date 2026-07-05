# PROJECT ARCHITECTURE

**Service:** `repository-intelligence-service`
**Status:** Permanent — reflects the locked "Archaeon — Final Architecture (Option 2)" diagram. Changes here mean the diagram itself changed.

---

## 1. Position in the Overall System

```
archaeon-web (Next.js)
        │  HTTPS + JSON/JWT
        ▼
archaeon-backend (Django + DRF + Celery)
        │  HTTPS + REST (Internal API Key)
        ▼
repository-intelligence-service  ◄── YOU ARE HERE
        │
        ├── HTTPS → GitHub (GitHub App Token)
        └── HTTPS → OpenAI (OpenAI API Key)
```

Django calls this service two ways:
- **Synchronous-ish REST call** from a Celery job (Repository Processing Job) when a repo is imported
- **Forwarded webhook payload** from a Celery job (Webhook Processing Job) when GitHub events arrive

This service never talks to Postgres, Redis, or Neo4j directly. It never talks to the frontend directly. It has exactly two upstream integrations (GitHub, OpenAI) and exactly one caller (Django).

---

## 2. Internal Module Map

This mirrors the green "REPOSITORY INTELLIGENCE SERVICE" box in the architecture diagram.

```
src/modules/
│
├── github-client/        # App Installation, Token Handling, Rate Limit Mgmt, API Client
├── repository-fetcher/   # Commits, Pull Requests, Files, Branches
├── normalizer/           # Commits Parser, PR Parser, ADR Parser, File Parser
├── ai-extraction/        # Prompt Library, OpenAI Client, Structured Output, Schema Validation
├── validation/           # Confidence Scoring, Duplicate Detection, Quality Filters, Retry Logic
├── pipeline/             # Orchestrate Flow, Error Handling, Metrics, Logging
├── webhook-processor/    # GitHub Events, Normalize, Extract, Return Decisions
├── api/                  # Public REST layer Django integrates against
│
├── health/
├── workspace/             # ephemeral per-job clone/scratch directory lifecycle
├── common/                # shared exceptions, guards, interceptors, pino config
├── config/
└── shared/                # cross-module types (ArchitectureDecision, Metrics, JobContext)
```

### Module responsibilities

**github-client**
Handles GitHub App installation auth, token exchange/refresh, rate-limit-aware request wrapping, and the raw API client used by everything downstream. Nothing else in the service talks to GitHub directly.

**repository-fetcher**
Uses `github-client` (and `simple-git` for clone-based access where API access isn't sufficient) to pull commits, PRs, files, and branches for a given repo + ref into the ephemeral workspace.

**normalizer**
Converts raw GitHub/git data into a consistent internal schema: `NormalizedCommit`, `NormalizedPullRequest`, `NormalizedFile`, `NormalizedAdrCandidate`. This is the boundary between "GitHub's shape" and "our shape" — nothing downstream should know GitHub's raw payload structure.

**ai-extraction**
Owns prompt templates (Prompt Library), the LangChain.js/OpenAI client wrapper, and structured-output parsing with schema validation (via `class-validator` + JSON schema on the LLM response). Produces *candidate* `ArchitectureDecision` objects — not yet validated for quality.

**validation**
Takes candidate decisions and applies confidence scoring, duplicate detection (against other decisions in the same batch), quality filters (reject low-signal extractions), and retry logic (re-prompt on schema validation failure, bounded retries).

**pipeline**
The orchestrator. Chains `repository-fetcher → normalizer → ai-extraction → validation` for a single job, owns error handling (what happens if GitHub rate-limits mid-job, what happens if OpenAI times out), metrics collection, and structured logging per job. This is the only module allowed to call the others in sequence — no module calls another module "sideways."

**webhook-processor**
Entry point for GitHub event payloads (push, PR opened/merged, etc.). Normalizes the webhook body, decides what subset of the pipeline to run (e.g. a single-commit incremental extraction vs a full repo pass), invokes `pipeline`, and returns/forwards decisions.

**api**
The only module Django talks to. Thin controllers exposing the endpoints below, guarded by the internal API key, delegating immediately into `pipeline` or `webhook-processor`.

---

## 3. Data Flow (End-to-End)

```
Import Repository
      │
      ▼
   Queue Job            ← Django/Celery enqueues, calls this service
      │
      ▼
 Fetch & Normalize       ← github-client + repository-fetcher + normalizer
      │
      ▼
 AI Extract & Validate   ← ai-extraction + validation
      │
      ▼
 Return Decisions        ← pipeline returns ArchitectureDecision[] + Metrics + Logs to Django
      │
      ▼
 Store in Memory          ← Django writes to Postgres / Cognee / Neo4j (NOT this service)
      │
      ▼
 Query & Visualize         ← Django APIs → frontend (NOT this service)
```

This service is responsible for exactly the middle three steps. Everything before "Queue Job" and after "Return Decisions" belongs to Django.

---

## 4. Request/Response Contract

### Input (from Django, synchronous job trigger)
```
POST /internal/v1/analyze
Headers: X-Internal-Api-Key
Body: {
  jobId: string,
  repository: { owner, name, ref, installationId },
  scope?: { since?: string, paths?: string[] }   // optional incremental scope
}
```

### Input (from Django, webhook forward)
```
POST /internal/v1/webhook
Headers: X-Internal-Api-Key
Body: { jobId, githubEvent: <raw GitHub webhook payload>, installationId }
```

### Output (both paths, same shape)
```
{
  jobId: string,
  status: "completed" | "partial" | "failed",
  decisions: ArchitectureDecision[],
  metrics: {
    durationMs: number,
    tokensUsed: number,
    retries: number,
    decisionsExtracted: number,
    confidenceDistribution: { low: number, medium: number, high: number }
  },
  logs: LogEntry[]   // summarized job-level log, not full debug trace
}
```

`ArchitectureDecision` and related types live in `shared/` and are the one contract that must never break without a version bump — Django depends on this shape directly.

### Job context ownership (resolves the Member 2 / Member 3 contract gap)

Django's own plan (`archaeon-backend`, Phase 5) proposed sending `Workspace`, `Project`, and `User` on every call to this service. That's rejected — this service stays stateless and doesn't need to know what a workspace is. Instead:

- **Django owns the mapping.** When a Celery job is dispatched (Repository Processing Job or Webhook Processing Job), Django generates the `jobId` and stores `{ jobId → workspaceId, projectId, userId }` on its own side (Postgres row or Redis key, Django's choice — this is exactly what Member 2's Phase 6 Celery layer and Phase 12 caching already cover).
- **This service only ever sees `jobId` + repo coordinates.** It never receives and never returns workspace/project/user data.
- **Django re-associates the result using `jobId`** when `PipelineResult` comes back, looking up its own stored mapping.

This keeps the contract in section 4 above exactly as specified — no workspace/project/user fields added to `AnalyzeRequestDto` or `WebhookRequestDto`, ever.

---

## 5. Dependency Graph (build order within the pipeline)

```
github-client
     │
     ▼
repository-fetcher
     │
     ▼
normalizer
     │
     ▼
ai-extraction
     │
     ▼
validation
     │
     ▼
pipeline  (composes all of the above)
     │
     ├──► api (sync entry point)
     └──► webhook-processor (event entry point)
```

`health`, `workspace`, `common`, `config`, `shared` are cross-cutting and available to every module from Phase 1 onward.

---

## 6. Communication Protocols

| Link | Protocol |
|---|---|
| Django Backend ↔ Intelligence Service | HTTPS + REST, authenticated with Internal API Key |
| Intelligence Service ↔ GitHub | HTTPS, GitHub App Token |
| Intelligence Service ↔ OpenAI | HTTPS, OpenAI API Key |

No other external communication exists from this service.

---

## 7. Key Design Decisions & Rationale

- **Stateless by design.** This service holds no DB. This was chosen so it can be scaled horizontally without coordination, and so Django remains the single source of truth — avoids dual-write/consistency problems.
- **Vector store abstracted, not committed yet.** If/when semantic search or embeddings-based dedup is needed inside `validation` or `ai-extraction`, it goes behind a `VectorStore` interface (FAISS or ChromaDB implementation swappable) rather than hardcoding a client.
- **Pipeline as the only orchestrator.** Prevents modules from developing hidden cross-dependencies; every module is independently testable because its only caller is `pipeline`.
- **Sync API + webhook path share the same pipeline.** Avoids duplicating extraction logic between the "initial import" flow and the "incremental webhook" flow — the webhook path just computes a smaller `scope` before calling the same pipeline.
- **Ephemeral workspace only.** Clones/scratch files live in a per-job temp directory (`workspace` module), deleted on job completion regardless of success/failure, enforced via a `finally` cleanup — never relies on the caller to clean up.

---

## 8. Integration Contract — Reconciled with archaeon-backend (Member 2)

Member 2's plan (`archaeon-backend` Phase 5, "Communication Layer") independently proposed a single `POST /internal/repository/process` endpoint with a `Webhook Type` discriminator field and a payload carrying `Workspace`/`Project`/`User`/`Repository`. That doesn't match this document's contract, so here's the resolution — **this is the version both repos build against.**

**Decision: two endpoints, not one.** `analyze` and `webhook` stay separate on this service's side because their internal pipelines genuinely differ (full pipeline vs. scoped incremental pipeline via `webhook-processor`). Django's Celery layer should call the matching endpoint directly instead of routing through one endpoint with a type field:

| Django trigger | Calls |
|---|---|
| Repository Processing Job (new import) | `POST /internal/v1/analyze` |
| Webhook Processing Job (GitHub event forwarded) | `POST /internal/v1/webhook` |

**Decision: payload stays minimal.** Neither endpoint accepts `Workspace`, `Project`, or `User`. Both accept only `jobId` + repo coordinates (+ optional `scope` on `analyze`, + raw `githubEvent` on `webhook`) as defined in section 4. See "Job context ownership" above for how Django re-associates results without this service needing to know about workspaces.

**What this means for Member 2's Phase 5 and Phase 6:**
- Phase 5's "Internal API" work becomes: a typed client in Django that calls *two* endpoints (`/internal/v1/analyze`, `/internal/v1/webhook`) instead of one, each with the internal API key header — same auth approach Member 2 already planned, just two call sites instead of one.
- Phase 6's Repository Job and Webhook Job should each generate a `jobId`, persist `{ jobId → workspaceId, projectId, userId }` before calling out, then call the matching endpoint. On response, look up that mapping by `jobId` to know where to store the `ArchitectureDecision[]` in Phase 7's persistence layer.
- No other changes needed — Member 2's retry/timeout/logging plan for the communication layer applies unchanged to both endpoints.
