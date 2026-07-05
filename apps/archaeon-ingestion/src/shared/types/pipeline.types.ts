import { ArchitectureDecision } from './architecture-decision';
import { JobScope } from './webhook.types';

export interface JobContext {
  jobId: string;
  repository: {
    owner: string;
    name: string;
    ref: string;
    installationId: number;
  };
  scope?: JobScope;
}

export interface PipelineMetrics {
  durationMs: number;
  tokensUsed: number;
  retries: number;
  decisionsExtracted: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface PipelineLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface PipelineResult {
  status: 'success' | 'partial' | 'failed';
  decisions: ArchitectureDecision[];
  metrics: PipelineMetrics;
  logs: PipelineLog[];
  errorDetails?: {
    message: string;
    retryable: boolean;
  };
}
