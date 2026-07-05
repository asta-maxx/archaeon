import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

/**
 * FONT: Currently using Geist as a build-safe placeholder.
 *
 * To switch to Kelvetica Nobis (Erion Dyrmishi):
 *   1. Download from https://www.fontspace.com/kelvetica-nobis-font-f19686
 *   2. Drop the file at: src/app/fonts/KelveticaNobis.woff2 (or .otf / .ttf)
 *   3. Replace the Geist import + declaration below with:
 *
 *        import localFont from "next/font/local";
 *        const font = localFont({
 *          src: "./fonts/KelveticaNobis.woff2",   // update extension if needed
 *          variable: "--font-kelvetica",
 *          fallback: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
 *          display: "swap",
 *          preload: false,
 *        });
 *
 *   4. Change `font.variable` in the <body> className below — nothing else.
 *
 * ⚠️  LICENSE: Verify on FontSpace whether this is personal-use-only or
 *   free-for-commercial BEFORE using beyond the hackathon demo.
 */
const font = Geist({
  variable: "--font-kelvetica", // same CSS var — swap to localFont is seamless
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Archaeon — Institutional Memory for Architecture",
  description:
    "Capture why every architectural decision was made. Grounded in real git history, PRs, and ADRs. Powered by Cognee knowledge graphs.",
  keywords: ["architecture", "knowledge graph", "ADR", "decision", "institutional memory", "cognee"],
  openGraph: {
    title: "Archaeon",
    description: "Know not just what your code does — but why every decision was made.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // No hardcoded "dark" class — ThemeProvider sets it from OS preference
    <html lang="en" suppressHydrationWarning>
      <body className={`${font.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
