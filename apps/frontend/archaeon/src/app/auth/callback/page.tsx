"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { githubCallback } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state") ?? undefined;
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`GitHub denied access: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received from GitHub.");
      return;
    }

    githubCallback(code, state).then(({ success }) => {
      if (success) {
        setStatus("success");
        setMessage("Sign-in successful! Redirecting…");
        setTimeout(() => router.push("/dashboard"), 800);
      } else {
        setStatus("error");
        setMessage("Authentication failed. Please try again.");
      }
    });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        {status === "loading" && (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        )}
        {status === "success" && (
          <CheckCircle className="h-8 w-8 text-green-500" />
        )}
        {status === "error" && (
          <XCircle className="h-8 w-8 text-destructive" />
        )}

        <p className="text-sm text-muted-foreground">{message}</p>

        {status === "error" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/sign-in")}
            className="mt-2"
          >
            Back to Sign In
          </Button>
        )}
      </div>
    </div>
  );
}
