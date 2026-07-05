import Link from "next/link";
import { ArrowRight, GitBranch, Brain, Network, Shield, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Archaeon — Institutional Memory for Software Architecture",
  description:
    "Know not just what your code does — but why every decision was made, by whom, under what constraints, and how it evolved.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 flex h-16 items-center justify-between px-6 border-b border-border/30 bg-background/70 backdrop-blur-lg">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <div className="absolute h-2 w-2 rounded-full bg-primary" />
            <div className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary/50" />
            <div className="absolute bottom-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-primary/30" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Archaeon</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild className="text-xs gap-1.5">
            <Link href="/dashboard">
              Open Dashboard
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16 text-center">
        {/* Grid background */}
        <div className="grid-bg absolute inset-0 opacity-30" />
        {/* Radial glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        </div>

        {/* Floating graph nodes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            { x: "8%", y: "25%", color: "bg-primary/60", size: "h-3 w-3", delay: "0s" },
            { x: "15%", y: "65%", color: "bg-green-500/50", size: "h-2 w-2", delay: "0.5s" },
            { x: "85%", y: "20%", color: "bg-orange-500/50", size: "h-2.5 w-2.5", delay: "1s" },
            { x: "90%", y: "60%", color: "bg-purple-500/50", size: "h-3 w-3", delay: "1.5s" },
            { x: "75%", y: "80%", color: "bg-primary/40", size: "h-2 w-2", delay: "0.3s" },
            { x: "25%", y: "85%", color: "bg-red-500/40", size: "h-2 w-2", delay: "0.8s" },
          ].map((node, i) => (
            <div
              key={i}
              className={`absolute rounded-full ${node.color} ${node.size} animate-pulse ring-1 ring-background/30`}
              style={{ left: node.x, top: node.y, animationDelay: node.delay }}
            />
          ))}
        </div>

        <div className="relative z-10 space-y-6 max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">Powered by Cognee Knowledge Graph</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.05]">
            <span className="text-gradient">Know not just </span>
            <br />
            <span className="text-foreground/90">what your code does</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Archaeon captures <strong className="text-foreground font-medium">why</strong> every architectural decision was made — grounded in real git history, PRs, and ADRs — stored in a traversable knowledge graph. Never lose the reasoning behind your architecture again.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="lg" asChild className="gap-2 text-sm px-6">
              <Link href="/dashboard">
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="gap-2 text-sm px-6 border-border/60">
              <Link href="/sign-in">
                <GitBranch className="h-4 w-4" />
                Connect GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative px-6 py-24">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">
              Architecture memory that{" "}
              <span className="text-gradient-brand">actually persists</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Not documentation. Not comments. A living, traversable graph that evolves with your codebase.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Brain,
                title: "Decision Extraction",
                description:
                  "AI analyzes git history, PR descriptions, and ADRs to extract architectural decisions with full context — who, what, why, and what alternatives were rejected.",
                color: "text-primary bg-primary/10",
              },
              {
                icon: Network,
                title: "Knowledge Graph",
                description:
                  "Decisions, constraints, incidents, and modules form a traversable graph. Find how a 2021 incident changed a 2023 architectural constraint in seconds.",
                color: "text-green-400 bg-green-400/10",
              },
              {
                icon: Shield,
                title: "PR Guardian",
                description:
                  "When a PR touches code governed by a known constraint, Archaeon surfaces the relevant history. 'This invariant was locked after a production incident on [date].'",
                color: "text-orange-400 bg-orange-400/10",
              },
              {
                icon: GitBranch,
                title: "Git-Grounded",
                description:
                  "No hallucinated rationale. Every decision is grounded in what was actually written and merged — real commits, real PR descriptions, real ADRs.",
                color: "text-blue-400 bg-blue-400/10",
              },
              {
                icon: Users,
                title: "Team Memory",
                description:
                  "Senior engineer leaving? Their mental model stays. Archaeon preserves the implicit knowledge that walks out the door with every departure.",
                color: "text-purple-400 bg-purple-400/10",
              },
              {
                icon: Zap,
                title: "Cognee Powered",
                description:
                  "Built on Cognee's remember/recall/improve/forget primitives. The graph evolves as new decisions land — no stale documentation.",
                color: "text-primary bg-primary/10",
              },
            ].map(({ icon: Icon, title, description, color }) => (
              <div
                key={title}
                className="gradient-border rounded-xl bg-card p-5 space-y-3 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo moment */}
      <section className="px-6 py-24 border-t border-border/30">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-border/50 bg-card overflow-hidden p-8 space-y-6">
            <div className="grid-bg absolute inset-0 opacity-20" />
            <div className="relative space-y-2 text-center">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground rounded-full border border-border/50 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Live demo moment
              </div>
              <h2 className="text-2xl font-bold">Open a file. Know why it exists.</h2>
            </div>

            <div className="relative grid gap-3 md:grid-cols-2">
              {/* File panel */}
              <div className="rounded-lg border border-border/50 bg-background/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono border-b border-border/30 pb-2">
                  <FileIcon />
                  <span>transaction.service.ts</span>
                </div>
                <div className="font-mono text-xs text-muted-foreground space-y-1">
                  <div><span className="text-blue-400">@Injectable</span>()</div>
                  <div><span className="text-blue-400">export class</span> <span className="text-foreground">TransactionService</span> {"{"}</div>
                  <div className="pl-4 text-green-400">// Synchronous — not event-driven</div>
                  <div className="pl-4"><span className="text-blue-400">async</span> <span className="text-foreground">processPayment</span>(...)</div>
                  <div>{"}"}</div>
                </div>
              </div>

              {/* Memory panel */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-primary border-b border-primary/20 pb-2">
                  <Brain className="h-3.5 w-3.5" />
                  Archaeon Memory
                </div>
                <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <p>
                    <strong className="text-foreground">This service is synchronous</strong> because in Jan 2022 the team evaluated Kafka but rejected it due to ops overhead at their then-team size of 4.
                  </p>
                  <p>
                    The constraint was explicitly revisited in <strong className="text-foreground">March 2023</strong> and kept.
                  </p>
                  <div className="pt-1 flex gap-2 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400">Kafka rejected</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">97% confidence</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">PR #142</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Built with</span>
          <Zap className="h-3 w-3 text-primary" />
          <span>Cognee · Neo4j · Next.js</span>
        </div>
      </footer>
    </div>
  );
}

function FileIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
