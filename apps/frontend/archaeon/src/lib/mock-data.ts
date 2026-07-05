import type {
  Repository,
  Decision,
  DashboardStats,
  ActivityItem,
  User,
  GraphNode,
  GraphEdge,
  TimelineEvent,
  RepositoryJob,
} from "./types/decision";

// ─── Mock User ────────────────────────────────────────────────────────────────
export const mockUser: User = {
  id: "u1",
  name: "Alex Chen",
  email: "alex@yourcompany.io",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
  githubHandle: "alexc",
  plan: "pro",
};

// ─── Mock Repositories ────────────────────────────────────────────────────────
export const mockRepositories: Repository[] = [
  {
    id: "repo-1",
    name: "payment-service",
    fullName: "acme-corp/payment-service",
    description: "Core payment processing service handling all transaction flows, idempotency, and reconciliation.",
    language: "TypeScript",
    stars: 342,
    lastIndexed: "2024-01-15T10:30:00Z",
    indexingStatus: "indexed",
    decisionCount: 47,
    filesIndexed: 183,
    prCount: 412,
    adrCount: 12,
    commitCount: 2847,
    branch: "main",
    owner: "acme-corp",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=PS",
    topics: ["payments", "typescript", "nestjs", "idempotency"],
    createdAt: "2021-03-12T00:00:00Z",
    firstCommit: "2021-03-12T00:00:00Z",
  },
  {
    id: "repo-2",
    name: "api-gateway",
    fullName: "acme-corp/api-gateway",
    description: "Unified API gateway with rate limiting, auth delegation, and request routing across all microservices.",
    language: "Go",
    stars: 189,
    lastIndexed: "2024-01-14T18:00:00Z",
    indexingStatus: "indexed",
    decisionCount: 31,
    filesIndexed: 94,
    prCount: 278,
    adrCount: 8,
    commitCount: 1623,
    branch: "main",
    owner: "acme-corp",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=AG",
    topics: ["api-gateway", "go", "microservices", "rate-limiting"],
    createdAt: "2021-06-01T00:00:00Z",
    firstCommit: "2021-06-01T00:00:00Z",
  },
  {
    id: "repo-3",
    name: "notification-worker",
    fullName: "acme-corp/notification-worker",
    description: "Async notification pipeline (email, SMS, push). Handles fan-out, retry logic, and delivery guarantees.",
    language: "Python",
    stars: 78,
    lastIndexed: "2024-01-13T09:15:00Z",
    indexingStatus: "indexing",
    decisionCount: 19,
    filesIndexed: 61,
    prCount: 145,
    adrCount: 5,
    commitCount: 892,
    branch: "main",
    owner: "acme-corp",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=NW",
    topics: ["notifications", "python", "celery", "redis"],
    createdAt: "2022-01-20T00:00:00Z",
    firstCommit: "2022-01-20T00:00:00Z",
  },
  {
    id: "repo-4",
    name: "user-identity",
    fullName: "acme-corp/user-identity",
    description: "User authentication, session management, and identity federation. Integrates with Okta and internal SSO.",
    language: "TypeScript",
    stars: 234,
    lastIndexed: "2024-01-12T14:45:00Z",
    indexingStatus: "indexed",
    decisionCount: 38,
    filesIndexed: 127,
    prCount: 321,
    adrCount: 10,
    commitCount: 2104,
    branch: "main",
    owner: "acme-corp",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=UI",
    topics: ["auth", "typescript", "okta", "sso", "jwt"],
    createdAt: "2021-04-05T00:00:00Z",
    firstCommit: "2021-04-05T00:00:00Z",
  },
  {
    id: "repo-5",
    name: "data-pipeline",
    fullName: "acme-corp/data-pipeline",
    description: "ETL pipeline for analytics data warehouse. Streams from Kafka, transforms, and loads to BigQuery.",
    language: "Python",
    stars: 55,
    lastIndexed: "2024-01-10T08:00:00Z",
    indexingStatus: "pending",
    decisionCount: 0,
    filesIndexed: 0,
    prCount: 0,
    adrCount: 3,
    commitCount: 567,
    branch: "main",
    owner: "acme-corp",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=DP",
    topics: ["etl", "python", "kafka", "bigquery", "analytics"],
    createdAt: "2022-09-01T00:00:00Z",
    firstCommit: "2022-09-01T00:00:00Z",
  },
  // ── Day 3 demo repos: async job states ──────────────────────────────────
  // repo-7: currently being processed by the Celery job (no decisions yet)
  {
    id: "repo-7",
    name: "ml-serving-platform",
    fullName: "acme-corp/ml-serving-platform",
    description:
      "Model serving infrastructure — versioning, A/B routing, canary deployments, and observability for ML models in production.",
    language: "Python",
    stars: 94,
    lastIndexed: "2024-01-16T08:00:00Z",
    indexingStatus: "indexing",
    decisionCount: 0,
    filesIndexed: 0,
    prCount: 0,
    adrCount: 0,
    commitCount: 1287,
    branch: "main",
    owner: "acme-corp",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=ML",
    topics: ["ml", "python", "fastapi", "mlflow", "kubernetes"],
    createdAt: "2023-02-10T00:00:00Z",
    firstCommit: "2023-02-10T00:00:00Z",
  },
  // repo-8: job returned partial results — some decisions extracted, still running
  {
    id: "repo-8",
    name: "observability-stack",
    fullName: "acme-corp/observability-stack",
    description:
      "Centralized observability platform — metrics, tracing, and log aggregation across the entire microservice fleet.",
    language: "Go",
    stars: 67,
    lastIndexed: "2024-01-16T11:30:00Z",
    indexingStatus: "indexing",
    decisionCount: 4, // partial: 4 of estimated 20+ extracted so far
    filesIndexed: 31,
    prCount: 0,
    adrCount: 0,
    commitCount: 743,
    branch: "main",
    owner: "acme-corp",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=OB",
    topics: ["observability", "go", "prometheus", "grafana", "opentelemetry"],
    createdAt: "2023-07-01T00:00:00Z",
    firstCommit: "2023-07-01T00:00:00Z",
  },
  {
    id: "repo-6",
    name: "search-service",
    fullName: "acme-corp/search-service",
    description: "Full-text and semantic search across product catalog and user content. Powered by Elasticsearch + vector embeddings.",
    language: "Java",
    stars: 112,
    lastIndexed: "2024-01-11T16:20:00Z",
    indexingStatus: "error",
    decisionCount: 22,
    filesIndexed: 88,
    prCount: 198,
    adrCount: 6,
    commitCount: 1341,
    branch: "main",
    owner: "acme-corp",
    avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=SS",
    topics: ["search", "java", "elasticsearch", "semantic-search"],
    createdAt: "2022-03-15T00:00:00Z",
    firstCommit: "2022-03-15T00:00:00Z",
  },
];

