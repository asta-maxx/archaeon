"use client";

import { useEffect, useState } from "react";
import { Bell, Search, Plus, GitBranch, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser, logout } from "@/lib/api";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types/decision";

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => {});
  }, []);

  async function handleSignOut() {
    await logout();
    router.push("/sign-in");
  }

  const displayName = user?.name ?? "User";
  const avatarUrl = user?.avatarUrl ?? "";
  const email = user?.email ?? "";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-4 sm:px-6 gap-3">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="flex md:hidden items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-shrink-0"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 flex-1 max-w-xs sm:max-w-sm md:w-72 md:flex-none cursor-pointer hover:border-primary/30 transition-colors group">
        <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
        <span className="text-sm text-muted-foreground truncate">Search decisions, files, ADRs...</span>
        <kbd className="ml-auto text-[10px] text-muted-foreground/60 border border-border/60 rounded px-1 py-0.5 hidden sm:inline">
          ⌘K
        </kbd>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-border/60 hover:border-primary/40 hover:text-primary transition-colors hidden sm:flex"
        >
          <Plus className="h-3.5 w-3.5" />
          Import Repo
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="flex sm:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-1.5 sm:px-2 py-1.5 hover:bg-accent transition-colors">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-medium leading-none">{displayName}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {user?.plan ?? "free"} plan
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
              <GitBranch className="h-3.5 w-3.5" />
              GitHub Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id="sign-out-btn"
              className="gap-2 text-sm cursor-pointer text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
