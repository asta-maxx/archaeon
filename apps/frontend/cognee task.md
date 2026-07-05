## **Member Wise plan** 

I would structure the team so that **everyone builds an independent vertical** , 

minimizing merge conflicts and making it possible to demo even if one area slips. 

## **Member 1 — Frontend & User Experience👨‍💻** 

## **Mission** 

Build everything the judges see. 

This member owns the entire product experience. 

## **Day 1** 

## **Project Setup** 

- Initialize Next.js 

- Configure Tailwind 

- Configure shadcn/ui 

- Setup routing 

- Create layout 

- Authentication UI 

- Sidebar 

- Navbar 

## **Pages** 

- Landing Page 

- Dashboard 

- Repository List 

- Repository Details 

## **Components** 

- Button library 

- Cards 

- Repository cards 

- Loading states 

- Empty states 

## **Deliverables** 

Frontend skeleton 

Dashboard 

Repository page 

## **Day 2** 

## **Repository Dashboard** 

Display 

- Repository name 

- Branch 

- Last indexed 

- Number of decisions 

- Files indexed 

- PR count 

## **Decision Explorer** 

List of 

- Decisions 

- Constraints 

- Authors 

- Alternatives 

Searchable 

Filterable 

## **Timeline** 

Architecture evolution 2022 ↓ ADR Added ↓ 2023 ↓ Kafka Rejected ↓ 2024 

↓ Redis Introduced 

## **Deliverables** 

Working Dashboard 

Decision Timeline 

Decision Explorer 

## **Day 3** 

## **Graph Visualization** 

Use React Flow 

Nodes 

Decision 

Module 

Constraint 

Developer 

Incident 

ADR 

Edges 

Depends On 

Introduced By 

Supersedes 

## Related To 

Caused By 

## **File Inspector** 

When selecting a file 

Show 

Why this exists 

↓ 

Author 

↓ 

Decision 

↓ 

Constraints 

↓ 

Alternatives 

↓ 

Related files 

## **Demo Animations** 

- Smooth transitions 

- Graph animations 

- Timeline animations 

## **Deliverables** 

Beautiful interactive UI 

## **Day 4** 

## **Polish** 

Responsive 

Loading animations 

Error handling 

Dark theme 

Screenshots 

Demo Mode 

## **Help Member 2** 

Integrate APIs 

## **Help Member 3** 

Integrate AI responses 

## **Final Deliverables** 

- ✅ Landing Page 

- ✅ Dashboard 

- ✅ Repository View 

- ✅ Decision Explorer 

- ✅ Timeline 

- ✅ Knowledge Graph 

- ✅ Demo Ready UI 

## **Member 2 — Cognee & Memory Engineer👨‍💻** 

## **Mission** 

Build the brain. 

This member owns all memory. 

## **Day 1** 

## **Infrastructure** 

Install 

- Cognee OSS 

- Neo4j 

- PostgreSQL 

Run 

Docker Compose 

Verify 

Everything communicates. 

## **Memory Schema** 

Design 

Decision 

Constraint 

Alternative 

Incident Developer Module Repository ADR PR Commit 

## **API** 

Create POST /memory GET /memory GET /decision GET /graph 

## **Deliverables** 

Infrastructure running 

## **Day 2** 

**remember()** Pipeline Decision Object 

↓ Store ↓ Graph Created 

↓ 

Neo4j Updated 

## **recall()** 

Input 

File 

↓ Module 

↓ 

Decision 

↓ 

Return 

Why 

Alternatives 

Constraints 

## **improve()** 

Update Existing decisions 

No duplication 

## **forget()** 

Mark Superseded Maintain history 

## **Deliverables** 

Entire memory lifecycle works. 

## **Day 3** 

## **Graph Traversal** 

Queries 

Find all decisions 

affecting 

Payment Module 

Find constraints 

introduced by 

ADR-4 

Find 

superseded decisions 

## **APIs** 

Return graph 