// ─── Mock Decisions (structured types) ───────────────────────────────────────
export const mockDecisions: Decision[] = [
  {
    id: "dec-1",
    repositoryId: "repo-1",
    title: "Keep payment processing synchronous — Kafka rejected",
    summary: "Evaluated Kafka for async payment events but rejected due to operational overhead at team size of 4.",
    why: "In January 2022, the team evaluated Kafka for payment event streaming. The primary driver was throughput at scale, but at the team's then-size of 4 engineers, the ops burden of running Kafka outweighed the benefits. The service was processing <500 TPS and HTTP synchronous responses were required for the payment UI anyway. Revisited in March 2023 and kept — by then the team was 9 engineers but throughput hadn't reached the threshold where the complexity tradeoff changed.",
    status: "active",
    author: { handle: "sarah.k", displayName: "Sarah Kim", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
    date: "2022-01-18T00:00:00Z",
    files: ["src/services/transaction.service.ts", "src/controllers/payment.controller.ts"],
    module: { name: "Payment Processing", path: "src/services" },
    alternatives: [
      { name: "Apache Kafka", reason: "Ops overhead too high for team size of 4" },
      { name: "RabbitMQ", reason: "Same concerns, less ecosystem support" },
      { name: "AWS SQS", reason: "Lock-in risk, latency for sync response pattern" },
    ],
    constraints: [
      { description: "UI requires synchronous payment confirmation", category: "technical" },
      { description: "Team size < 6 engineers at time of decision", category: "operational" },
      { description: "No dedicated DevOps at the time", category: "operational" },
    ],
    relatedPRs: [142, 143, 187],
    confidence: 0.97,
    nodeType: "decision",
    tags: ["architecture", "async", "kafka", "synchronous"],
  },
  {
    id: "dec-2",
    repositoryId: "repo-1",
    title: "Idempotency key pattern locked after production incident",
    summary: "Idempotency implementation was locked to a composite key strategy after a production double-charge incident on 2022-08-14.",
    why: "Three separate PRs in 2021 tried different idempotency implementations. After a production incident on 2022-08-14 where 0.3% of transactions were double-charged due to client retry storms with inconsistent keys, the team standardized on composite key (userId + amount + timestamp) with a 24h TTL. This invariant was explicitly documented in ADR-7.",
    status: "active",
    author: { handle: "mario.r", displayName: "Mario Rossi", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mario" },
    date: "2022-08-15T00:00:00Z",
    files: ["src/services/idempotency.service.ts", "src/middleware/idempotency.middleware.ts", "src/utils/hash.util.ts"],
    module: { name: "Idempotency", path: "src/services" },
    alternatives: [
      { name: "UUID from client", reason: "Client retry storms with inconsistent keys" },
      { name: "Request body hash", reason: "Fails for identical retry with different metadata" },
    ],
    constraints: [
      { description: "Production incident: 0.3% double-charge rate on 2022-08-14", category: "incident" },
      { description: "Regulatory requirement: no duplicate charge ever", category: "regulatory" },
      { description: "24h TTL chosen to balance storage cost and retry window", category: "business" },
    ],
    relatedPRs: [89, 91, 95, 312],
    confidence: 0.99,
    nodeType: "incident",
    tags: ["idempotency", "incident", "payments", "adr-7"],
  },
  {
    id: "dec-3",
    repositoryId: "repo-1",
    title: "PostgreSQL over MongoDB for transaction records",
    summary: "Chose PostgreSQL for ACID guarantees on financial data rather than MongoDB's eventual consistency model.",
    why: "When the service was architected in March 2021, MongoDB was the team's default. However, financial data requires ACID transactions — particularly for multi-step payment flows where partial failure must be detectable and rollbackable. MongoDB's multi-document transactions were available but immature at v4.4. PostgreSQL's battle-tested WAL and MVCC gave the team more confidence for the data they couldn't afford to lose or corrupt.",
    status: "active",
    author: { handle: "sarah.k", displayName: "Sarah Kim", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
    date: "2021-03-20T00:00:00Z",
    files: ["src/database/database.module.ts", "src/entities/transaction.entity.ts"],
    module: { name: "Data Layer", path: "src/database" },
    alternatives: [
      { name: "MongoDB", reason: "Multi-document transactions immature at v4.4, eventual consistency risk" },
      { name: "MySQL", reason: "Team unfamiliar, less JSON support" },
    ],
    constraints: [
      { description: "ACID compliance required for financial data", category: "regulatory" },
      { description: "Multi-step payment flows require rollback capability", category: "technical" },
      { description: "Team familiarity with TypeORM", category: "operational" },
    ],
    relatedPRs: [12, 13],
    confidence: 0.95,
    nodeType: "decision",
    tags: ["database", "postgresql", "acid", "financial"],
  },
  {
    id: "dec-4",
    repositoryId: "repo-2",
    title: "Rate limiting at gateway layer, not service layer",
    summary: "Centralized rate limiting in the API gateway rather than per-service to avoid inconsistent limits across the fleet.",
    why: "Early architecture had each service implementing its own rate limiting. This led to inconsistent behavior — the payment service had a 100 req/min limit while notification had 500. In October 2021, a DDoS-like traffic spike hit the notification service, which had the loosest limits, and cascaded into payment service failures. Gateway-level rate limiting was adopted in November 2021 as ADR-3.",
    status: "active",
    author: { handle: "james.l", displayName: "James Lee", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=james" },
    date: "2021-11-05T00:00:00Z",
    files: ["middleware/rate-limit.go", "config/limits.yaml"],
    module: { name: "Rate Limiting", path: "middleware" },
    alternatives: [
      { name: "Per-service rate limiting", reason: "Inconsistent, cascade failure vector" },
      { name: "External Redis rate limiter", reason: "Deferred: would add another infra dependency" },
    ],
    constraints: [
      { description: "October 2021 cascade incident from uneven rate limits", category: "incident" },
      { description: "Must not add service-level complexity", category: "operational" },
    ],
    relatedPRs: [78, 79],
    confidence: 0.92,
    nodeType: "incident",
    tags: ["rate-limiting", "gateway", "incident", "adr-3"],
  },
  {
    id: "dec-5",
    repositoryId: "repo-4",
    title: "JWT access tokens with Redis-backed refresh tokens",
    summary: "Short-lived JWTs (15min) with server-side Redis refresh tokens to enable instant revocation without session store overhead.",
    why: "Pure stateless JWT had a critical flaw: no revocation. If an account was compromised, we couldn't invalidate tokens until they expired. After a security review in Q2 2022, the team adopted a hybrid: 15-minute JWT access tokens (stateless, fast) backed by Redis-stored refresh tokens (revocable). This allows instant revocation of compromised sessions while maintaining horizontal scalability for access token validation.",
    status: "active",
    author: { handle: "priya.s", displayName: "Priya Singh", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya" },
    date: "2022-06-10T00:00:00Z",
    files: ["src/auth/token.service.ts", "src/auth/refresh.strategy.ts"],
    module: { name: "Authentication", path: "src/auth" },
    alternatives: [
      { name: "Pure stateless JWT", reason: "No revocation capability, 24h window too long for security" },
      { name: "Session-only (Redis)", reason: "Loses horizontal scaling benefit" },
      { name: "OAuth opaque tokens", reason: "Deferred: requires more infra" },
    ],
    constraints: [
      { description: "Security audit Q2 2022 flagged revocation gap", category: "business" },
      { description: "Must support horizontal scaling (no sticky sessions)", category: "technical" },
      { description: "15-minute access token TTL is maximum per security policy", category: "regulatory" },
    ],
    relatedPRs: [201, 205],
    confidence: 0.98,
    nodeType: "decision",
    tags: ["auth", "jwt", "redis", "security", "tokens"],
  },
  {
    id: "dec-6",
    repositoryId: "repo-3",
    title: "Celery + Redis for async notification fan-out",
    summary: "Chose Celery with Redis broker over SQS for async notification fan-out to keep infra simple.",
    why: "When building the notification pipeline in early 2022, the team evaluated SQS, RabbitMQ, and Celery+Redis. At the scale of ~10k notifications/day, Celery with Redis broker provided the best developer experience with lowest ops overhead. The team already ran Redis for caching, so no new infra was added.",
    status: "active",
    author: { handle: "wei.z", displayName: "Wei Zhang", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=wei" },
    date: "2022-02-10T00:00:00Z",
    files: ["workers/notification_worker.py", "config/celery.py"],
    module: { name: "Notification Pipeline", path: "workers" },
    alternatives: [
      { name: "AWS SQS", reason: "Cloud lock-in, higher cost at low volume" },
      { name: "RabbitMQ", reason: "Ops overhead, team unfamiliar" },
    ],
    constraints: [
      { description: "Redis already in stack for caching", category: "technical" },
      { description: "Team is Python-first", category: "operational" },
    ],
    relatedPRs: [23, 24, 31],
    confidence: 0.88,
    nodeType: "decision",
    tags: ["celery", "redis", "async", "notifications", "python"],
  },
  {
    id: "dec-7",
    repositoryId: "repo-2",
    title: "Service mesh deferred — mTLS via Envoy sidecar instead",
    summary: "Full service mesh adoption deferred to H2 2024. mTLS between services via Envoy sidecar as interim measure.",
    why: "The team evaluated Istio and Linkerd for service mesh adoption in Q4 2023. Both provided strong mTLS and observability, but the operational complexity was deemed too high given current team size. The decision was made to implement Envoy sidecars for mTLS between critical services as an interim, documented in ADR-12.",
    status: "active",
    author: { handle: "james.l", displayName: "James Lee", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=james" },
    date: "2023-11-20T00:00:00Z",
    files: ["deploy/envoy/", "config/tls/"],
    module: { name: "Infrastructure", path: "deploy" },
    alternatives: [
      { name: "Istio", reason: "Operational complexity too high for current team" },
      { name: "Linkerd", reason: "Less mature ecosystem, limited support" },
    ],
    constraints: [
      { description: "Security requirement: all inter-service traffic must be encrypted", category: "regulatory" },
      { description: "Team lacks service mesh expertise", category: "operational" },
    ],
    relatedPRs: [401, 403],
    confidence: 0.85,
    nodeType: "adr",
    tags: ["service-mesh", "mtls", "envoy", "security", "adr-12"],
  },
];

// ─── Mock Timeline ────────────────────────────────────────────────────────────
export const mockTimeline: TimelineEvent[] = [
  {
    id: "tl-1",
    repositoryId: "repo-1",
    date: "2021-03-12T00:00:00Z",
    year: 2021,
    title: "payment-service repository created",
    description: "Initial commit. NestJS + TypeScript scaffolding, PostgreSQL chosen over MongoDB for ACID compliance on financial data.",
    type: "milestone",
    tags: ["postgres", "nestjs", "typescript"],
    author: "sarah.k",
  },
  {
    id: "tl-2",
    repositoryId: "repo-1",
    date: "2021-03-20T00:00:00Z",
    year: 2021,
    title: "PostgreSQL over MongoDB — decision locked",
    description: "ADR written: ACID compliance required for financial transactions. MongoDB multi-document transactions deemed too immature.",
    type: "decision",
    decisionId: "dec-3",
    tags: ["database", "postgresql", "acid"],
    author: "sarah.k",
  },
  {
    id: "tl-3",
    repositoryId: "repo-2",
    date: "2021-06-01T00:00:00Z",
    year: 2021,
    title: "api-gateway bootstrapped",
    description: "Go-based API gateway created to unify routing across the growing microservice fleet.",
    type: "milestone",
    tags: ["go", "gateway"],
    author: "james.l",
  },
  {
    id: "tl-4",
    repositoryId: "repo-2",
    date: "2021-10-15T00:00:00Z",
    year: 2021,
    title: "Cascade incident — uneven rate limits",
    description: "Traffic spike hit notification service (500 req/min limit) and cascaded into payment failures (100 req/min). Services had inconsistent per-service limits.",
    type: "incident",
    tags: ["rate-limiting", "incident", "cascade"],
    author: "james.l",
  },
  {
    id: "tl-5",
    repositoryId: "repo-2",
    date: "2021-11-05T00:00:00Z",
    year: 2021,
    title: "ADR-3: Rate limiting moved to gateway",
    description: "Gateway-level centralized rate limiting adopted. Per-service limits removed. Prevents future cascade failures from uneven enforcement.",
    type: "adr",
    decisionId: "dec-4",
    tags: ["rate-limiting", "gateway", "adr-3"],
    author: "james.l",
  },
  {
    id: "tl-6",
    repositoryId: "repo-1",
    date: "2022-01-18T00:00:00Z",
    year: 2022,
    title: "Kafka rejected — synchronous payments kept",
    description: "Kafka evaluated for async payment events. Rejected: ops overhead too high for team size of 4, and UI requires sync confirmation.",
    type: "decision",
    decisionId: "dec-1",
    tags: ["kafka", "async", "architecture"],
    author: "sarah.k",
  },
  {
    id: "tl-7",
    repositoryId: "repo-3",
    date: "2022-02-10T00:00:00Z",
    year: 2022,
    title: "Celery + Redis chosen for notification fan-out",
    description: "Notification pipeline built on Celery + Redis broker. SQS rejected for cloud lock-in; Redis already in stack.",
    type: "decision",
    decisionId: "dec-6",
    tags: ["celery", "redis", "notifications"],
    author: "wei.z",
  },
  {
    id: "tl-8",
    repositoryId: "repo-1",
    date: "2022-08-14T00:00:00Z",
    year: 2022,
    title: "Production incident — 0.3% double-charge",
    description: "Client retry storms with inconsistent idempotency keys caused 0.3% of transactions to be double-charged. 847 affected users.",
    type: "incident",
    tags: ["idempotency", "incident", "payments"],
    author: "mario.r",
  },
  {
    id: "tl-9",
    repositoryId: "repo-1",
    date: "2022-08-15T00:00:00Z",
    year: 2022,
    title: "ADR-7: Idempotency key strategy locked",
    description: "Composite key (userId + amount + timestamp) with 24h TTL standardized. Documented in ADR-7. Must not change without migration plan.",
    type: "adr",
    decisionId: "dec-2",
    tags: ["idempotency", "adr-7"],
    author: "mario.r",
  },
  {
    id: "tl-10",
    repositoryId: "repo-4",
    date: "2022-06-10T00:00:00Z",
    year: 2022,
    title: "JWT + Redis refresh token hybrid adopted",
    description: "15-min JWT access tokens + Redis-backed refresh tokens. Security audit flagged that pure stateless JWT had no revocation path.",
    type: "decision",
    decisionId: "dec-5",
    tags: ["jwt", "redis", "auth", "security"],
    author: "priya.s",
  },
  {
    id: "tl-11",
    repositoryId: "repo-2",
    date: "2023-11-20T00:00:00Z",
    year: 2023,
    title: "ADR-12: Service mesh deferred, Envoy sidecar interim",
    description: "Istio and Linkerd evaluated; both rejected for complexity. Envoy sidecar mTLS adopted as interim. Full mesh deferred to H2 2024.",
    type: "adr",
    decisionId: "dec-7",
    tags: ["service-mesh", "envoy", "adr-12", "mtls"],
    author: "james.l",
  },
  {
    id: "tl-12",
    repositoryId: "repo-1",
    date: "2024-01-15T00:00:00Z",
    year: 2024,
    title: "payment-service fully re-indexed by Archaeon",
    description: "183 files indexed. 47 architectural decisions captured. 12 ADRs linked. Cognee knowledge graph populated.",
    type: "milestone",
    tags: ["archaeon", "indexed"],
  },
];

// ─── Mock Repository Jobs (async Celery job states) ────────────────────────────────
/**
 * These mirror what Django's Celery "Repository Processing Job" would return.
 * repo-7 → processing (no decisions yet)
 * repo-8 → partial (some decisions extracted, still running)
 * All indexed repos (1–4, 6) don't have an active job (completed is implicit).
 */
export const mockRepositoryJobs: RepositoryJob[] = [
  {
    jobId: "job-7",
    repositoryId: "repo-7",
    status: "processing",
    startedAt: "2024-01-16T08:00:00Z",
    progress: 28,
    message: "Analysing commit history — extracting architectural signals from 1,287 commits…",
    decisionsExtracted: 0,
  },
  {
    jobId: "job-8",
    repositoryId: "repo-8",
    status: "partial",
    startedAt: "2024-01-16T11:30:00Z",
    progress: 61,
    message: "Partial extraction complete — processing remaining ADRs and PR descriptions…",
    decisionsExtracted: 4,
  },
];

// ─── Mock Graph Data ──────────────────────────────────────────────────────────
// Covers all 6 node types (decision, constraint, incident, adr, module, developer)
// and all 5 edge relation types (depends_on, introduced_by, supersedes, related_to, caused_by)
export const mockGraphNodes: GraphNode[] = [
  // Decisions
  {
    id: "n1", type: "decision", label: "Synchronous Payment Processing",
    metadata: { decisionId: "dec-1", status: "active", confidence: 0.97, date: "2022-01-18" },
  },
  {
    id: "n5", type: "decision", label: "Idempotency Key Strategy",
    metadata: { decisionId: "dec-2", status: "active", confidence: 0.99, date: "2022-08-15" },
  },
  {
    id: "n9", type: "decision", label: "PostgreSQL over MongoDB",
    metadata: { decisionId: "dec-3", status: "active", confidence: 0.95, date: "2021-03-20" },
  },
  {
    id: "n13", type: "decision", label: "JWT + Redis Refresh Token Hybrid",
    metadata: { decisionId: "dec-5", status: "active", confidence: 0.98, date: "2022-06-10" },
  },
  // Modules
  {
    id: "n7", type: "module", label: "Payment Processing",
    metadata: { path: "src/services", fileCount: 12 },
  },
  {
    id: "n10", type: "module", label: "Data Layer",
    metadata: { path: "src/database", fileCount: 8 },
  },
  {
    id: "n14", type: "module", label: "Authentication",
    metadata: { path: "src/auth", fileCount: 6 },
  },
  // Constraints
  {
    id: "n2", type: "constraint", label: "Team Size < 6 Engineers",
    metadata: { category: "operational" },
  },
  {
    id: "n3", type: "constraint", label: "UI Requires Sync Confirmation",
    metadata: { category: "technical" },
  },
  {
    id: "n11", type: "constraint", label: "ACID Compliance Required",
    metadata: { category: "regulatory" },
  },
  {
    id: "n15", type: "constraint", label: "15-min JWT TTL Policy",
    metadata: { category: "regulatory" },
  },
  // Developers
  {
    id: "n8", type: "developer", label: "sarah.k",
    metadata: { displayName: "Sarah Kim", decisionCount: 2, avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
  },
  {
    id: "n12", type: "developer", label: "mario.r",
    metadata: { displayName: "Mario Rossi", decisionCount: 1, avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mario" },
  },
  {
    id: "n16", type: "developer", label: "priya.s",
    metadata: { displayName: "Priya Singh", decisionCount: 1, avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya" },
  },
  // Incidents
  {
    id: "n4", type: "incident", label: "Idempotency Incident 2022-08-14",
    metadata: { severity: "high", affected: 847, date: "2022-08-14" },
  },
  {
    id: "n17", type: "incident", label: "Cascade Failure — Rate Limits",
    metadata: { severity: "medium", affected: 0, date: "2021-10-15" },
  },
  // ADRs
  {
    id: "n6", type: "adr", label: "ADR-7: Idempotency Standard",
    metadata: { adrNumber: 7, status: "active", date: "2022-08-15" },
  },
  {
    id: "n18", type: "adr", label: "ADR-3: Gateway Rate Limiting",
    metadata: { adrNumber: 3, status: "active", date: "2021-11-05" },
  },
  {
    id: "n19", type: "adr", label: "ADR-12: Service Mesh Deferred",
    metadata: { adrNumber: 12, status: "active", date: "2023-11-20" },
  },
];

export const mockGraphEdges: GraphEdge[] = [
  // depends_on — solid blue
  { id: "e1", source: "n1", target: "n7", label: "depends_on" },
  { id: "e2", source: "n9", target: "n10", label: "depends_on" },
  { id: "e3", source: "n13", target: "n14", label: "depends_on" },
  // introduced_by — dashed purple
  { id: "e4", source: "n8", target: "n1", label: "introduced_by" },
  { id: "e5", source: "n8", target: "n9", label: "introduced_by" },
  { id: "e6", source: "n12", target: "n5", label: "introduced_by" },
  { id: "e7", source: "n16", target: "n13", label: "introduced_by" },
  // caused_by — dotted red
  { id: "e8", source: "n4", target: "n5", label: "caused_by" },
  { id: "e9", source: "n17", target: "n18", label: "caused_by" },
  // supersedes — double line green
  { id: "e10", source: "n5", target: "n6", label: "supersedes" },
  // related_to — dashed gray
  { id: "e11", source: "n1", target: "n9", label: "related_to" },
  { id: "e12", source: "n2", target: "n1", label: "related_to" },
  { id: "e13", source: "n3", target: "n1", label: "related_to" },
  { id: "e14", source: "n11", target: "n9", label: "related_to" },
  { id: "e15", source: "n15", target: "n13", label: "related_to" },
  { id: "e16", source: "n19", target: "n13", label: "related_to" },
];

// ─── Mock Dashboard Stats ─────────────────────────────────────────────────────
const mockActivity: ActivityItem[] = [
  { id: "a1", type: "decision_added", description: "New architectural decision extracted: JWT refresh token strategy updated", repositoryName: "user-identity", timestamp: "2024-01-15T10:30:00Z", author: "priya.s" },
  { id: "a2", type: "repo_indexed", description: "Repository fully indexed — 183 files, 47 decisions captured", repositoryName: "payment-service", timestamp: "2024-01-15T09:12:00Z" },
  { id: "a3", type: "adr_created", description: "ADR-12 created: Service mesh adoption strategy", repositoryName: "api-gateway", timestamp: "2024-01-14T16:45:00Z", author: "james.l" },
  { id: "a4", type: "pr_analyzed", description: "PR #412 analyzed — conflicts with ADR-7 idempotency constraint flagged", repositoryName: "payment-service", timestamp: "2024-01-14T14:20:00Z", author: "mario.r" },
  { id: "a5", type: "decision_added", description: "Rate limiting architecture decision extracted from 3 historical PRs", repositoryName: "api-gateway", timestamp: "2024-01-13T11:00:00Z", author: "james.l" },
];

export const mockDashboardStats: DashboardStats = {
  totalRepositories: mockRepositories.length,
  totalDecisions: mockDecisions.length + 110,
  totalADRs: 44,
  totalFilesIndexed: 553,
  recentActivity: mockActivity,
};

// ─── Mock File Context (File Inspector — Day 3) ──────────────────────────────

export interface FileContextResponse {
  filePath: string;
  why: string;
  author: { handle: string; displayName: string; avatarUrl: string };
  decision: { id: string; title: string; summary: string } | null;
  constraints: Array<{ description: string; category?: string }>;
  alternatives: Array<{ name: string; reason: string }>;
  relatedFiles: string[];
}

export const mockFileContexts: FileContextResponse[] = [
  {
    filePath: "src/services/transaction.service.ts",
    why: "This service implements synchronous payment processing, a deliberate architectural choice made in January 2022. Kafka was evaluated for async payment events but rejected — at team size of 4 engineers, the operational burden outweighed the benefits. The payment UI requires synchronous confirmation anyway, making async an anti-pattern here. The synchronous path was revisited in March 2023 (team had grown to 9) and kept because throughput never reached the inflection point where the complexity tradeoff changed.",
    author: { handle: "sarah.k", displayName: "Sarah Kim", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
    decision: { id: "dec-1", title: "Keep payment processing synchronous — Kafka rejected", summary: "Evaluated Kafka for async payment events but rejected due to operational overhead at team size of 4." },
    constraints: [
      { description: "UI requires synchronous payment confirmation", category: "technical" },
      { description: "Team size < 6 engineers at time of decision", category: "operational" },
      { description: "No dedicated DevOps at the time", category: "operational" },
    ],
    alternatives: [
      { name: "Apache Kafka", reason: "Ops overhead too high for team size of 4" },
      { name: "RabbitMQ", reason: "Same concerns, less ecosystem support" },
      { name: "AWS SQS", reason: "Lock-in risk, latency for sync response pattern" },
    ],
    relatedFiles: [
      "src/controllers/payment.controller.ts",
      "src/services/idempotency.service.ts",
      "src/middleware/idempotency.middleware.ts",
    ],
  },
  {
    filePath: "src/services/idempotency.service.ts",
    why: "This file exists because of a production incident on 2022-08-14 where 0.3% of transactions (847 users) were double-charged. Client retry storms with inconsistent idempotency keys were the root cause. Three earlier PRs in 2021 each tried different strategies; after the incident, this file locked the composite key approach (userId + amount + timestamp with 24h TTL). This implementation is referenced in ADR-7 and must not change without a migration plan — the risk of regression is high.",
    author: { handle: "mario.r", displayName: "Mario Rossi", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=mario" },
    decision: { id: "dec-2", title: "Idempotency key pattern locked after production incident", summary: "Idempotency implementation was locked to a composite key strategy after a production double-charge incident on 2022-08-14." },
    constraints: [
      { description: "Production incident: 0.3% double-charge rate on 2022-08-14", category: "incident" },
      { description: "Regulatory requirement: no duplicate charge ever", category: "regulatory" },
      { description: "24h TTL chosen to balance storage cost and retry window", category: "business" },
    ],
    alternatives: [
      { name: "UUID from client", reason: "Client retry storms with inconsistent keys" },
      { name: "Request body hash", reason: "Fails for identical retry with different metadata" },
    ],
    relatedFiles: [
      "src/services/transaction.service.ts",
      "src/middleware/idempotency.middleware.ts",
      "src/utils/hash.util.ts",
    ],
  },
  {
    filePath: "src/database/database.module.ts",
    why: "This module configures TypeORM with PostgreSQL, a choice made in March 2021 when the team was deciding the data layer for financial records. MongoDB was the team's default at the time, but financial data requires ACID transactions — particularly for multi-step payment flows where partial failure must be detectable and rollbackable. MongoDB's multi-document transactions were available at v4.4 but deemed immature. PostgreSQL's battle-tested WAL and MVCC gave the team confidence for data they couldn't afford to corrupt.",
    author: { handle: "sarah.k", displayName: "Sarah Kim", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
    decision: { id: "dec-3", title: "PostgreSQL over MongoDB for transaction records", summary: "Chose PostgreSQL for ACID guarantees on financial data rather than MongoDB's eventual consistency model." },
    constraints: [
      { description: "ACID compliance required for financial data", category: "regulatory" },
      { description: "Multi-step payment flows require rollback capability", category: "technical" },
      { description: "Team familiarity with TypeORM", category: "operational" },
    ],
    alternatives: [
      { name: "MongoDB", reason: "Multi-document transactions immature at v4.4, eventual consistency risk" },
      { name: "MySQL", reason: "Team unfamiliar, less JSON support" },
    ],
    relatedFiles: [
      "src/entities/transaction.entity.ts",
      "src/services/transaction.service.ts",
      "src/repositories/transaction.repository.ts",
    ],
  },
  {
    filePath: "src/auth/token.service.ts",
    why: "This service manages JWT access tokens (15 minutes) backed by Redis refresh tokens (revocable). Pure stateless JWT had a critical revocation gap: if an account was compromised, tokens remained valid until expiry. A Q2 2022 security audit flagged this. The hybrid approach — fast stateless access tokens for API validation, server-side Redis refresh tokens for instant revocation — was adopted to balance horizontal scaling (no sticky sessions) with security. The 15-minute TTL is the maximum permitted under the company security policy.",
    author: { handle: "priya.s", displayName: "Priya Singh", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya" },
    decision: { id: "dec-5", title: "JWT access tokens with Redis-backed refresh tokens", summary: "Short-lived JWTs (15min) with server-side Redis refresh tokens to enable instant revocation without session store overhead." },
    constraints: [
      { description: "Security audit Q2 2022 flagged revocation gap", category: "business" },
      { description: "Must support horizontal scaling (no sticky sessions)", category: "technical" },
      { description: "15-minute access token TTL is maximum per security policy", category: "regulatory" },
    ],
    alternatives: [
      { name: "Pure stateless JWT", reason: "No revocation capability, 24h window too long for security" },
      { name: "Session-only (Redis)", reason: "Loses horizontal scaling benefit" },
    ],
    relatedFiles: [
      "src/auth/refresh.strategy.ts",
      "src/auth/jwt.guard.ts",
      "src/auth/auth.controller.ts",
    ],
  },
  {
    filePath: "middleware/rate-limit.go",
    why: "This middleware centralizes rate limiting at the API gateway layer, a decision forced by a DDoS-like traffic spike in October 2021. Prior to this, each service implemented its own rate limiting, leading to wildly inconsistent limits (payment: 100 req/min, notification: 500 req/min). The spike hit notification service first and cascaded into payment failures. ADR-3 mandated gateway-level enforcement to prevent future cascade failures from uneven per-service limits.",
    author: { handle: "james.l", displayName: "James Lee", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=james" },
    decision: { id: "dec-4", title: "Rate limiting at gateway layer, not service layer", summary: "Centralized rate limiting in the API gateway rather than per-service to avoid inconsistent limits across the fleet." },
    constraints: [
      { description: "October 2021 cascade incident from uneven rate limits", category: "incident" },
      { description: "Must not add service-level complexity", category: "operational" },
    ],
    alternatives: [
      { name: "Per-service rate limiting", reason: "Inconsistent, cascade failure vector" },
      { name: "External Redis rate limiter", reason: "Deferred: would add another infra dependency" },
    ],
    relatedFiles: [
      "config/limits.yaml",
      "middleware/auth.go",
      "middleware/logging.go",
    ],
  },
  {
    filePath: "workers/notification_worker.py",
    why: "This Celery worker handles async notification fan-out (email, SMS, push). The choice of Celery + Redis over SQS or RabbitMQ was made in early 2022 when the notification pipeline was built. At the team's then-scale of ~10k notifications/day, Celery + Redis provided the best developer experience with lowest ops overhead. Crucially, Redis was already in the stack for caching — adopting Celery added zero new infrastructure. SQS was rejected for cloud lock-in risk; RabbitMQ for higher ops overhead.",
    author: { handle: "wei.z", displayName: "Wei Zhang", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=wei" },
    decision: { id: "dec-6", title: "Celery + Redis for async notification fan-out", summary: "Chose Celery with Redis broker over SQS for async notification fan-out to keep infra simple." },
    constraints: [
      { description: "Redis already in stack for caching", category: "technical" },
      { description: "Team is Python-first", category: "operational" },
    ],
    alternatives: [
      { name: "AWS SQS", reason: "Cloud lock-in, higher cost at low volume" },
      { name: "RabbitMQ", reason: "Ops overhead, team unfamiliar" },
    ],
    relatedFiles: [
      "config/celery.py",
      "workers/email_worker.py",
      "workers/sms_worker.py",
      "workers/push_worker.py",
    ],
  },
  {
    filePath: "deploy/envoy/envoy.yaml",
    why: "This Envoy sidecar configuration provides mTLS between services as an interim measure while full service mesh adoption (Istio/Linkerd) is deferred. In Q4 2023, the team evaluated Istio and Linkerd for service mesh adoption — both were rejected for operational complexity given current team size. A security requirement mandates all inter-service traffic be encrypted. Envoy sidecar mTLS was adopted as a pragmatic middle ground, documented in ADR-12. Full mesh is deferred to H2 2024.",
    author: { handle: "james.l", displayName: "James Lee", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=james" },
    decision: { id: "dec-7", title: "Service mesh deferred — mTLS via Envoy sidecar instead", summary: "Full service mesh adoption deferred to H2 2024. mTLS between services via Envoy sidecar as interim measure." },
    constraints: [
      { description: "Security requirement: all inter-service traffic must be encrypted", category: "regulatory" },
      { description: "Team lacks service mesh expertise", category: "operational" },
    ],
    alternatives: [
      { name: "Istio", reason: "Operational complexity too high for current team" },
      { name: "Linkerd", reason: "Less mature ecosystem, limited support" },
    ],
    relatedFiles: [
      "config/tls/root-ca.crt",
      "deploy/envoy/clusters.yaml",
      "deploy/kubernetes/sidecar-injector.yaml",
    ],
  },
];

// ─── Legacy helpers (used by pages not yet migrated to lib/api.ts) ────────────
/** @deprecated Use getDecisions() from lib/api.ts */
export function getDecisionsByRepo(repositoryId: string): Decision[] {
  return mockDecisions.filter((d) => d.repositoryId === repositoryId);
}

/** @deprecated Use getRepository() from lib/api.ts */
export function getRepositoryById(id: string): Repository | undefined {
  return mockRepositories.find((r) => r.id === id);
}
