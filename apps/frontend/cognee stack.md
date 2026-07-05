## **Cognee Hackathon** 

## **1. Tech Stack** 

|**1. Tech Stack**|||
|---|---|---|
|**Layer**|**Tech**|**Why**|
|Frontend|Next.js 15 + React +|Fastest production-ready UI, SEO not|
||TypeScript|important but React ecosystem is huge|
|UI|TailwindCSS + shadcn/ui|Beautiful UI with almost no custom CSS|
|Graph<br>Visualization|React Flow|Perfect for displaying decision graphs|
|Charts|Recharts|Timeline & analytics|
|Backend API|NestJS|Your team already knows it, enterprise|
|||architecture|
|AI Worker|Python|Cognee is Python-frst, avoids unnecessary<br>friction|
|Memory Layer|**Cognee Open Source**|Biggest diferentiator of the project|
|Graph DB|Neo4j|Natural representation of architectural<br>relationships|
|Metadata DB|PostgreSQL|Users, projects, indexing status|
|Queue|Redis + BullMQ<br>_(optional)_|Background repository indexing|
|Git Integration|GitHub API + Webhooks|Continuous memory updates|
|AI Model|GPT-5.5 / GPT-4.1|Decision extraction|
|VSCode|||
|Extension|TypeScript|Killer demo feature|
||Docker +||
|Deployment|Railway/Render + Vercel|Simple hackathon deployment|



## **2. 3 Member Split** 

## **Member 1 — Frontend & Demo Experience👨‍💻 Responsibilities** 

- Landing page 

- Dashboard 

- Repository page 

- Architecture Timeline 

- Decision Graph UI 

- Graph visualization 

- Project Settings 

- Demo polish 

- Pitch animations 

## **Deliverables** 

- Beautiful UI 

- Interactive graph 

- Timeline 

- Demo ready 

## **Member 2 — Memory & Cognee Engineer👨‍💻** 

## **Responsibilities** 

- Cognee setup 

- Neo4j 

- Memory schema 

- remember() 

- recall() 

- improve() 

- forget() 

- Graph traversal 

- Memory API 

## **Deliverables** 

- Entire memory system 

- Graph storage 

- Memory retrieval 

- Connected knowledge graph 

## **Member 3 — AI & GitHub Pipeline👨‍💻** 

## **Responsibilities** 

- GitHub OAuth 

- GitHub API 

- Commit parser 

- PR parser 

- ADR parser 

- Decision extraction 

- Prompt engineering 

- Webhooks 

## **Deliverables** 

- Repository ingestion 

- AI extraction 

- Automatic updates 

## **3. Overall MVP Plan (4 Days)** 

## **Day 1 — Foundation** 

✅ Next.js 

- ✅ NestJS 

- ✅ Cognee 

✅ Neo4j 

✅ PostgreSQL 

✅ GitHub Authentication 

## ✅ Import Repository 

Goal 

User imports repository 

## **Day 2 — Memory Engine** 

Repository 

## ↓ 

Read commits 

↓ 

Read PRs 

## ↓ 

Read ADRs 

↓ 

Extract Decisions 

↓ 

remember() 

## ↓ 

Store into Cognee 

## ↓ 

Build Graph 

Goal 

Memory Graph Created 

## **Day 3 — User Experience** 

Developer opens file 

↓ 

recall() 

↓ 

Relevant decisions appear 

↓ 

Graph visualization 

↓ 

Timeline 

↓ 

VSCode Sidebar 

↓ 

PR Assistant 

Goal 

WOW Moment 

## **Day 4 — Polish** 

Animations 

Bug fixes 

Deployment 

Demo 

Pitch 

Landing page 

Performance 

Goal 

Hackathon Ready 

## **4. Architecture** 

GitHub Repository 

(Commits • PRs • ADRs) 

│ 

▼ 

Repository Ingestion Service 

│ 

▼ 

AI Decision Extraction Worker 

│ 

Converts Engineering History Into 

│ 

▼ 

Decision Objects 

- Why 

- Alternatives 

- Constraints 

- Authors 

- Modules 

- Files 

- Time 

│ 

- 

Cognee Memory Layer 

remember() 

improve() forget() 

▼ 

Knowledge Graph (Neo4j) 

Decision ↔ File ↔ Module ↔ Author 

Constraint ↔ Incident ↔ ADR 

┴ ┌────────────── ─────────────┐ ▼ ▼ 

