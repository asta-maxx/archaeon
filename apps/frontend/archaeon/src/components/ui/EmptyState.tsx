import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}

export function EmptyState({ icon: Icon, title, description, badge }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-16 text-center space-y-4 bg-card/30">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      {badge && (
        <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          {badge}
        </span>
      )}
    </div>
  );
}
