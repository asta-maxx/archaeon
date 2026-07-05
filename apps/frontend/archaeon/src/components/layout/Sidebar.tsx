"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Brain,
  Network,
  Clock,
  Settings,
  Zap,
  ChevronRight,
  FileCode2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/repositories", label: "Repositories", icon: GitBranch },
  { href: "/decisions", label: "Decision Explorer", icon: Brain },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/graph", label: "Decision Graph", icon: Network },
  { href: "/files", label: "File Inspector", icon: FileCode2, badge: "New" },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  /** Callback for mobile close button (when rendered in a drawer) */
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`flex h-full w-60 flex-col border-r border-border/50 bg-sidebar${onClose ? "" : " fixed inset-y-0 left-0 z-50"}`}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-5">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
          {/* Node icon — graph visual language */}
          <div className="absolute h-2 w-2 rounded-full bg-primary" />
          <div className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary/60" />
          <div className="absolute bottom-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-primary/40" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Archaeon
          </span>
          <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
            Memory Layer
          </div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3 pt-4 overflow-y-auto">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Navigation
        </div>
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose} // close mobile drawer on nav
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="rounded text-[9px] font-semibold px-1.5 py-0.5 bg-muted text-muted-foreground">
                  {badge}
                </span>
              )}
              {active && <ChevronRight className="h-3 w-3 text-primary opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Cognee indicator */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center gap-2.5 rounded-lg bg-primary/5 px-3 py-2.5 border border-primary/10">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 flex-shrink-0">
            <Zap className="h-3 w-3 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-primary">Cognee</div>
            <div className="text-[10px] text-muted-foreground leading-none truncate">
              Memory engine active
            </div>
          </div>
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse ml-auto flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}
