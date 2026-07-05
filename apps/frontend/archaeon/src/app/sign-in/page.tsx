"use client";

import { useState } from "react";
import { GitBranch, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGitHubLoginUrl, isDemoMode } from "@/lib/api";
import { useRouter } from "next/navigation";

// Title set via layout metadata — cannot use metadata export in client components

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleGitHubLogin() {
    setLoading(true);
    setError(null);

    // Demo Mode — skip OAuth, go straight to dashboard
    if (isDemoMode() || !process.env.NEXT_PUBLIC_API_URL) {
      router.push("/dashboard");
      return;
    }

    try {
      const url = await getGitHubLoginUrl();
      if (url) {
        window.location.href = url; // redirect to GitHub OAuth
      } else {
        // Fallback: no URL returned — go to demo
        router.push("/dashboard");
      }
    } catch {
      setError("Could not connect to backend. Entering demo mode.");
      setTimeout(() => router.push("/dashboard"), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background */}
      <div className="grid-bg absolute inset-0 opacity-20" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <div className="absolute h-3 w-3 rounded-full bg-primary" />
            <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary/50" />
            <div className="absolute bottom-1 left-1 h-2 w-2 rounded-full bg-primary/30" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Archaeon</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Institutional Memory Layer</p>
          </div>
        </div>

        {/* Card */}
        <div className="gradient-border rounded-2xl bg-card p-6 space-y-6">
          <div className="space-y-1.5 text-center">
            <h2 className="text-base font-semibold">Sign in to your workspace</h2>
            <p className="text-xs text-muted-foreground">
              Connect your GitHub account to start indexing repositories.
            </p>
          </div>

          {error && (
            <p className="text-xs text-destructive text-center bg-destructive/10 rounded-lg p-2">
              {error}
            </p>
          )}

          <Button
            id="github-login-btn"
            className="w-full gap-2.5 h-10 text-sm relative"
            onClick={handleGitHubLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitBranch className="h-4 w-4" />
            )}
            {loading ? "Redirecting to GitHub…" : "Continue with GitHub"}
            {!loading && <ArrowRight className="h-3.5 w-3.5 ml-auto" />}
          </Button>
        </div>

        {/* Terms */}
        <p className="text-center text-[11px] text-muted-foreground">
          By signing in, you agree to our{" "}
          <span className="underline cursor-pointer hover:text-foreground transition-colors">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="underline cursor-pointer hover:text-foreground transition-colors">
            Privacy Policy
          </span>
          .
        </p>
      </div>
    </div>
  );
}
