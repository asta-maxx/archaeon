"use client";

import { useEffect } from "react";

/**
 * ThemeProvider — OS-driven theming, no manual toggle.
 *
 * Reads `prefers-color-scheme` once on mount and adds/removes the `.dark`
 * class on `<html>`. Also registers a `change` listener so the UI updates
 * immediately if the user flips their OS theme while the app is open.
 *
 * Tailwind's `@custom-variant dark (&:is(.dark *))` declaration means all
 * `dark:` utilities respond to the presence of `.dark` on any ancestor,
 * so we only need to manage the root element.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme(dark: boolean) {
      const html = document.documentElement;
      if (dark) {
        html.classList.add("dark");
        html.style.colorScheme = "dark";
      } else {
        html.classList.remove("dark");
        html.style.colorScheme = "light";
      }
    }

    // Apply immediately on mount
    applyTheme(mq.matches);

    // Listen for live OS changes
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return <>{children}</>;
}
