import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  delta?: string;
  deltaPositive?: boolean;
}

export function StatCard({ label, value, icon: Icon, delta, deltaPositive }: StatCardProps) {
  return (
    <div className="gradient-border rounded-xl bg-card p-4 space-y-3 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <div className="space-y-0.5">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {delta && (
          <div
            className={cn(
              "text-[11px] font-medium",
              deltaPositive ? "text-green-400" : "text-muted-foreground"
            )}
          >
            {deltaPositive ? "↑ " : ""}{delta}
          </div>
        )}
      </div>
    </div>
  );
}