Next.js Dashboard          VSCode Extension 

▼ ▼ 

Graph + Timeline          "Why this exists" 

▼ ▼ 

PR Assistant 

## **5. Best Usage of Cognee** 

This is the most important part of your project. 

Don't use Cognee as "just another database." 

Use every memory primitive. 

## **remember()** 

Whenever 

- New PR merged 

- New ADR 

- New Decision 

- New Architecture discussion 

## Store 

Decision 

↓ 

## Reason 

↓ 

## Constraint 

↓ 

## Alternative 

↓ 

Module 

↓ 

Files 

↓ 

Author 

↓ 

Timestamp 

## **recall()** 

Whenever developer 

- Opens file 

- Opens PR 

- Searches 

Retrieve 

Why this exists 

↓ 

Past discussions 

↓ 

Rejected alternatives 

↓ 

Constraints 

↓ 

Related incidents 

## **improve()** 

Whenever 

New information arrives 

Example 

Decision 

↓ 

Constraint changed 

↓ 

Architecture updated 

↓ 

Memory evolves 

No duplicate memories. 

Memory becomes smarter. 

## **forget()** 

Never actually delete. 

Instead 

Decision 

↓ 

Superseded 

↓ 

Archive 

↓ 

Link 

↓ 

New Decision 

History remains intact. 

## **Why Cognee becomes indispensable** 

Without Cognee 

Repository 

↓ 

Embedding 

↓ 

Similarity Search 

That's RAG. 

With Cognee 

Decision 

↓ 

Constraint 

↓ 

Alternative 

↓ 

Module 

↓ 

## Incident 

↓ 

Developer 

↓ 

Timeline 

↓ 

Architecture 

This is an evolving knowledge graph. 

That's exactly what Cognee is built for. 

## **6. Chances of Winning** 

**Originality** ⭐⭐⭐⭐⭐ **(9.5/10)** 

Very high. 

Most hackathon projects are 

- AI coding assistant 

- Chatbot 

- Agent 

- RAG 

This is an entirely different category. 

**Technical Depth** ⭐⭐⭐⭐⭐ **(10/10)** 

## Judges love 

- Knowledge Graph 

- Memory 

- AI 

- GitHub 

- VSCode 

It demonstrates real engineering. 

## **Cognee Usage** ⭐⭐⭐⭐⭐ **(10/10)** 

This is probably the strongest part. 

You're not forcing Cognee. 

The entire product depends on it. 

Judges usually ask 

"Could this exist without Cognee?" 

For Archaeon the answer is 

## **No.** 

Without persistent graph memory, 

there is no product. 

## **Demo** ⭐⭐⭐⭐⭐ **(10/10)** 

Imagine this sequence 

Import repository 

↓ 

Graph builds 

↓ 

Open PaymentService.ts 

↓ 

Sidebar appears 

"This is synchronous because..." 

↓ 

Open PR 

↓ 

Warning 

"This decision conflicts with ADR-14" 

↓ 

Judge 

"Whoa." 

That is a memorable demo. 

**Business Potential** ⭐⭐⭐⭐⭐ **(9/10)** 

Every software company 

- loses knowledge 

- loses senior engineers 

- repeats mistakes 

This solves a genuine, expensive problem. 

## **Technical Risk** ⭐⭐⭐☆☆ **(7.5/10)** 

The biggest challenge is **AI extraction quality** , not the graph. 

**Recommendation:** don't try to extract every decision from every commit. Focus on: 

- ADRs 

- PR descriptions 

- Merge commits 

- High-confidence architectural discussions 

This will make the demo much more reliable. 

|**Overall Evaluation**||
|---|---|
|**Category**|**Score**|
|Idea|**10/10**|
|Innovation|**9.8/10**|
|Cognee Usage|**10/10**|
|Technical Architecture|**9.5/10**|
|MVP Feasibility (4 Days)|**9/10**|
|Demo Potential|**10/10**|
|Judge Appeal|**9.8/10**|
|Winning Probability_(assuming solid execution and presentation)_ **9–9.5/10**||
|**One fnal recommendation**||



**Keep the MVP laser-focused.** Build **one complete, polished workflow** instead of many partial features: 

**Import Repository → Build Memory Graph → Open File → Instantly See "Why This Exists" → Open PR → Receive Architecture-Aware Suggestions** 

If you nail that end-to-end experience with Cognee powering the memory graph, you'll demonstrate a compelling new category rather than just another AI developer tool. 

