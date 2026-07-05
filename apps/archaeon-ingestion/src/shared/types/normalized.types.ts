export interface NormalizedCommit {
  sha: string;
  author: string;
  date: string; // ISO 8601 string
  message: string;
  filesChanged: string[];
}

export interface NormalizedPullRequest {
  number: number;
  title: string;
  body: string;
  author: string;
  state: 'open' | 'closed' | 'all';
  mergedAt: string | null; // ISO 8601 string or null
  filesChanged: string[];
  linkedCommits: string[];
}

export interface NormalizedFile {
  path: string;
  language: string;
  content?: string;
  sizeBytes: number;
}

export interface NormalizedAdrCandidate {
  sourceType: 'commit' | 'pr' | 'file';
  sourceRef: string; // SHA, PR number, or file path
  rawText: string;
  context: string;
}

// Data output from Phase 2
export interface RawRepositoryData {
  jobId: string;
  workspacePath?: string;
  branches: any[];
  commits: any[];
  pullRequests: any[];
  fileManifest: any[];
}

export interface NormalizedRepositoryData {
  jobId: string;
  commits: NormalizedCommit[];
  pullRequests: NormalizedPullRequest[];
  files: NormalizedFile[];
  adrCandidates: NormalizedAdrCandidate[];
}
