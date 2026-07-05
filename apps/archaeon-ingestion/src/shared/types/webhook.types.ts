export interface WebhookEventSummary {
  eventType: 'push' | 'pull_request';
  repository: {
    owner: string;
    name: string;
    ref: string;
  };
  changedPaths: string[];
  prNumber?: number;
}

export interface JobScope {
  paths?: string[]; // Narrow scope to specific files
  pullRequestNumber?: number; // Scope to a specific PR
  isFullRepo: boolean; // True if it fell back to a full repo scan
  since?: string; // Scope to commits after this date
}