Return timeline 

Return decision history 

## **Deliverables** 

Knowledge Graph API 

## **Day 4** 

Optimization 

Caching Graph cleanup 

Testing 

Performance 

Integration 

## **Final Deliverables** 

- ✅ Cognee running 

- ✅ Neo4j running 

- ✅ Memory APIs 

- ✅ Graph Queries 

- ✅ Timeline APIs 

## **Member 3 — AI + GitHub Integration👨‍💻** 

## **Mission** 

Convert Git history into memory. 

## **Day 1** 

GitHub OAuth 

Repository selection 

Clone repository 

## Read 

- Commits 

- PRs 

- ADRs 

## **Build parser** 

Collect 

Commit 

↓ 

Files 

↓ 

Author 

↓ 

Timestamp 

↓ 

Message 

## **Deliverables** 

Repository successfully imported. 

## **Day 2** 

## **AI Extraction** 

Prompt GPT 

Extract 

Decision 

Reason 

Constraint 

Alternative 

Confidence 

Affected files 

Affected modules 

## **Store** 

Pass 

Decision Object 

to 

remember() 

## **Confidence Scoring** 

Only 

High confidence 

becomes memory. 

## **Deliverables** 

AI extraction working. 

## **Day 3** 

## **Webhooks** 

New PR 

↓ 

## Extract 

↓ 

remember() 

New ADR 

↓ 

Update 

↓ 

improve() 

## Superseded ADR 

↓ 

forget() 

## **VSCode Extension** 

When 

Developer opens file 

↓ 

Call recall() 

↓ 

Sidebar 

Shows 

Why 

Who 

When 

Alternatives 

Constraints 

## **Deliverables** 

VSCode sidebar works. 

## **Day 4** 

Prompt optimization 

Reduce hallucinations 

Improve extraction 

Integration 

Testing 

Deployment 

## **Final Deliverables** 

- ✅ GitHub Integration 

- ✅ AI Decision Extraction 

- ✅ VSCode Extension 

- ✅ Webhooks 

## **Shared Integration Schedule** 

## **End of Day 1** 

All members should have working APIs and be able to exchange sample data. 

## **Checkpoint:** 

- Frontend displays mock repository data. 

- Memory service accepts and stores a sample decision. 

- GitHub ingestion can fetch commits and PRs. 

## **End of Day 2** 

End-to-end ingestion should work. 

## **Checkpoint:** 

GitHub Repository 

↓ 

AI extracts decisions 

↓ 

Cognee stores memory 

↓ 

Frontend displays decisions 

## **End of Day 3** 

The complete demo flow should be functional. 

## **Checkpoint:** 

Open Repository 

↓ 

View Decision Graph 

↓ 

Select File 

↓ 

See "Why this exists" 

↓ 

Open PR 

↓ 

Architecture-aware suggestions 

**Day 4** 

No new features. 

Focus exclusively on: 

- Bug fixes 

- UI polish 

- Demo script 

- Deployment 

- Backup demo data 

- Pitch practice 

## **Ownership Summary** 

**Member Owns Success Criteria Member** Product UI & Judges can clearly see and navigate the product with polished **1** Demo visuals. **Member** Cognee Architectural decisions are stored, updated, queried, and **2** Memory Layer related through a living knowledge graph. **Member** GitHub + AI A repository is automatically transformed into structured **3** Pipeline architectural memory and surfaced in the VS Code extension. 

## **One adjustment I'd make** 

To maximize your chances in a 4-day hackathon, **do not build a fully automated VS Code extension until the core web application is complete** . Instead: 

1. Finish the web dashboard with repository import, memory graph, timeline, and file explanation. 

2. If time permits on Day 3, build a **minimal VS Code extension** that simply sends the current file path to your backend and displays the retrieved "Why this exists" information. 

That keeps the extension as a compelling demo enhancement rather than a critical dependency, reducing the risk of spending disproportionate time on extension-specific APIs. 

