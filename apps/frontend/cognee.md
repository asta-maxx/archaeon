## Archaeon 

The institutional memory layer for software architecture — know not just what your caode does, but why every decision was made, by whom, under what constraints, and how it evolved. 

Why this must exist 

Engineers inherit codebases with zero decision context. They re-examine choices already made, break invariants they didn't know existed, and repeat the same architectural debates because the reasoning that produced the current structure was never persisted anywhere. This isn't a documentation problem — documentation captures what. The unsolved problem is persisting why, including the alternatives considered and rejected. The cost of this is enormous: onboarding engineers spend months re-inferring context that should be retrievable in seconds. When a senior engineer leaves, their mental model of the system walks out with them. This hasn't been solved because traditional tooling (wikis, comments, PRs) is brittle, disconnected, and dies the moment it becomes stale. 

## Why Cognee is essential — not optional 

Cognee's graph layer is the critical differentiator. A vector search system lets you retrieve "similar decisions." But architectural reasoning requires traversable relationships: this file depends on this service because of this constraint introduced at this time by this team when this third-party API had this limitation. That's a graph, not a flat embedding. remember() is used continuously as PRs merge and ADRs are written. recall() powers real-time context injection when a developer touches a related module. improve() refines the decision graph as the system evolves. forget() removes decisions that have been explicitly superseded. Without all four primitives, this degrades to RAG search — which already exists and fails. 

MVP scope — 7 days 

A CLI + GitHub Action that: (1) ingests git history, PR descriptions, and a repo's existing ADRs into Cognee on first run; (2) builds a decision graph per module; (3) exposes a VS Code sidebar that shows "why this file looks this way" when a developer opens it; (4) surfaces related past decisions when a PR is opened. No LLM-generated hallucinated rationale — everything grounded in what was actually written and merged. Demo repo: a real open-source project (e.g., a well-known Node.js service) with 3+ years of history. 

Long-term roadmap 

Year 1: team adoption at 20–50 eng orgs, integration with Linear/Jira for decision tagging. Year 2: cross-codebase decision pattern library ("how did companies like yours solve X?"). Year 3: active guardrail — Archaeon blocks PRs that contradict known architectural constraints without an explicit override and rationale. Year 5: the industry-wide knowledge graph of engineering decisions, licensed to AI coding tools as a grounding layer. Category: architectural intelligence. 

## 60-second demo script 

Open a real repo — say, a popular OSS payment service. Open a file: transaction.service.ts. The sidebar shows: "This service is synchronous (not eventdriven) because in Jan 2022 the team evaluated Kafka but rejected it due to ops overhead at their then-team size of 4. The constraint was explicitly revisited in March 2023 and kept." A new engineer on stage says: "I was about to switch this to async queues — I had no idea." Now open a PR that touches the idempotency layer. Archaeon surfaces: "3 PRs in 2021 tried different approaches here; this invariant was locked after a production incident on [date]." Judge says: "That would've saved us 2 months last year." 

## Differentiation 

ChatGPT/Claude generate rationale but hallucinate it — no grounding in your actual history. Cursor helps write code but has no institutional memory across time. GitHub Copilot autocompletes; it has no concept of a decision that was made. Swimm/Confluence documents things but doesn't connect decisions into traversable reasoning chains. Archaeon is the first tool that treats architectural reasoning as a firstclass persistent data structure. 

## Risks 

## Technical 

Git history is noisy; extracting genuine decisions vs. routine commits requires careful prompt design 

## Product 

Developers may resist any tool that slows their commit flow; zero-friction logging is critical 

Adoption 

Value compounds over time — hard to show ROI in week 1; need a retroactive ingestion mode 

Competitive 

GitHub could add this natively; moat is the graph schema and cross-org pattern layer Killer question: what if OpenAI ships infinite context? 

Infinite context would let a model read your entire git history in one prompt — but it cannot traverse relationships, detect contradictions, or maintain a living graph that updates as new decisions land. Archaeon's value is not retrieval; it's the structured reasoning graph that enables active guardrails and cross-repo pattern detection. Infinite context makes a better reader. Archaeon makes a better institutional memory. These are different things. Verdict: still matters. 

- ✓ Impossible without memory 

- ✓ 15-sec value clarity 

- ✓ Clear wow moment 

- ✓ Expensive real problem 

- ✓ Platform potential 

- ✓ Cognee indispensable 

- ✓ 7-day MVP feasible 

- ✓ Survives infinite context 

