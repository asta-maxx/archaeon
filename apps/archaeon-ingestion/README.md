# Archaeon Repository Intelligence Service

**Archaeon Repository Intelligence Service** is a dedicated, scalable microservice inside the Archaeon architecture. It is responsible for asynchronously fetching code from GitHub, extracting deep architectural decisions (ADRs) using Large Language Models (LLMs), determining the confidence score of these decisions, and returning them in a strictly structured format. 

This service **only** talks to the internal Django backend, GitHub API, and OpenAI API. It possesses zero persistent storage (no DB) and relies entirely on stateless operations over a temporary local filesystem workspace per job.

---

## 🏗️ Architecture & Complete Flow

### The Data Flow

1. **Trigger Phase:** 
   The service receives an HTTP `POST` request from the Django backend. This arrives either via a manual sync (`/internal/v1/analyze`) or a forwarded GitHub webhook (`/internal/v1/webhook`).
2. **Workspace Setup:** 
   A unique, isolated directory is created on disk for the job (`/tmp/archaeon-workspace/<jobId>`).
3. **Repository Fetching (Phase 2):** 
   Using a short-lived GitHub App Installation Token, it fetches Branches, Commits, PRs, and the Git file tree (filtering out unneeded files to save memory/API usage).
4. **Normalization (Phase 3):** 
   The raw GitHub JSON blobs are parsed into strict, internal formats (`NormalizedCommit`, `NormalizedPullRequest`, `NormalizedFile`).
5. **AI Extraction (Phase 4):** 
   The Normalized components are passed into OpenAI (using structured outputs). The LLM extracts any perceived architectural decisions (ADRs).
6. **Validation & Quality Scoring (Phase 5):** 
   Extracted candidates are run through a deterministic `ConfidenceScoringService` and `DuplicateDetectionService` to ensure high quality and prevent redundancy. The decisions are assigned a confidence of `low`, `medium`, or `high`.
7. **Teardown & Response:** 
   The ephemeral job workspace is destroyed (even if the pipeline failed), metrics are gathered (duration, token usage), and the final validated architectural decisions are returned to Django.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v20+)
- pnpm (v9+)
- Docker (optional, for deployment)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and populate it with the following required variables:

```env
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# Security
INTERNAL_API_KEY=your_secure_internal_key_here

# External Services
OPENAI_API_KEY=sk-your-openai-api-key
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

# Thresholds & Limits
WEBHOOK_LARGE_DIFF_THRESHOLD=50  # Number of changed files before switching a push to full-repo scan
MAX_CONCURRENT_JOBS=5            # Maximum concurrent analyses allowed before responding with HTTP 429
GITHUB_TIMEOUT_MS=10000          # Timeout for Octokit requests
```

### 3. Running the Service
```bash
# Start in development mode (with auto-reload)
pnpm run start:dev

# Build for production
pnpm run build

# Start in production mode
pnpm run start:prod
```

---

## 🛠️ Internal API Endpoints

This service uses an API key guard. Every request must include the `X-Internal-Api-Key` header matching your environment variable.

### 1. Analyze Endpoint (Full or Partial Sync)
`POST /internal/v1/analyze`

Used to force an analysis on a repository. You can optionally scope this to specific files or since a specific date to speed it up.

**Request Body:**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "repository": {
    "owner": "octocat",
    "name": "Hello-World",
    "ref": "main",
    "installationId": 123456
  },
  "scope": {
    "since": "2023-10-01T00:00:00Z",
    "paths": ["src/core/auth.ts"] 
  }
}
```

### 2. Webhook Endpoint (Forwarded GitHub Events)
`POST /internal/v1/webhook`

Used to forward raw GitHub webhooks directly from Django. The service automatically calculates the appropriate scope based on the event (e.g. `push` or `pull_request`) and routes it into the pipeline.

**Required Headers:**
- `X-GitHub-Event`: Must contain the event type (e.g. `push`, `pull_request`)

**Request Body:**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "githubEvent": {
    // ... RAW GITHUB PAYLOAD ...
  }
}
```

### Response Format (Both Endpoints)
Both endpoints return the standard `PipelineResult` synchronously (unless the API is overloaded, returning `429 Too Many Requests`):

```json
{
  "status": "success",
  "decisions": [
    {
      "id": "uuid-v4",
      "title": "Migrate to Next.js App Router",
      "description": "...",
      "rationale": "...",
      "alternatives": ["React SPA", "Remix"],
      "sourceRefs": ["https://github.com/octocat/Hello-World/commit/abc"],
      "extractedAt": "2023-10-15T12:00:00Z",
      "confidence": "high",
      "confidenceScore": 92
    }
  ],
  "metrics": {
    "durationMs": 12500,
    "tokensUsed": 4500,
    "decisionsExtracted": 1
  }
}
```

---

## 🧪 Testing

The service has extensive Unit and End-to-End (E2E) testing to ensure pipeline reliability without performing actual live network mutations in CI.

```bash
# Run Unit Tests
pnpm run test

# Run E2E Tests (spins up NestJS container in memory)
pnpm run test:e2e

# Check code formatting and linting
pnpm run lint
```

## 📈 Operational Runbook
If you encounter `429 Too Many Requests` from GitHub, or `500` status codes originating from OpenAI API timeouts, check `docs/runbook.md` for mitigation strategies, caching configurations, and detailed debugging instructions.
