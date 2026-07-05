"use client";

import { useState, useEffect } from "react";
import { isDemoMode, enableDemoMode, disableDemoMode } from "@/lib/api";
import { FlaskConical, Wifi, WifiOff, X } from "lucide-react";

/**
 * DemoModeBanner — Dev-only toolbar for toggling Demo Mode at runtime.
 *
 * Only rendered in development (process.env.NODE_ENV === "development") OR
 * when NEXT_PUBLIC_DEMO_MODE=true is set.
 *
 * During a live demo:
 *   1. Keep this visible so you can fall back instantly if Django goes down.
 *   2. Click "Enable Demo Mode" → all API calls return known-good mock data.
 *   3. Click "Disable Demo Mode" to restore real API calls.
 *
 * This component is intentionally NOT in the main UI navigation — it's a
 * floating dev tool only.
 */
export function DemoModeBanner() {
  const [demo, setDemo] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    // Only show in development or when env demo mode is on
    const dev = process.env.NODE_ENV === "development";
    const envDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    setIsDev(dev || envDemo);
    setDemo(isDemoMode());
    setVisible(dev || envDemo);
  }, []);

  if (!isDev || !visible) return null;

  function toggle() {
    if (demo) {
      disableDemoMode();
      setDemo(false);
    } else {
      enableDemoMode();
      setDemo(true);
    }
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-md transition-all duration-300 ${
        demo
          ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
          : "border-border/60 bg-card/90 text-muted-foreground"
      }`}
    >
      <FlaskConical className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="hidden sm:inline">
        {demo ? "Demo Mode ON" : "Demo Mode OFF"}
      </span>

      <button
        onClick={toggle}
        id="demo-mode-toggle"
        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
          demo
            ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
            : "bg-primary/10 text-primary hover:bg-primary/20"
        }`}
        title={demo ? "Switch to real API calls" : "Switch to mock data (safe for demo)"}
      >
        {demo ? (
          <>
            <WifiOff className="h-3 w-3" />
            Using mock
          </>
        ) : (
          <>
            <Wifi className="h-3 w-3" />
            Using API
          </>
        )}
      </button>

      <button
        onClick={() => setVisible(false)}
        className="ml-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        title="Hide demo banner (won't disable demo mode)"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
