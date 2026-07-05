import { Settings } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "Settings — Archaeon",
};

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, integrations, and repository preferences.
        </p>
      </div>
      <EmptyState
        icon={Settings}
        title="Settings — Day 4"
        description="Account settings, GitHub token management, and notification preferences will be configured on Day 4."
        badge="Coming Day 4"
      />
    </div>
  );
}
