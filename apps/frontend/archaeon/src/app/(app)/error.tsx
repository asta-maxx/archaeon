"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js error boundary page — shown when a route segment throws.
 * This covers API failures that bubble up through Server Components.
 */
export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error("[Archaeon] Page error:", error);
  }, [error]);

  const isNetworkError =
    error.message.toLowerCase().includes("fetch") ||
    error.message.toLowerCase().includes("network") ||
    error.message.toLowerCase().includes("econnrefused");

  const isAuthError =
    error.message.includes("401") || error.message.includes("403");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="text-lg font-semibold">
          {isAuthError
            ? "Session expired"
            : isNetworkError
            ? "Backend unreachable"
            : "Something went wrong"}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isAuthError
            ? "Your session has expired. Please sign in again to continue."
            : isNetworkError
            ? "Could not connect to the Archaeon backend. If you're running a demo, switch to Demo Mode using the toolbar in the bottom-right corner."
            : "An unexpected error occurred. Try refreshing the page or switching to Demo Mode."}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={reset} variant="outline" className="gap-2 text-sm">
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
        {isAuthError && (
          <Button asChild size="sm" className="text-sm">
            <a href="/sign-in">Sign in</a>
          </Button>
        )}
      </div>

      {error.digest && (
        <p className="text-[10px] font-mono text-muted-foreground/40">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
